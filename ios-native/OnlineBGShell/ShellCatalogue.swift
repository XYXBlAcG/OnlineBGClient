import Foundation

struct ShellSetupChoice: Decodable, Hashable {
    let value: String
    let label: String
    let detail: String?
}

struct ShellSetupField: Decodable, Hashable, Identifiable {
    enum Format: String, Decodable {
        case string, number, boolean, strings
    }

    struct Condition: Decodable, Hashable {
        let key: String
        let value: String
    }

    let group: String
    let key: String
    let title: String
    let format: Format
    let choices: [ShellSetupChoice]
    let visibleWhen: Condition?
    let count: Int?
    var id: String { "\(group).\(key)" }

    func isVisible(_ selections: [String: String]) -> Bool {
        guard let condition = visibleWhen else { return true }
        return selections[condition.key] == condition.value
    }
}

struct ShellGame: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let subtitle: String
    let minPlayers: Int
    let maxPlayers: Int
    let category: String
    let ai: Bool
    let mobile: Bool
    let fields: [ShellSetupField]
    let selections: [String: String]
    let seatRanges: [SeatRange]

    struct SeatRange: Decodable, Hashable {
        let when: [String: String]
        let min: Int
        let max: Int
    }

    func seats(_ values: [String: String]) -> ClosedRange<Int> {
        let range = seatRanges.first { rule in
            rule.when.allSatisfy { values[$0.key] == $0.value }
        }!
        return range.min...range.max
    }

    var players: String {
        minPlayers == maxPlayers ? "\(minPlayers) 人" : "\(minPlayers)–\(maxPlayers) 人"
    }

    func optionsJSON(_ values: [String: String]) throws -> String {
        var groups: [String: [String: Any]] = [:]
        for field in fields {
            let value = values[field.key] ?? selections[field.key]!
            let encoded: Any
            switch field.format {
            case .number:
                guard let number = Int(value) else { throw CocoaError(.coderInvalidValue) }
                encoded = number
            case .boolean:
                guard value == "true" || value == "false" else { throw CocoaError(.coderInvalidValue) }
                encoded = value == "true"
            case .strings:
                let cards = value.split(separator: ",").map(String.init)
                if field.isVisible(values), let count = field.count, cards.count != count {
                    throw CocoaError(.coderInvalidValue)
                }
                encoded = cards
            case .string:
                guard field.choices.contains(where: { $0.value == value }) else { throw CocoaError(.coderInvalidValue) }
                encoded = value
            }
            groups[field.group, default: [:]][field.key] = encoded
        }
        let data = try JSONSerialization.data(withJSONObject: groups, options: [.sortedKeys])
        return String(decoding: data, as: UTF8.self)
    }
}

enum ShellCatalogue {
    static func load(from url: URL) throws -> [ShellGame] {
        try JSONDecoder().decode([ShellGame].self, from: Data(contentsOf: url))
    }
}
