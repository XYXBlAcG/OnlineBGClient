import SwiftUI

struct GameSetupFieldView: View {
    let field: ShellSetupField
    @Binding var selections: [String: String]

    private var selection: Binding<String> {
        Binding(
            get: { selections[field.key, default: ""] },
            set: { selections[field.key] = $0 }
        )
    }

    var body: some View {
        if field.format == .strings {
            let selected = selections[field.key, default: ""].split(separator: ",").map(String.init)
            DisclosureGroup("\(field.title) · \(selected.count)/\(field.count ?? 0)") {
                ForEach(field.choices, id: \.value) { choice in
                    Toggle(isOn: Binding(
                        get: { selected.contains(choice.value) },
                        set: { checked in
                            selections[field.key] = (checked
                                ? selected + [choice.value]
                                : selected.filter { $0 != choice.value }).joined(separator: ",")
                        }
                    )) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(choice.label)
                            if let detail = choice.detail {
                                Text(detail)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .disabled(selected.count >= (field.count ?? 0) && !selected.contains(choice.value))
                    .padding(.vertical, 6)
                }
            }
            .padding(14)
        } else if field.format == .boolean {
            Toggle(field.title, isOn: Binding(
                get: { selection.wrappedValue == "true" },
                set: { selection.wrappedValue = String($0) }
            ))
            .font(.subheadline)
            .padding(.horizontal, 14)
            .frame(minHeight: 52)
        } else {
            HStack {
                Text(field.title)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 8)
                ShellMenuPicker(field.title, selection: selection, options: field.choices.map {
                    ShellMenuOption(value: $0.value, title: $0.label)
                })
            }
            .font(.subheadline)
            .padding(.horizontal, 14)
            .frame(minHeight: 52)
        }
    }
}
