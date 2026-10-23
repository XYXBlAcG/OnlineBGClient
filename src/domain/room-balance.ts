export interface AiSeatDefinition {
  difficulty: "easy" | "normal" | "hard";
  name: string;
  balance?: boolean;
}
export function balanceSeats<
  T extends { kind: string; humans: number; ai: AiSeatDefinition[] },
>(value: T): T {
  const supplemental = value.ai.find((s) => s.balance),
    manual = value.ai.filter((s) => !s.balance);
  const ai =
    value.kind === "graphwar" && (value.humans + manual.length) % 2 === 1
      ? [
          ...manual,
          supplemental ?? {
            difficulty: "normal" as const,
            name: "平衡补位",
            balance: true,
          },
        ]
      : manual;
  return { ...value, ai };
}
