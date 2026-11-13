import Foundation

struct ShellInvitation: Identifiable, Hashable, Codable {
    let room: String
    let service: String
    let name: String
    let motion: String
    var spectator: Bool? = nil

    var id: String { url.absoluteString }

    var inviteLink: String {
        var components = URLComponents(string: service)!
        var items = components.queryItems ?? []
        items.append(URLQueryItem(name: "room", value: room))
        components.queryItems = items
        return components.url!.absoluteString
    }

    var url: URL {
        var components = URLComponents(
            url: ShellWebBase.url,
            resolvingAgainstBaseURL: false
        )!
        var items = components.queryItems ?? []
        items.append(URLQueryItem(name: "room", value: room))
        items.append(URLQueryItem(name: "service", value: service))
        items.append(URLQueryItem(name: "native-room", value: "1"))
        if !name.isEmpty {
            items.append(URLQueryItem(name: "name", value: name))
        }
        if spectator == true {
            items.append(URLQueryItem(name: "spectator", value: "1"))
        }
        items.append(URLQueryItem(name: "motion", value: motion))
        components.queryItems = items
        return components.url!
    }

    static func parse(
        _ raw: String,
        name: String,
        enhancedMotion: Bool,
        spectator: Bool = false
    ) -> ShellInvitation? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard
            let url = URL(string: trimmed),
            let scheme = url.scheme?.lowercased(),
            ["http", "https"].contains(scheme),
            let components = URLComponents(
                url: url,
                resolvingAgainstBaseURL: false
            ),
            let room = components.queryItems?
                .first(where: { $0.name == "room" })?
                .value?
                .trimmingCharacters(in: .whitespacesAndNewlines),
            !room.isEmpty,
            room.count <= 12,
            let host = url.host,
            !host.isEmpty
        else { return nil }

        let specified = components.queryItems?
            .first(where: { $0.name == "service" })?
            .value
        let service =
            specified ??
            "\(scheme)://\(host)\(url.port.map { ":\($0)" } ?? "")"
        guard
            let serviceURL = URL(string: service),
            let serviceScheme = serviceURL.scheme?.lowercased(),
            ["http", "https"].contains(serviceScheme)
        else { return nil }

        let player = String(
            name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(24)
        )
        return ShellInvitation(
            room: room,
            service: service,
            name: player,
            motion: enhancedMotion ? "enhanced" : "basic",
            spectator: spectator
        )
    }
}

enum ShellRecentRooms {
    private static let key = "shell.recentRooms"

    static func load() -> [ShellInvitation] {
        guard
            let data = UserDefaults.standard.data(forKey: key),
            let items = try? JSONDecoder().decode(
                [ShellInvitation].self,
                from: data
            )
        else { return [] }
        return items
    }

    static func remember(_ invitation: ShellInvitation) {
        var items = load().filter {
            !($0.room == invitation.room && $0.service == invitation.service)
        }
        items.insert(invitation, at: 0)
        if let data = try? JSONEncoder().encode(Array(items.prefix(5))) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}
