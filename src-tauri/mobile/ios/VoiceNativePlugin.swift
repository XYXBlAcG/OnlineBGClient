import AVFoundation
import Foundation
import LiveKit
import SwiftRs
import Tauri
import UIKit

struct ConnectArgs: Decodable {
  let url: String
  let token: String
  let muted: Bool
  let onEvent: Channel
}

struct MicrophoneArgs: Decodable {
  let enabled: Bool
}

struct DeafenArgs: Decodable {
  let enabled: Bool
}

struct VolumeArgs: Decodable {
  let participant: String
  let volume: Double
}

@objc(OnlineBGVoiceNativePlugin)
class VoiceNativePlugin: Plugin, RoomDelegate, @unchecked Sendable {
  private var room: Room?
  private var events: Channel?
  private var closing = false

  @objc func connect(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ConnectArgs.self)
    DispatchQueue.main.async {
      self.events = args.onEvent
      self.closing = false
      UIApplication.shared.isIdleTimerDisabled = true
      AudioManager.shared.isSpeakerOutputPreferred = true
      let room = Room(delegate: self)
      self.room = room
      Task {
        do {
          try await room.connect(url: args.url, token: args.token)
          if !args.muted {
            try await room.localParticipant.setMicrophone(enabled: true)
          }
          invoke.resolve()
        } catch {
          self.emit([
            "type": "phase",
            "phase": "error",
            "message": error.localizedDescription,
          ])
          invoke.reject(error.localizedDescription)
        }
      }
    }
  }

  @objc func disconnect(_ invoke: Invoke) {
    closing = true
    events = nil
    DispatchQueue.main.async {
      UIApplication.shared.isIdleTimerDisabled = false
    }
    let room = self.room
    self.room = nil
    Task {
      if let room {
        await room.disconnect()
      }
      invoke.resolve()
    }
  }

  @objc func setMicrophone(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(MicrophoneArgs.self)
    Task {
      do {
        guard let room else {
          invoke.resolve()
          return
        }
        if args.enabled {
          let granted = await requestMicrophonePermission()
          if !granted {
            throw NSError(
              domain: "voice-native",
              code: 1,
              userInfo: [NSLocalizedDescriptionKey: "麦克风权限未开启，请在系统设置中允许访问。"])
          }
        }
        try await room.localParticipant.setMicrophone(enabled: args.enabled)
        invoke.resolve()
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc func setDeafened(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(DeafenArgs.self)
    AudioManager.shared.mixer.outputVolume = args.enabled ? 0 : 1
    invoke.resolve()
  }

  @objc func setVolume(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(VolumeArgs.self)
    guard let room else {
      invoke.resolve()
      return
    }
    for participant in room.remoteParticipants.values
    where participant.identity?.stringValue == args.participant {
      for publication in participant.audioTracks {
        (publication.track as? RemoteAudioTrack)?.volume = args.volume
      }
    }
    invoke.resolve()
  }

  @objc func playback(_ invoke: Invoke) {
    invoke.resolve()
  }

  private func requestMicrophonePermission() async -> Bool {
    await withCheckedContinuation { continuation in
      AVAudioSession.sharedInstance().requestRecordPermission { granted in
        continuation.resume(returning: granted)
      }
    }
  }

  private func emit(_ payload: [String: Any?]) {
    events?.send(payload)
  }

  private func emitMembers() {
    guard let room else { return }
    var members: [[String: Any?]] = []
    members.append(memberPayload(room.localParticipant))
    for participant in room.remoteParticipants.values {
      members.append(memberPayload(participant))
    }
    emit(["type": "members", "members": members])
  }

  private func memberPayload(_ participant: Participant) -> [String: Any?] {
    [
      "id": participant.identity?.stringValue ?? "",
      "name": participant.name ?? participant.identity?.stringValue ?? "",
      "speaking": participant.isSpeaking,
      "level": Double(participant.audioLevel),
      "joined": true,
      "muted": !participant.isMicrophoneEnabled(),
    ]
  }

  func room(_ room: Room, didUpdateConnectionState connectionState: ConnectionState,
            from oldConnectionState: ConnectionState) {
    switch connectionState {
    case .connected:
      emit(["type": "phase", "phase": "connected"])
      emitMembers()
    case .reconnecting:
      emit(["type": "phase", "phase": "reconnecting"])
    case .disconnected:
      DispatchQueue.main.async {
        UIApplication.shared.isIdleTimerDisabled = false
      }
      if !closing {
        emit([
          "type": "phase",
          "phase": "error",
          "message": "语音连接已断开，请重新加入",
        ])
      }
    default:
      break
    }
  }

  func roomDidConnect(_ room: Room) {
    emit(["type": "phase", "phase": "connected"])
    emitMembers()
  }

  func room(_ room: Room, didFailToConnectWithError error: LiveKitError?) {
    emit([
      "type": "phase",
      "phase": "error",
      "message": error?.localizedDescription ?? "语音连接失败",
    ])
  }

  func room(_ room: Room, didDisconnectWithError error: LiveKitError?) {
    guard !closing else { return }
    emit([
      "type": "phase",
      "phase": "error",
      "message": error?.localizedDescription ?? "语音连接已断开",
    ])
  }

  func room(_ room: Room, participantDidConnect participant: RemoteParticipant) {
    emitMembers()
  }

  func room(_ room: Room, participantDidDisconnect participant: RemoteParticipant) {
    emitMembers()
  }

  func room(_ room: Room, didUpdateSpeakingParticipants participants: [Participant]) {
    emitMembers()
  }

  func room(_ room: Room, participant: Participant,
            didUpdatePermissions permissions: ParticipantPermissions) {
    if participant === room.localParticipant && !permissions.canPublish {
      emit(["type": "permission", "muted": true])
    }
  }

  func room(_ room: Room, participant: Participant, didUpdateState state: ParticipantState) {
    if state == .active || state == .disconnected {
      emitMembers()
    }
  }
}
