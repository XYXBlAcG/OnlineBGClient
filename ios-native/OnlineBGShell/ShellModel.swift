import SwiftUI

struct ShellGame: Identifiable, Hashable {
    let id: String
    let name: String
    let subtitle: String
    let players: String
    let category: String
    let symbol: String
    let colors: [Color]
    let ai: Bool

    static func == (lhs: ShellGame, rhs: ShellGame) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

enum ShellTab: Hashable {
    case home
    case lobby
    case settings
}

let shellGames: [ShellGame] = [
    ShellGame(id: "expedition", name: "秘塔远征", subtitle: "协作构筑 · 探索裂隙遗迹", players: "1–4 人", category: "合作", symbol: "building.columns.fill", colors: [Color(hex: 0xdcd8ec), Color(hex: 0xb9b1db)], ai: true),
    ShellGame(id: "dominion", name: "领土 · Dominion", subtitle: "构筑牌库与王国竞逐", players: "2–4 人", category: "策略", symbol: "crown.fill", colors: [Color(hex: 0xeee2c0), Color(hex: 0xd8c28d)], ai: true),
    ShellGame(id: "graphwar", name: "Graphwar", subtitle: "用函数画出炮火的轨迹", players: "2–12 人", category: "策略", symbol: "function", colors: [Color(hex: 0xd3e5e8), Color(hex: 0xa9ced4)], ai: true),
    ShellGame(id: "scmj", name: "麻将", subtitle: "四川血战与透明立直", players: "4 人", category: "纸牌", symbol: "square.grid.3x3.fill", colors: [Color(hex: 0xd9e8d8), Color(hex: 0xb6d2b4)], ai: true),
    ShellGame(id: "ccbs", name: "璀璨宝石", subtitle: "宝石、发展与贵族", players: "2–4 人", category: "策略", symbol: "diamond.fill", colors: [Color(hex: 0xd8e7e7), Color(hex: 0xafd2d2)], ai: true),
    ShellGame(id: "ktd", name: "卡坦岛", subtitle: "资源、贸易与建设", players: "2–8 人", category: "策略", symbol: "hexagon.fill", colors: [Color(hex: 0xe8dbb9), Color(hex: 0xd0bd8c)], ai: true),
    ShellGame(id: "dy", name: "毒药", subtitle: "药锅与颜色博弈", players: "2–7 人", category: "纸牌", symbol: "flask.fill", colors: [Color(hex: 0xe4d9e8), Color(hex: 0xcbb7d2)], ai: true),
    ShellGame(id: "ddz", name: "斗地主", subtitle: "地主与农民", players: "3 人", category: "纸牌", symbol: "suit.spade.fill", colors: [Color(hex: 0xecd6d2), Color(hex: 0xd9b3ad)], ai: false),
    ShellGame(id: "uno", name: "UNO", subtitle: "颜色与数字", players: "2–8 人", category: "纸牌", symbol: "rectangle.on.rectangle.angled", colors: [Color(hex: 0xf4d4bf), Color(hex: 0xe8b99a)], ai: true),
    ShellGame(id: "sgs", name: "三国杀", subtitle: "身份与武将", players: "2–8 人", category: "纸牌", symbol: "shield.lefthalf.filled", colors: [Color(hex: 0xe9d8cc), Color(hex: 0xd7b8a5)], ai: true),
    ShellGame(id: "fxq", name: "飞行棋", subtitle: "掷骰与飞跃", players: "2–4 人", category: "棋盘", symbol: "airplane", colors: [Color(hex: 0xd6e2ed), Color(hex: 0xb4c9dd)], ai: true),
    ShellGame(id: "tq", name: "跳棋", subtitle: "连续跳跃与营地竞速", players: "2–6 人", category: "棋盘", symbol: "circle.grid.cross.fill", colors: [Color(hex: 0xdce3cb), Color(hex: 0xc1cda5)], ai: true),
]

enum ShellCardTone: Hashable {
    case red
    case blue
    case green
    case yellow
    case wild
    case black
}

struct ShellCard: Identifiable, Hashable {
    let id: String
    let label: String
    let tone: ShellCardTone
    let suit: String?
}

enum ShellHandStyle {
    case uno
    case ddz
}

let shellUnoHand: [ShellCard] = [
    ShellCard(id: "uno-red-7", label: "7", tone: .red, suit: nil),
    ShellCard(id: "uno-blue-4", label: "4", tone: .blue, suit: nil),
    ShellCard(id: "uno-green-9", label: "9", tone: .green, suit: nil),
    ShellCard(id: "uno-yellow-skip", label: "⊘", tone: .yellow, suit: nil),
    ShellCard(id: "uno-red-reverse", label: "⇄", tone: .red, suit: nil),
    ShellCard(id: "uno-blue-1", label: "1", tone: .blue, suit: nil),
    ShellCard(id: "uno-wild", label: "W", tone: .wild, suit: nil),
]

let shellDdzHand: [ShellCard] = [
    ShellCard(id: "ddz-spade-3", label: "3", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-4", label: "4", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-5", label: "5", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-6", label: "6", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-7", label: "7", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-8", label: "8", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-9", label: "9", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-10", label: "10", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-j", label: "J", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-q", label: "Q", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-k", label: "K", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-a", label: "A", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-spade-2", label: "2", tone: .black, suit: "♠"),
    ShellCard(id: "ddz-heart-3", label: "3", tone: .red, suit: "♥"),
    ShellCard(id: "ddz-heart-4", label: "4", tone: .red, suit: "♥"),
    ShellCard(id: "ddz-club-2", label: "2", tone: .black, suit: "♣"),
    ShellCard(id: "ddz-joker", label: "JOKER", tone: .wild, suit: nil),
]

enum ShellTheme {
    static let accent = Color(hex: 0x34796d)
    static let canvas = Color(uiColor: .systemGroupedBackground)
    static let surface = Color(uiColor: .secondarySystemGroupedBackground)
    static let raised = Color(uiColor: .systemBackground)
    static let field = Color(uiColor: .tertiarySystemFill)
    static let feltTop = Color(hex: 0x2c7a61)
    static let feltBottom = Color(hex: 0x1b4b3c)
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: 1
        )
    }
}
