import Foundation

@main
struct NativeCatalogueTests {
    static func main() throws {
        let games = try ShellCatalogue.load(from: URL(fileURLWithPath: CommandLine.arguments[1]))
        precondition(games.first { $0.id == "pool" }?.mobile == true)
        precondition(games.first { $0.id == "ddz" }?.ai == true)
        var payloads: [[String: String]] = []
        for game in games {
            payloads.append(["kind": game.id, "options": try game.optionsJSON(game.selections)])
            for field in game.fields where field.format != .strings {
                for choice in field.choices {
                    var values = game.selections
                    values[field.key] = choice.value
                    payloads.append(["kind": game.id, "options": try game.optionsJSON(values)])
                }
            }
            if let cards = game.fields.first(where: { $0.format == .strings }) {
                var values = game.selections
                values["mode"] = "custom"
                values[cards.key] = ""
                do {
                    _ = try game.optionsJSON(values)
                    preconditionFailure("Empty custom kingdom must fail")
                } catch CocoaError.coderInvalidValue {}
                values[cards.key] = cards.choices.prefix(cards.count!).map(\.value).joined(separator: ",")
                payloads.append(["kind": game.id, "options": try game.optionsJSON(values)])
            }
        }
        let data = try JSONSerialization.data(withJSONObject: payloads)
        print(String(decoding: data, as: UTF8.self))
    }
}
