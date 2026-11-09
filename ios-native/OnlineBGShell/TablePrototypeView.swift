import SwiftUI

struct TablePrototypeView: View {
    let game: ShellGame
    @State private var selected = Set<String>()

    private var hand: [ShellCard] {
        game.id == "ddz" ? shellDdzHand : shellUnoHand
    }

    private var style: ShellHandStyle {
        game.id == "ddz" ? .ddz : .uno
    }

    private var supportsNativeHand: Bool {
        game.id == "uno" || game.id == "ddz"
    }

    var body: some View {
        VStack(spacing: 0) {
            tableSurface
            if supportsNativeHand {
                handTray
            }
        }
        .background(ShellTheme.canvas)
        .navigationTitle(game.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .sensoryFeedback(.selection, trigger: selected)
    }

    private var tableSurface: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [ShellTheme.feltTop, ShellTheme.feltBottom],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

            VStack {
                HStack(spacing: 24) {
                    PlayerAvatar(label: "阿", color: Color(hex: 0x3d6b8c))
                    PlayerAvatar(label: "林", color: Color(hex: 0x3d7a58))
                    PlayerAvatar(label: "K", color: Color(hex: 0x8a6a2f))
                }
                .padding(.top, 18)

                Spacer()

                discardPile

                Spacer()

                Label("轮到你了", systemImage: "circle.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.92))
                    .labelStyle(TurnLabelStyle())
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(.black.opacity(0.22), in: Capsule())
                    .padding(.bottom, 16)
            }
        }
        .overlay {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .strokeBorder(.white.opacity(0.12), lineWidth: 1)
                .padding(14)
        }
        .padding(.horizontal, 12)
        .padding(.top, 8)
        .padding(.bottom, 10)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var discardPile: some View {
        if game.id == "uno" {
            HStack(spacing: 2) {
                DiscardCard(label: "7", color: Color(hex: 0xe9474f), rotation: -4)
                DiscardCard(label: "4", color: Color(hex: 0x2a6ed4), rotation: 3)
                DiscardCard(label: "9", color: Color(hex: 0x2b9c68), rotation: -1)
            }
        } else if game.id == "ddz" {
            HStack(spacing: 4) {
                DiscardCard(label: "♠ 8", color: .white, ink: Color(hex: 0x172330), rotation: -3)
                DiscardCard(label: "♠ 8", color: .white, ink: Color(hex: 0x172330), rotation: 3)
            }
        } else {
            GameCoverView(game: game, size: 108)
                .shadow(color: .black.opacity(0.24), radius: 16, y: 8)
        }
    }

    private var handTray: some View {
        VStack(spacing: 8) {
            HStack {
                Text("\(game.name) · 你的手牌")
                Spacer()
                if !selected.isEmpty {
                    Text("已选 \(selected.count) 张")
                }
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 2)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 6) {
                    ForEach(hand) { card in
                        HandCardButton(
                            card: card,
                            style: style,
                            selected: selected.contains(card.id)
                        ) {
                            toggle(card)
                        }
                    }
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 2)
            }

            HStack(spacing: 8) {
                Button {
                    withAnimation(.snappy) { selected.removeAll() }
                } label: {
                    Text("不出").frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)

                Button {
                    withAnimation(.snappy) { selected.removeAll() }
                } label: {
                    Text("出牌").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(ShellTheme.accent)
                .controlSize(.large)
                .disabled(selected.isEmpty)
            }
        }
        .padding(.horizontal, 12)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(ShellTheme.surface)
    }

    private func toggle(_ card: ShellCard) {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.72)) {
            if selected.contains(card.id) {
                selected.remove(card.id)
            } else {
                selected.insert(card.id)
            }
        }
    }
}

private struct TurnLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 7) {
            configuration.icon
                .font(.system(size: 7))
                .foregroundStyle(Color(hex: 0x7ff0b6))
            configuration.title
        }
    }
}

private struct DiscardCard: View {
    let label: String
    let color: Color
    var ink: Color = .white
    let rotation: Double

    var body: some View {
        Text(label)
            .font(.title3.weight(.heavy))
            .foregroundStyle(ink)
            .frame(width: 54, height: 78)
            .background(color, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .shadow(color: .black.opacity(0.25), radius: 9, y: 5)
            .rotationEffect(.degrees(rotation))
    }
}

private struct HandCardButton: View {
    let card: ShellCard
    let style: ShellHandStyle
    let selected: Bool
    let onTap: () -> Void

    private var width: CGFloat { style == .uno ? 54 : 44 }
    private var height: CGFloat { style == .uno ? 82 : 66 }

    var body: some View {
        Button(action: onTap) {
            ZStack {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(background)
                if style == .uno {
                    if card.tone == .wild {
                        Text(card.label)
                            .font(.title3.weight(.heavy))
                            .foregroundStyle(.white)
                    } else {
                        Ellipse()
                            .fill(.white.opacity(0.9))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 12)
                        Text(card.label)
                            .font(.title3.weight(.heavy))
                            .foregroundStyle(ink)
                    }
                } else {
                    VStack(spacing: 1) {
                        if let suit = card.suit {
                            Text(suit)
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(ink)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.leading, 5)
                        }
                        Spacer(minLength: 0)
                        Text(card.label)
                            .font(card.label == "JOKER" ? .caption2.weight(.heavy) : .title3.weight(.bold))
                            .foregroundStyle(ink)
                        Spacer(minLength: 0)
                    }
                    .padding(.vertical, 5)
                }
            }
            .frame(width: width, height: height)
            .overlay {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .strokeBorder(.black.opacity(0.08), lineWidth: 0.5)
            }
            .shadow(color: .black.opacity(selected ? 0.24 : 0.12), radius: selected ? 10 : 4, y: selected ? 8 : 2)
            .offset(y: selected ? -12 : 0)
            .scaleEffect(selected ? 1.04 : 1)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(card.suit ?? "")\(card.label)")
    }

    private var background: AnyShapeStyle {
        if style == .ddz {
            return AnyShapeStyle(Color.white)
        }
        switch card.tone {
        case .red:
            return AnyShapeStyle(Color(hex: 0xe9474f))
        case .blue:
            return AnyShapeStyle(Color(hex: 0x2a6ed4))
        case .green:
            return AnyShapeStyle(Color(hex: 0x2b9c68))
        case .yellow:
            return AnyShapeStyle(Color(hex: 0xf2c435))
        case .wild:
            return AnyShapeStyle(
                AngularGradient(
                    colors: [Color(hex: 0xe9474f), Color(hex: 0x2a6ed4), Color(hex: 0x2b9c68), Color(hex: 0xf2c435)],
                    center: .center
                )
            )
        case .black:
            return AnyShapeStyle(Color(hex: 0x172330))
        }
    }

    private var ink: Color {
        if style == .ddz {
            return card.tone == .red ? Color(hex: 0xd93b3b) : Color(hex: 0x172330)
        }
        return card.tone == .yellow ? Color(hex: 0x3a2b07) : .white
    }
}

#Preview("UNO Table") {
    NavigationStack {
        TablePrototypeView(game: shellGames.first { $0.id == "uno" }!)
    }
}

#Preview("DDZ Table") {
    NavigationStack {
        TablePrototypeView(game: shellGames.first { $0.id == "ddz" }!)
    }
}
