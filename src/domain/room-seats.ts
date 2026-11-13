import type { AiSeatDefinition } from "./room-balance";

export interface SeatChoice {
  kind: string;
  humans: number;
  ai: AiSeatDefinition[];
  checkers?: { mode?: string };
  pool?: { mode?: string };
}

export function fitSeats<T extends SeatChoice>(value: T): T {
  if (value.kind === "pool") {
    const party = value.pool?.mode === "party",
      capacity = party ? 4 : 2,
      humans = Math.min(value.humans, capacity),
      manual = value.ai
        .filter((seat) => !seat.balance)
        .slice(0, capacity - humans),
      minimum = party ? 3 : 2,
      count = Math.min(
        capacity - humans,
        Math.max(minimum - humans, manual.length),
      );
    return {
      ...value,
      humans,
      ai: Array.from({ length: count }, (_, index) =>
        manual[index]
          ? { ...manual[index], balance: undefined }
          : { difficulty: "normal" as const, name: "" },
      ),
    };
  }
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
