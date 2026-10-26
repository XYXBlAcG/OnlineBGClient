import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { AppCommand, CommandRegistry } from "./commands";
interface Environment {
  registry: CommandRegistry;
  bindings: Record<string, string>;
}
const GameCommandContext = createContext<Environment | null>(null);
export function GameCommandProvider({
  registry,
  bindings,
  children,
}: Environment & { children: ReactNode }) {
  const value = useMemo(() => ({ registry, bindings }), [registry, bindings]);
  return (
    <GameCommandContext.Provider value={value}>
      {children}
    </GameCommandContext.Provider>
  );
}
export function useGameCommands(commands: AppCommand[]): void {
  const environment = useContext(GameCommandContext),
    latest = useRef(commands);
  latest.current = commands;
  useEffect(() => {
    if (!environment) return;
    const dispose = latest.current.map((command) =>
      environment.registry.register({
        ...command,
        binding: environment.bindings[command.id] ?? command.binding,
        enabled: () =>
          latest.current.find((c) => c.id === command.id)?.enabled() ?? false,
        run: () => latest.current.find((c) => c.id === command.id)?.run(),
      }),
    );
    return () => dispose.forEach((stop) => stop());
  }, [environment]);
}
