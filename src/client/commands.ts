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
  register(command: AppCommand): () => void {
    if (this.commands.has(command.id)) throw new Error("命令标识重复");
    this.commands.set(command.id, command);
    return () => {
      this.commands.delete(command.id);
    };
  }
  list(): AppCommand[] {
    return [...this.commands.values()];
  }
  bind(id: string, binding: string): void {
    const command = this.commands.get(id);
    if (!command) throw new Error("命令不存在");
    if (/^(Meta\+Q|Alt\+F4|Control\+W|Meta\+W)$/i.test(binding))
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
    command.binding = binding;
  }
  dispatch(input: KeyInput, scope: string): boolean {
    if (input.editing || input.isComposing || input.repeat) return false;
    const binding = [
      ...(input.ctrlKey ? ["Control"] : []),
      ...(input.metaKey ? ["Meta"] : []),
      ...(input.altKey ? ["Alt"] : []),
      ...(input.shiftKey ? ["Shift"] : []),
      input.key.length === 1 ? input.key.toUpperCase() : input.key,
    ].join("+");
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
