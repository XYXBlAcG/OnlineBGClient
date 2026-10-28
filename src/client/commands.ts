export interface KeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  editing: boolean;
}
export function keyboardBinding(
  input: Pick<KeyInput, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">,
): string {
  return [
    ...(input.ctrlKey ? ["Control"] : []),
    ...(input.metaKey ? ["Meta"] : []),
    ...(input.altKey ? ["Alt"] : []),
    ...(input.shiftKey ? ["Shift"] : []),
    input.key.length === 1 ? input.key.toUpperCase() : input.key,
  ].join("+");
}
export interface AppCommand {
  id: string;
  title: string;
  scope: string;
  binding: string;
  enabled: () => boolean;
  run: () => void;
}
export class CommandRegistry {
  private commands = new Map<string, AppCommand>();
  private entries: AppCommand[] = [];
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish() {
    this.entries = [...this.commands.values()];
    this.listeners.forEach((listener) => listener());
  }
  register(command: AppCommand): () => void {
    if (this.commands.has(command.id)) throw new Error("命令标识重复");
    this.commands.set(command.id, { ...command });
    this.publish();
    return () => {
      this.commands.delete(command.id);
      this.publish();
    };
  }
  list = (): AppCommand[] => this.entries;
  bind(id: string, binding: string): void {
    const command = this.commands.get(id);
    if (!command) throw new Error("命令不存在");
    if (/^(Meta\+Q|Alt\+F4|Control\+W|Meta\+W|Meta\+A|Control\+A)$/i.test(binding))
      throw new Error("该组合键由系统保留");
    if (
      binding &&
      this.list().some(
        (other) =>
          other.id !== id &&
          other.binding === binding &&
          (other.scope === command.scope ||
            other.scope === "global" ||
            command.scope === "global"),
      )
    )
      throw new Error("快捷键冲突");
    this.commands.set(id, { ...command, binding });
    this.publish();
  }
  dispatch(input: KeyInput, scope: string): boolean {
    if (input.editing || input.isComposing || input.repeat) return false;
    const binding = keyboardBinding(input);
    const command = this.list().find(
      (command) =>
        command.binding === binding &&
        (command.scope === scope || command.scope === "global") &&
        command.enabled(),
    );
    if (!command) return false;
    command.run();
    return true;
  }
}
export function formatBinding(
  binding: string,
  platform = typeof navigator === "undefined" ? "" : navigator.platform,
): string {
  const mac = /Mac|iPhone|iPad/.test(platform);
  const names: Record<string, string> = mac
    ? {
        Meta: "⌘",
        Control: "⌃",
        Alt: "⌥",
        Shift: "⇧",
        Enter: "↩",
        Escape: "Esc",
        ArrowUp: "↑",
        ArrowDown: "↓",
        ArrowLeft: "←",
        ArrowRight: "→",
        " ": "Space",
      }
    : { Meta: "Win", Control: "Ctrl", " ": "Space" };
  return binding
    .split("+")
    .map((key) => names[key] ?? key)
    .join(mac ? "" : "+");
}
