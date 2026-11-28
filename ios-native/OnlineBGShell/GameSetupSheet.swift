import SwiftUI

struct GameSetupSheet: View {
    @Environment(\.dismiss) private var dismiss
    let game: ShellGame
    let onStart: (ShellTableSetup) -> Void
    @State private var aiCount: Int
    @State private var difficulty = "normal"
    @State private var aiDelayMs = 1500
    @State private var selections: [String: String]
    @State private var setupError: String?

    init(game: ShellGame, onStart: @escaping (ShellTableSetup) -> Void) {
        self.game = game
        self.onStart = onStart
        _selections = State(initialValue: game.selections)
        _aiCount = State(
            initialValue: game.ai ? max(0, game.seats(game.selections).lowerBound - 1) : 0
        )
    }

    private var humans: Int {
        game.ai ? 1 : game.seats(selections).lowerBound
    }

    private var aiRange: ClosedRange<Int> {
        let seats = game.seats(selections)
        let minimum = game.ai ? max(0, seats.lowerBound - humans) : 0
        let maximum = game.ai ? max(0, seats.upperBound - humans) : 0
        return minimum...maximum
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 12) {
                    GameCoverView(game: game, size: 58)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(game.name)
                            .font(.title3.weight(.semibold))
                        Text(game.subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 8)
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 44, height: 44)
                            .background(ShellTheme.field, in: Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("关闭开局设置")
                }
                .fixedSize(horizontal: false, vertical: true)

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
                        }
                        .padding(.horizontal, 14)
                        .frame(minHeight: 52)
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
                            ShellMenuPicker("AI 响应", selection: $aiDelayMs, options: [
                                .init(value: 500, title: "0.5 秒"),
                                .init(value: 1000, title: "1 秒"),
                                .init(value: 1500, title: "1.5 秒"),
                                .init(value: 2000, title: "2 秒"),
                                .init(value: 3000, title: "3 秒"),
                            ])
                        }
                        .font(.subheadline)
                        .padding(.horizontal, 14)
                        .frame(height: 44)
                    } else {
                        settingsRow("操作", "同屏轮流")
                    }
                    ForEach(game.fields.filter { $0.isVisible(selections) }) { field in
                        GameSetupFieldView(field: field, selections: $selections)
                    }
                    settingsRow("总人数", "\(humans + (game.ai ? aiCount : 0)) 人")
                }
                .background(ShellTheme.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .padding(.horizontal, 20)
            .padding(.top, 28)
            .padding(.bottom, 16)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Button {
                do {
                    let options = try game.optionsJSON(selections)
                    onStart(
                        ShellTableSetup(
                            humans: humans,
                            ai: game.ai ? aiCount : 0,
                            difficulty: difficulty,
                            aiDelayMs: aiDelayMs,
                            gameOptions: options
                        )
                    )
                } catch {
                    setupError = "请检查玩法选项后重试。"
                }
            } label: {
                Text("开始本地对局")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .disabled(game.fields.contains { field in
                field.isVisible(selections) && field.count.map { count in
                    selections[field.key, default: ""].split(separator: ",").count != count
                } == true
            })
            .buttonStyle(.borderedProminent)
            .tint(ShellTheme.accent)
            .controlSize(.large)
            .padding(20)
            .background(ShellTheme.canvas)
        }
        .background(ShellTheme.canvas)
        .onChange(of: selections) {
            aiCount = min(max(aiCount, aiRange.lowerBound), aiRange.upperBound)
        }
        .alert("无法开始对局", isPresented: Binding(
            get: { setupError != nil },
            set: { if !$0 { setupError = nil } }
        )) {
            Button("好", role: .cancel) { setupError = nil }
        } message: {
            Text(setupError ?? "")
        }
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

