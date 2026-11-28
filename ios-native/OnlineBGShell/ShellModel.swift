import SwiftUI
import UIKit

enum ShellTab: Hashable {
    case home
    case lobby
    case settings
}

struct ShellTableSetup: Hashable {
    var humans: Int
    var ai: Int
    var difficulty: String
    var aiDelayMs: Int = 1500
    var gameOptions: String = "{}"

    static func standard(for game: ShellGame) -> ShellTableSetup {
        ShellTableSetup(
            humans: game.ai ? 1 : game.minPlayers,
            ai: game.ai ? max(0, game.seats(game.selections).lowerBound - 1) : 0,
            difficulty: "normal",
            gameOptions: try! game.optionsJSON(game.selections)
        )
    }
}

struct ShellTableRoute: Hashable, Identifiable {
    let game: ShellGame
    let setup: ShellTableSetup

    var id: String {
        "\(game.id)-\(setup.humans)-\(setup.ai)-\(setup.difficulty)-\(setup.aiDelayMs)-\(setup.gameOptions)"
    }
}

let shellGames = try! ShellCatalogue.load(
    from: Bundle.main.resourceURL!.appendingPathComponent("web/native-catalogue.json")
)

extension ShellGame {
    private var artwork: (String, UInt32, UInt32) {
        switch id {
        case "expedition": ("building.columns.fill", 0xdcd8ec, 0xb9b1db)
        case "dominion": ("crown.fill", 0xeee2c0, 0xd8c28d)
        case "graphwar": ("function", 0xd3e5e8, 0xa9ced4)
        case "scmj": ("square.grid.3x3.fill", 0xd9e8d8, 0xb6d2b4)
        case "ccbs": ("diamond.fill", 0xd8e7e7, 0xafd2d2)
        case "ktd": ("hexagon.fill", 0xe8dbb9, 0xd0bd8c)
        case "dy": ("flask.fill", 0xe4d9e8, 0xcbb7d2)
        case "ddz": ("suit.spade.fill", 0xecd6d2, 0xd9b3ad)
        case "uno": ("rectangle.on.rectangle.angled", 0xf4d4bf, 0xe8b99a)
        case "sgs": ("shield.lefthalf.filled", 0xe9d8cc, 0xd7b8a5)
        case "fxq": ("airplane", 0xd6e2ed, 0xb4c9dd)
        case "tq": ("circle.grid.cross.fill", 0xdce3cb, 0xc1cda5)
        case "pool": ("sportscourt.fill", 0xcce3d9, 0x8fbcac)
        default: ("gamecontroller.fill", 0xd8e7e7, 0xafd2d2)
        }
    }

    var symbol: String { artwork.0 }
    var colors: [Color] { [Color(hex: artwork.1), Color(hex: artwork.2)] }
}

enum ShellTheme {
    static let accent = adaptive(light: 0x34796d, dark: 0x8dcbb5)
    static let accentText = adaptive(light: 0xffffff, dark: 0x111827)
    static let canvas = adaptive(light: 0xf5f2ea, dark: 0x171e24)
    static let surface = adaptive(light: 0xfffcf5, dark: 0x222c32)
    static let field = adaptive(light: 0xece9e2, dark: 0x303d44)
    static let text = adaptive(light: 0x172330, dark: 0xeef1f7)
    static let muted = adaptive(light: 0x626b70, dark: 0xadb5c4)
    static let line = adaptive(light: 0xdeded6, dark: 0x414751)
    static let focus = adaptive(light: 0xaa6c19, dark: 0xefbf69)

    static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(
            UIColor { traits in
                UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
            }
        )
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(uiColor: UIColor(hex: hex))
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: 1
        )
    }
}

enum ShellWebBase {
    static var url: URL {
        if let value = ProcessInfo.processInfo.environment["SHELL_BASE_URL"],
           !value.isEmpty,
           let url = URL(string: value) {
            return url
        }
        if LocalWebServer.shared.hasBundledWeb {
            return LocalWebServer.shared.baseURL
        }
        if let value = Bundle.main.object(
            forInfoDictionaryKey: "ShellBaseURL"
        ) as? String,
           !value.isEmpty,
           let url = URL(string: value) {
            return url
        }
        return LocalWebServer.shared.baseURL
    }
}
