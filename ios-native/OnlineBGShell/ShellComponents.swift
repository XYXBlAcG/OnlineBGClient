import SwiftUI

struct GameCoverView: View {
    let game: ShellGame
    var size: CGFloat = 72

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.24, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: game.colors,
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Image(systemName: game.symbol)
                .font(.system(size: size * 0.38, weight: .semibold))
                .foregroundStyle(Color(hex: 0x594878).opacity(0.82))
        }
        .frame(width: size, height: size)
    }
}

struct GameCardView: View {
    let game: ShellGame
    let selected: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                LinearGradient(
                    colors: game.colors,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                Image(systemName: game.symbol)
                    .font(.system(size: 34, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x594878).opacity(0.82))
            }
            .frame(height: 88)
            .frame(maxWidth: .infinity)

            VStack(alignment: .leading, spacing: 4) {
                Text(game.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Text(game.subtitle)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .frame(minHeight: 30, alignment: .topLeading)
                Text(game.players)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(ShellTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(selected ? ShellTheme.accent : .clear, lineWidth: 2)
        }
    }
}

struct CategoryChip: View {
    let title: String
    let active: Bool

    var body: some View {
        Text(title)
            .font(.footnote.weight(.semibold))
            .foregroundStyle(active ? Color.white : Color.secondary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(active ? ShellTheme.accent : ShellTheme.field, in: Capsule())
    }
}

struct PlayerAvatar: View {
    let label: String
    let color: Color

    var body: some View {
        Text(label)
            .font(.footnote.weight(.bold))
            .foregroundStyle(.white)
            .frame(width: 38, height: 38)
            .background(color, in: Circle())
            .overlay {
                Circle().strokeBorder(Color.white.opacity(0.18), lineWidth: 3)
            }
    }
}

struct ShellSectionHeader: View {
    let title: String

    var body: some View {
        Text(title.uppercased())
            .font(.caption2.weight(.bold))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 4)
    }
}
