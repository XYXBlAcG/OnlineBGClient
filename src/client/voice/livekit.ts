import { VoiceEffectProcessor } from "./effect-processor";
import {
  voiceEffectSchema,
  type VoiceEffect,
} from "../../domain/voice-effects";
import { canSelectOutput, outputChoice } from "./audio-output";
import {
  Room,
  RoomEvent,
  Track,
  TrackEvent,
  type RemoteAudioTrack,
  type LocalAudioTrack,
} from "livekit-client";
import type { VoiceTransport, VoiceTransportEvents } from "./session";
import type { VoiceGrant } from "../../domain/voice";
export class LiveKitTransport implements VoiceTransport {
  private readonly room = new Room({
    disconnectOnPageLeave: false,
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    publishDefaults: {
      audioPreset: { maxBitrate: 24000 },
      dtx: true,
      stopMicTrackOnMute: true,
    },
  });
  private tracks = new Map<
    string,
    { track: RemoteAudioTrack; element: HTMLMediaElement; identity: string }
  >();
  private readonly volumes = new Map<string, number>();
  private deaf = false;
  private desired = false;
  private events: VoiceTransportEvents | undefined;
  private processor = new VoiceEffectProcessor((error) =>
    this.events?.processingError?.(error.message),
  );
  private microphone: LocalAudioTrack | null = null;
  private closed = false;
  private effectKey = "";
  private input = "default";
  private outputId = "default";
  async connect(grant: VoiceGrant, events: VoiceTransportEvents) {
    this.events = events;
    this.room
      .on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.track?.kind === Track.Kind.Audio)
          publication.track.on(TrackEvent.Ended, events.deviceLost);
      })
      .on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (track.kind !== Track.Kind.Audio) return;
        const audio = track as RemoteAudioTrack,
          element = audio.attach();
        element.style.display = "none";
        document.body.append(element);
        this.tracks.set(track.sid!, {
          track: audio,
          element,
          identity: participant.identity,
        });
        audio.setVolume(
          this.deaf ? 0 : (this.volumes.get(participant.identity) ?? 1),
        );
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        const item = this.tracks.get(track.sid!);
        if (item) {
          item.track.detach(item.element);
          item.element.remove();
          this.tracks.delete(track.sid!);
        }
      })
      .on(RoomEvent.ActiveSpeakersChanged, () =>
        events.members(
          [
            this.room.localParticipant,
            ...this.room.remoteParticipants.values(),
          ].map((p) => ({
            id: p.identity,
            speaking: p.isSpeaking,
            level: p.audioLevel,
          })),
        ),
      )
      .on(RoomEvent.Reconnecting, () => events.phase("reconnecting"))
      .on(RoomEvent.Reconnected, () => {
        this.desired = false;
        events.phase("connected");
      })
      .on(RoomEvent.Disconnected, () =>
        events.phase("error", "语音连接已断开，可能已被房主移除，请重新加入"),
      )
      .on(RoomEvent.AudioPlaybackStatusChanged, () =>
        events.playback(!this.room.canPlaybackAudio),
      )
      .on(RoomEvent.ParticipantPermissionsChanged, (_previous, participant) => {
        if (participant === this.room.localParticipant)
          events.permission(!participant.permissions?.canPublish);
      });
    await this.room.connect(grant.url, grant.token, { autoSubscribe: true });
    await this.room.startAudio().catch(() => events.playback(true));
  }
  async sending(
    enabled: boolean,
    input: string,
    effect: VoiceEffect = voiceEffectSchema.parse({}),
  ) {
    if (this.closed) return;
    const key = JSON.stringify(effect);
    if (key !== this.effectKey) {
      await this.processor.set(effect);
      this.effectKey = key;
    }
    if (
      enabled &&
      this.microphone &&
      this.microphone.getProcessor() !== this.processor
    )
      await this.microphone.setProcessor(this.processor);
    if (enabled === this.desired && input === this.input) return;
    if (enabled && !this.room.localParticipant.permissions?.canPublish)
      throw new Error("房主已禁止发言");
    if (enabled && !this.microphone) {
      const tracks = await this.room.localParticipant.createTracks({
        audio: {
          deviceId: input,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
      const track = tracks[0] as LocalAudioTrack;
      if (this.closed) {
        tracks.forEach((t) => t.stop());
        return;
      }
      try {
        await track.setProcessor(this.processor);
        if (this.closed) {
          track.stop();
          return;
        }
        this.microphone = track;
        await this.room.localParticipant.publishTrack(track, {
          source: Track.Source.Microphone,
        });
      } catch (error) {
        track.stop();
        this.microphone = null;
        throw error;
      }
    } else if (this.microphone) {
      if (enabled) {
        await this.microphone.setDeviceId(input);
        await this.microphone.unmute();
      } else await this.microphone.mute();
    }
    this.desired = enabled;
    this.input = input;
  }
  async output(id: string) {
    const choice = outputChoice(id, canSelectOutput(), this.outputId);
    if (choice) {
      await this.room.switchActiveDevice("audiooutput", choice);
      this.outputId = id;
    }
  }
  volume(id: string, value: number) {
    this.volumes.set(id, value);
    for (const item of this.tracks.values())
      if (item.identity === id) item.track.setVolume(this.deaf ? 0 : value);
  }
  deafen(enabled: boolean) {
    this.deaf = enabled;
    for (const item of this.tracks.values())
      item.track.setVolume(
        enabled ? 0 : (this.volumes.get(item.identity) ?? 1),
      );
  }
  async playback() {
    await this.room.startAudio();
  }
  close() {
    this.closed = true;
    this.microphone?.stop();
    this.microphone = null;
    for (const item of this.tracks.values()) {
      item.track.detach(item.element);
      item.element.remove();
    }
    this.tracks.clear();
    void this.room.disconnect(true).finally(() => this.processor.destroy());
  }
}
