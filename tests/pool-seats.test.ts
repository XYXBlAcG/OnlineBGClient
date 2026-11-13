import { expect, it } from "vitest";
import { fitSeats } from "../src/domain/room-seats";

const ai = (count: number) =>
  Array.from({ length: count }, () => ({
    difficulty: "normal" as const,
    name: "",
  }));

it("caps eight-ball and nine-ball lobbies at two seats", () => {
  for (const mode of ["eight-ball", "nine-ball"]) {
    expect(
      fitSeats({ kind: "pool", humans: 3, ai: ai(2), pool: { mode } }),
    ).toMatchObject({ humans: 2, ai: [] });
    expect(
      fitSeats({ kind: "pool", humans: 1, ai: [], pool: { mode } }),
    ).toMatchObject({ humans: 1, ai: [{ difficulty: "normal" }] });
    const fitted = fitSeats({
      kind: "pool",
      humans: 0,
      ai: ai(3),
      pool: { mode },
    });
    expect(fitted.humans + fitted.ai.length).toBe(2);
  }
});

it("keeps party tables between three and four seats", () => {
  const oneHuman = fitSeats({
    kind: "pool",
    humans: 1,
    ai: [],
    pool: { mode: "party" },
  });
  expect(oneHuman.humans + oneHuman.ai.length).toBe(3);
  const twoHumans = fitSeats({
    kind: "pool",
    humans: 2,
    ai: ai(3),
    pool: { mode: "party" },
  });
  expect(twoHumans.humans + twoHumans.ai.length).toBe(4);
  const fourHumans = fitSeats({
    kind: "pool",
    humans: 4,
    ai: ai(1),
    pool: { mode: "party" },
  });
  expect(fourHumans.humans + fourHumans.ai.length).toBe(4);
});
