import SwiftUI

@main
struct OnlineBGShellApp: App {
    init() {
        LocalWebServer.shared.start()
    }

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
                    WebTableScreen(
                        game: launchGame,
                        setup: .standard(for: launchGame)
                    )
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
}

private enum HomeCover: Identifiable {
    case table(ShellTableRoute)
    case runs

    var id: String {
        switch self {
        case .table(let route):
            route.id
        case .runs:
            "runs"
        }
    }
}

struct HomeView: View {
    let onOpenLobby: () -> Void
    @AppStorage("shell.lastGame") private var lastGameID = "uno"
    @State private var path: [HomeRoute] = []
    @State private var cover: HomeCover?
    @State private var setupGame: ShellGame?
    @State private var pendingRoute: ShellTableRoute?

    private var lastGame: ShellGame {
        shellGames.first { $0.id == lastGameID && $0.mobile } ??
        shellGames.first { $0.id == "uno" }!
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    heroCard
                    actionGrid
                    runsEntry
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
                }
            }
        }
        .sheet(
            item: $setupGame,
            onDismiss: {
                if let pendingRoute {
                    cover = .table(pendingRoute)
                    self.pendingRoute = nil
                }
            }
        ) { game in
            GameSetupSheet(game: game) { setup in
                lastGameID = game.id
                pendingRoute = ShellTableRoute(game: game, setup: setup)
                setupGame = nil
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .fullScreenCover(item: $cover) { item in
            switch item {
            case .table(let route):
                NavigationStack {
                    WebTableScreen(game: route.game, setup: route.setup)
                }
            case .runs:
                NavigationStack {
                    ShellRunsScreen()
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
                setupGame = lastGame
            } label: {
                Label(
                    lastGame.id == "expedition"
                        ? "和 AI 朋友玩"
                        : lastGame.ai ? "和 AI 玩" : "同屏开局",
                    systemImage: "sparkles"
                )
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

    private var runsEntry: some View {
        Button {
            cover = .runs
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "clock.arrow.circlepath")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(ShellTheme.accent)
                    .frame(width: 40, height: 40)
                    .background(
                        ShellTheme.field,
                        in: RoundedRectangle(
                            cornerRadius: 13,
                            style: .continuous
                        )
                    )
                VStack(alignment: .leading, spacing: 2) {
                    Text("继续远征")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text("读取本地和联机存档")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(12)
            .background(
                ShellTheme.surface,
                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
            )
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
    @AppStorage("shell.lastGame") private var lastGameID = "uno"
    @State private var search = ""
    @State private var category = "全部"
    @State private var sheetGame: ShellGame?
    @State private var tableRoute: ShellTableRoute?
    @State private var pendingRoute: ShellTableRoute?

    private let categories = ["全部", "合作", "策略", "纸牌", "棋盘"]
    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    private var games: [ShellGame] {
        shellGames.filter { game in
            game.mobile &&
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
            .sheet(
                item: $sheetGame,
                onDismiss: {
                    if let pendingRoute {
                        tableRoute = pendingRoute
                        self.pendingRoute = nil
                    }
                }
            ) { game in
                GameSetupSheet(game: game) { setup in
                    lastGameID = game.id
                    pendingRoute = ShellTableRoute(game: game, setup: setup)
                    sheetGame = nil
                }
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
        }
        .fullScreenCover(item: $tableRoute) { route in
            NavigationStack {
                WebTableScreen(game: route.game, setup: route.setup)
            }
        }
    }
}

struct GameSetupSheet: View {
    let game: ShellGame
    let onStart: (ShellTableSetup) -> Void
    @State private var aiCount: Int
    @State private var difficulty = "normal"
    @State private var aiDelayMs = 1500
    @State private var expeditionDifficulty = "standard"

    init(game: ShellGame, onStart: @escaping (ShellTableSetup) -> Void) {
        self.game = game
        self.onStart = onStart
        _aiCount = State(
            initialValue: game.ai ? max(0, game.minPlayers - 1) : 0
        )
    }

    private var humans: Int {
        game.ai ? 1 : game.minPlayers
    }

    private var aiRange: ClosedRange<Int> {
        let minimum = game.ai ? max(0, game.minPlayers - 1) : 0
        let maximum = game.ai ? max(0, game.maxPlayers - 1) : 0
        return minimum...maximum
    }

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
                settingsRow("真人玩家", "\(humans) 人")
                if game.ai {
                    Stepper(value: $aiCount, in: aiRange) {
                        HStack {
                            Text(game.id == "expedition" ? "AI 朋友" : "AI 对手")
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(aiCount) 个")
                                .fontWeight(.medium)
                        }
                        .font(.subheadline)
                        .padding(.horizontal, 14)
                        .frame(height: 44)
                    }
                    HStack {
                        Text(game.id == "expedition" ? "AI 能力" : "AI 难度")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Picker("AI 难度", selection: $difficulty) {
                            Text("简单").tag("easy")
                            Text("普通").tag("normal")
                            Text("困难").tag("hard")
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 190)
                    }
                    .font(.subheadline)
                    .padding(.horizontal, 14)
                    .frame(height: 52)
                    HStack {
                        Text("AI 响应")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Picker("AI 响应", selection: $aiDelayMs) {
                            Text("0.5 秒").tag(500)
                            Text("1 秒").tag(1000)
                            Text("1.5 秒").tag(1500)
                            Text("2 秒").tag(2000)
                            Text("3 秒").tag(3000)
                        }
                        .pickerStyle(.menu)
                    }
                    .font(.subheadline)
                    .padding(.horizontal, 14)
                    .frame(height: 44)
                    if game.id == "expedition" {
                        HStack {
                            Text("远征难度")
                                .foregroundStyle(.secondary)
                            Spacer()
                            Picker(
                                "远征难度",
                                selection: $expeditionDifficulty
                            ) {
                                Text("剧情").tag("story")
                                Text("标准").tag("standard")
                                Text("挑战").tag("challenge")
                            }
                            .pickerStyle(.menu)
                        }
                        .font(.subheadline)
                        .padding(.horizontal, 14)
                        .frame(height: 44)
                    }
                } else {
                    settingsRow("操作", "同屏轮流")
                }
                settingsRow("总人数", "\(humans + (game.ai ? aiCount : 0)) 人")
            }
            .background(ShellTheme.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            Button {
                onStart(
                    ShellTableSetup(
                        humans: humans,
                        ai: game.ai ? aiCount : 0,
                        difficulty: difficulty,
                        aiDelayMs: aiDelayMs,
                        expeditionDifficulty: expeditionDifficulty
                    )
                )
            } label: {
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
    @AppStorage("shell.playerName") private var name = "我"
    @AppStorage("shell.enhancedGameMotion")
    private var enhancedGameMotion = true
    @State private var link = ""
    @State private var spectator = false
    @State private var presentation: JoinPresentation?
    @State private var recentRooms: [ShellInvitation] = []
    @State private var errorMessage: String?
    @State private var pendingInvitation: ShellInvitation?
    @State private var pendingScannerError: String?

    var body: some View {
        Form {
            Section {
                TextField("邀请链接", text: $link)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
                TextField("你的昵称", text: $name)
                Toggle("以旁观者加入", isOn: $spectator)
            } header: {
                Text("邀请")
            }

            if !recentRooms.isEmpty {
                Section("最近加入") {
                    ForEach(recentRooms) { invitation in
                        Button {
                            link = invitation.inviteLink
                            join(invitation.inviteLink)
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("房间 \(invitation.room)")
                                    Text(
                                        URL(string: invitation.service)?
                                            .host ?? invitation.service
                                    )
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "arrow.up.left")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }

            Section {
                Button {
                    presentation = .scanner
                } label: {
                    Label("扫描邀请二维码", systemImage: "qrcode.viewfinder")
                }
                Button {
                    join(link)
                } label: {
                    Text("加入牌桌").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(ShellTheme.accent)
                .disabled(
                    link.trimmingCharacters(in: .whitespaces).isEmpty ||
                    name.trimmingCharacters(in: .whitespaces).isEmpty
                )
            }
        }
        .navigationTitle("加入房间")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            recentRooms = ShellRecentRooms.load()
        }
        .alert(
            "无法加入",
            isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )
        ) {
            Button("知道了", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
        .fullScreenCover(
            item: $presentation,
            onDismiss: {
                if let pendingInvitation {
                    presentation = .room(pendingInvitation)
                    self.pendingInvitation = nil
                }
                if let pendingScannerError {
                    errorMessage = pendingScannerError
                    self.pendingScannerError = nil
                }
            }
        ) { item in
            switch item {
            case .room(let invitation):
                NavigationStack {
                    WebRoomScreen(invitation: invitation)
                }
            case .scanner:
                NavigationStack {
                    QRScannerView { code in
                        scan(code)
                    }
                    .ignoresSafeArea()
                    .navigationTitle("扫描邀请")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("取消") {
                                presentation = nil
                            }
                        }
                    }
                }
            }
        }
    }

    private func join(_ raw: String) {
        guard let invitation = invitation(from: raw) else {
            errorMessage = "请粘贴完整的房间邀请链接"
            return
        }
        ShellRecentRooms.remember(invitation)
        recentRooms = ShellRecentRooms.load()
        presentation = .room(invitation)
    }

    private func scan(_ raw: String) {
        link = raw
        guard let invitation = invitation(from: raw) else {
            pendingScannerError = "二维码不是有效的房间邀请"
            presentation = nil
            return
        }
        ShellRecentRooms.remember(invitation)
        recentRooms = ShellRecentRooms.load()
        pendingInvitation = invitation
        presentation = nil
    }

    private func invitation(from raw: String) -> ShellInvitation? {
        ShellInvitation.parse(
            raw,
            name: name,
            enhancedMotion: enhancedGameMotion,
            spectator: spectator
        )
    }
}

private enum JoinPresentation: Identifiable {
    case room(ShellInvitation)
    case scanner

    var id: String {
        switch self {
        case .room(let invitation):
            invitation.id
        case .scanner:
            "scanner"
        }
    }
}

struct SettingsView: View {
    @AppStorage("shell.theme") private var theme = "跟随系统"
    @AppStorage("shell.enhancedGameMotion")
    private var enhancedGameMotion = true

    private var version: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString")
            as? String ?? "?"
    }

    private var build: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion")
            as? String ?? "?"
    }

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

                Section("关于") {
                    LabeledContent("版本", value: version)
                    LabeledContent("构建", value: build)
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
