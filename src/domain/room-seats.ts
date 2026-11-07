import type { AiSeatDefinition } from "./room-balance";

export interface SeatChoice {
  kind: string;
  humans: number;
  ai: AiSeatDefinition[];
  checkers?: { mode?: string };
}

export function fitSeats<T extends SeatChoice>(value: T): T {
  if (value.kind !== "tq" || value.checkers?.mode !== "siege") return value;
  const humans = Math.min(value.humans, 2);
  const manual = value.ai.filter((seat) => !seat.balance).slice(0, 2 - humans);
  return {
    ...value,
    humans,
    ai: Array.from(
      { length: 2 - humans },
      (_, index) =>
        manual[index] ?? {
          difficulty: "normal" as const,
          name: "",
        },
    ),
  };
}
