import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { configSchema } from "../src/domain/protocol";
import { fitSeats } from "../src/domain/room-seats";

it("creates a two-player siege with asymmetric objectives and tower cells", () => {
  const engine = new GameEngine();
  const state = engine.create("tq", 2, "siege", false, {
    checkers: { mode: "siege" },
  });
  if (state.kind !== "tq") throw new Error("wrong game");
  expect(state.view.special).toMatchObject({
    mode: "siege",
    maxRounds: 18,
    settledGoal: 4,
    winner: null,
  });
  expect(state.view.special?.towers).toHaveLength(3);
  expect(() =>
    configSchema.parse({
      kind: "tq",
      humans: 3,
      ai: [],
      team: false,
      training: false,
      checkers: { mode: "siege" },
    }),
  ).toThrow("2 人");
});

it("fits siege rooms to two seats without changing classic checkers", () => {
  const seat = { difficulty: "normal" as const, name: "" };
  expect(
    fitSeats({
      kind: "tq",
      humans: 1,
      ai: [seat, seat],
      checkers: { mode: "siege" },
    }),
  ).toMatchObject({ humans: 1, ai: [seat] });
  expect(
    fitSeats({
      kind: "tq",
      humans: 1,
      ai: [seat, seat],
      checkers: { mode: "classic" },
    }),
  ).toMatchObject({ humans: 1, ai: [seat, seat] });
});

it("recognizes both asymmetric victory paths", () => {
  const engine = new GameEngine();
  const state = engine.create("tq", 2, "siege-win", false, {
    checkers: { mode: "siege" },
  });
  if (state.kind !== "tq") throw new Error("wrong game");
  const targets = engine.checkers.targets(state.view, 0),
    outside = Array.from({ length: 121 }, (_, cell) => cell).filter(
      (cell) => !targets.includes(cell),
    );
  state.view.playerPieces[0] = [
    ...targets.slice(0, 4),
    ...outside.slice(0, 6),
  ];
  state.view.pieces = state.view.playerPieces.flat();
  expect(engine.checkers.siegeWinner(state.view)).toBe(0);
  state.view.playerPieces[0] = [
    ...targets.slice(0, 3),
    ...outside.slice(0, 7),
  ];
  state.view.playerPieces[1] = [
    ...state.view.special!.towers,
    ...outside.slice(20, 27),
  ];
  state.view.pieces = state.view.playerPieces.flat();
  expect(engine.checkers.siegeWinner(state.view)).toBe(1);
});

it("awards an extra turn after a multi-jump route", () => {
  const engine = new GameEngine();
  let state = engine.create("tq", 2, "jump:setup", false, {
      checkers: { mode: "siege" },
    }),
    actor = state.kind === "tq" ? state.view.waitFor : 0;
  for (let step = 0; step < 160; step++) {
    if (state.kind !== "tq") throw new Error("wrong game");
    actor = state.view.waitFor;
    const candidates = engine.checkers.candidates(state.view, actor),
      long = candidates.find(
        (candidate) =>
          candidate.action.type === "tq-move" &&
          candidate.action.route.length >= 3,
      );
    if (long?.action.type === "tq-move") {
      const after = engine.apply(state, actor, long.action, `jump:${step}`);
      if (after.kind !== "tq") throw new Error("wrong game");
      expect(after.view.special?.starAwards[actor]).toBe(1);
      expect(after.view.waitFor).toBe(actor);
      return;
    }
    const action = candidates[0]?.action;
    if (!action) break;
    state = engine.apply(state, actor, action, `jump-move:${step}`);
  }
  throw new Error("no long jump route found");
});
