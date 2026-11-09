import SwiftUI

@main
struct OnlineBGShellApp: App {
    var body: some Scene {
        WindowGroup {
            ShellRootView()
        }
    }
}

struct ShellRootView: View {
    @State private var tab: ShellTab = .home
    @AppStorage("shell.theme") private var theme = "跟随系统"

    private var launchGame: ShellGame? {
        let identifier =
            ProcessInfo.processInfo.environment["SHELL_GAME"] ??
            ProcessInfo.processInfo.arguments.dropFirst().first
        return shellGames.first { $0.id == identifier }
    }

    var body: some View {
        Group {
            if let launchGame {
                NavigationStack {
                    WebTableScreen(game: launchGame)
                }
            } else {
                TabView(selection: $tab) {
                    HomeView(onOpenLobby: { tab = .lobby })
                        .tag(ShellTab.home)
                        .tabItem { Label("首页", systemImage: "house.fill") }

                    LobbyView()
                        .tag(ShellTab.lobby)
                        .tabItem { Label("大厅", systemImage: "square.grid.2x2.fill") }

                    SettingsView()
                        .tag(ShellTab.settings)
                        .tabItem { Label("设置", systemImage: "slider.horizontal.3") }
                }
            }
        }
        .tint(ShellTheme.accent)
        .preferredColorScheme(
            theme == "深色" ? .dark : theme == "浅色" ? .light : nil
        )
    }
}

enum HomeRoute: Hashable {
    case join
    case table(ShellGame)
}

struct HomeView: View {
    let onOpenLobby: () -> Void
    @State private var path: [HomeRoute] = []

    private let lastGame = shellGames.first { $0.id == "uno" }!

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    heroCard
                    actionGrid
                    recentRoom
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .background(ShellTheme.canvas)
            .navigationTitle("今晚玩什么？")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: HomeRoute.self) { route in
                switch route {
                case .join:
                    JoinView()
                case .table(let game):
                    WebTableScreen(game: game)
                }
            }
        }
    }

    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 14) {
                GameCoverView(game: lastGame, size: 76)
                VStack(alignment: .leading, spacing: 4) {
                    Text("上次玩的")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(lastGame.name)
                        .font(.title3.weight(.semibold))
                    Text(lastGame.subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }
            Button {
                path.append(.table(lastGame))
            } label: {
                Label(lastGame.ai ? "和 AI 玩" : "同屏开局", systemImage: "sparkles")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(ShellTheme.accent)
        }
        .padding(16)
        .background(ShellTheme.surface, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var actionGrid: some View {
        HStack(spacing: 12) {
            Button(action: onOpenLobby) {
                ActionTile(title: "本地大厅", subtitle: "选择游戏和 AI", symbol: "square.grid.2x2.fill")
            }
            .buttonStyle(.plain)

            Button {
                path.append(.join)
            } label: {
                ActionTile(title: "加入房间", subtitle: "链接或二维码", symbol: "link")
            }
            .buttonStyle(.plain)
        }
    }

    private var recentRoom: some View {
        Button {
            path.append(.table(lastGame))
        } label: {
            HStack(spacing: 12) {
                Text("U")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(Color(hex: 0x2a6ed4), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("继续上次房间")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text("UNO · 4 人 · 等待加入")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(12)
            .background(ShellTheme.surface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

private struct ActionTile: View {
    let title: String
    let subtitle: String
    let symbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol)
                .font(.title3.weight(.semibold))
                .foregroundStyle(ShellTheme.accent)
                .frame(width: 40, height: 40)
                .background(ShellTheme.field, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.primary)
            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 124, alignment: .topLeading)
        .padding(14)
        .background(ShellTheme.surface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

struct LobbyView: View {
    @State private var search = ""
    @State private var category = "全部"
    @State private var sheetGame: ShellGame?
    @State private var tableGame: ShellGame?

    private let categories = ["全部", "常玩", "收藏", "合作", "策略", "纸牌", "棋盘"]
    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    private var games: [ShellGame] {
        shellGames.filter { game in
            (category == "全部" || game.category == category) &&
            (search.trimmingCharacters(in: .whitespaces).isEmpty ||
                game.name.localizedCaseInsensitiveContains(search))
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(categories, id: \.self) { item in
                                Button {
                                    withAnimation(.snappy) { category = item }
                                } label: {
                                    CategoryChip(title: item, active: category == item)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 18)
                    }

                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(games) { game in
                            Button {
                                sheetGame = game
                            } label: {
                                GameCardView(game: game, selected: sheetGame?.id == game.id)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 18)
                }
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .background(ShellTheme.canvas)
            .navigationTitle("本地大厅")
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $search, prompt: "搜索游戏")
            .navigationDestination(item: $tableGame) { game in
                WebTableScreen(game: game)
            }
            .sheet(item: $sheetGame) { game in
                GameSetupSheet(game: game) {
                    sheetGame = nil
                    tableGame = game
                }
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
        }
    }
}

struct GameSetupSheet: View {
    let game: ShellGame
    let onStart: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                GameCoverView(game: game, size: 58)
                VStack(alignment: .leading, spacing: 3) {
                    Text(game.name)
                        .font(.title3.weight(.semibold))
                    Text(game.subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }

            VStack(spacing: 0) {
                settingsRow("真人玩家", "1 人")
                settingsRow("AI 补位", game.ai ? (game.id == "scmj" ? "3 位" : "1 位") : "同屏轮流")
                settingsRow("难度", "普通")
            }
            .background(ShellTheme.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            Button(action: onStart) {
                Text("开始本地对局")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(ShellTheme.accent)
            .controlSize(.large)

            Spacer(minLength: 0)
        }
        .padding(20)
        .background(ShellTheme.canvas)
    }

    private func settingsRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
        .font(.subheadline)
        .padding(.horizontal, 14)
        .frame(height: 44)
    }
}

struct JoinView: View {
    @State private var link = ""
    @State private var name = "我"
    @State private var showingPrototypeNotice = false

    var body: some View {
        Form {
            Section {
                TextField("https://…/room/…", text: $link)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField("你的昵称", text: $name)
            } header: {
                Text("邀请")
            }

            Section {
                Button {
                    showingPrototypeNotice = true
                } label: {
                    Label("扫描邀请二维码", systemImage: "qrcode.viewfinder")
                }
                Button {
                    showingPrototypeNotice = true
                } label: {
                    Text("加入牌桌").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(ShellTheme.accent)
                .disabled(link.trimmingCharacters(in: .whitespaces).isEmpty || name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .navigationTitle("加入房间")
        .navigationBarTitleDisplayMode(.inline)
        .alert("暂未接入", isPresented: $showingPrototypeNotice) {
            Button("知道了", role: .cancel) {}
        }
    }
}

struct SettingsView: View {
    @AppStorage("shell.theme") private var theme = "跟随系统"
    @AppStorage("shell.enhancedGameMotion")
    private var enhancedGameMotion = true

    var body: some View {
        NavigationStack {
            Form {
                Section("外观") {
                    Picker("主题", selection: $theme) {
                        Text("跟随系统").tag("跟随系统")
                        Text("浅色").tag("浅色")
                        Text("深色").tag("深色")
                    }
                    .pickerStyle(.segmented)
                }

                Section("动效") {
                    Toggle("增强游戏动画", isOn: $enhancedGameMotion)
                }

                Section("声音与语音") {
                    LabeledContent("按住说话", value: "原生 LiveKit")
                    LabeledContent("输出设备", value: "跟随系统")
                }

                Section("关于") {
                    LabeledContent("版本", value: "0.4.1")
                }
            }
            .scrollContentBackground(.hidden)
            .background(ShellTheme.canvas)
            .navigationTitle("设置")
        }
    }
}

#Preview("Shell") {
    ShellRootView()
}

#Preview("Lobby") {
    LobbyView()
}

#Preview("Settings") {
    SettingsView()
}
