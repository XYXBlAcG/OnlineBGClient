import Foundation

struct ShellWebState: Equatable {
    enum Phase: Equatable {
        case loading
        case ready
        case failed(String)
    }

    private(set) var phase: Phase = .loading
    private var hasRoom = false

    var requiresRoomLeave: Bool {
        phase == .ready && hasRoom
    }

    mutating func begin() {
        phase = .loading
        hasRoom = false
    }

    mutating func ready(room: String) {
        phase = .ready
        hasRoom = !room.isEmpty
    }

    mutating func fail(_ message: String) {
        phase = .failed(message)
    }
}
