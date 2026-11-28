import SwiftUI

struct ShellMenuOption<Value: Hashable>: Identifiable {
    let value: Value
    let title: String
    var id: Value { value }
}

struct ShellMenuPicker<Value: Hashable>: View {
    let title: String
    @Binding var selection: Value
    let options: [ShellMenuOption<Value>]

    init(_ title: String, selection: Binding<Value>, options: [ShellMenuOption<Value>]) {
        self.title = title
        _selection = selection
        self.options = options
    }

    var body: some View {
        Menu {
            Picker(title, selection: $selection) {
                ForEach(options) { option in
                    Text(option.title).tag(option.value)
                }
            }
        } label: {
            HStack(spacing: 8) {
                Text(options.first { $0.value == selection }?.title ?? title)
                    .fontWeight(.medium)
                    .foregroundStyle(ShellTheme.text)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(ShellTheme.accent)
            }
            .frame(minWidth: 104, minHeight: 44, alignment: .trailing)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .accessibilityValue(options.first { $0.value == selection }?.title ?? "")
    }
}

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
