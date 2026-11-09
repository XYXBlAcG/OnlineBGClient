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
                .foregroundStyle(ShellTheme.text.opacity(0.72))
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
                    .foregroundStyle(ShellTheme.text.opacity(0.72))
            }
            .frame(height: 88)
            .frame(maxWidth: .infinity)

            VStack(alignment: .leading, spacing: 4) {
                Text(game.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(ShellTheme.text)
                    .lineLimit(1)
                Text(game.subtitle)
                    .font(.caption2)
                    .foregroundStyle(ShellTheme.muted)
                    .lineLimit(2)
                    .frame(minHeight: 30, alignment: .topLeading)
                Text(game.players)
                    .font(.caption2)
                    .foregroundStyle(ShellTheme.muted.opacity(0.72))
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
            .foregroundStyle(active ? ShellTheme.accentText : ShellTheme.muted)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(active ? ShellTheme.accent : ShellTheme.field, in: Capsule())
    }
}
