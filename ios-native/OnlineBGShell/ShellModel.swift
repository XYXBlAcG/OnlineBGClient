import SwiftUI
import UIKit

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
