import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";

it("plays original poison rules to completion and hides other hands", () => {
  const engine = new GameEngine();
  for (const players of [2, 3, 5, 7]) {
    let state = engine.create("dy", players, `poison:${players}`);
    for (let turn = 0; turn < 100 && !engine.finished(state); turn++) {
      const actor = engine.actors(state)[0];
      const view = engine.project(state, actor);
      if (view.kind !== "dy" || state.kind !== "dy")
        throw new Error("wrong game");
      expect(view.view.players[actor]).toEqual(state.view.players[actor]);
      view.view.players.forEach((hand, index) => {
        if (index !== actor) expect(hand.every((card) => card < 0)).toBe(true);
      });
      const moves = engine.candidates(view, actor);
      expect(moves.length).toBeGreaterThan(0);
      expect(() =>
        engine.apply(state, (actor + 1) % players, moves[0].action, "invalid"),
      ).toThrow();
      state = engine.apply(state, actor, moves[0].action, `move:${turn}`);
    }
    expect(engine.finished(state)).toBe(true);
  }
});
it("collects the old pot above thirteen and counts poison twice", () => {
  const engine = new GameEngine();
  const state = engine.create("dy", 2, "overflow");
  if (state.kind !== "dy") throw new Error("wrong game");
  state.view.state = 0;
  state.view.pots = [[11, 12], [], []];
  state.view.players = [[0, 42], [14]];
  const next = engine.apply(
    state,
    0,
    { type: "dy-play", card: 0, pot: 0 },
    "take",
  );
  if (next.kind !== "dy") throw new Error("wrong game");
  expect(next.view.pots[0]).toEqual([0]);
  expect(next.view.eats[0]).toEqual([11, 12]);
});

it("makes legal AI choices through a complete poison match", async () => {
  const { Strategy } = await import("../src/domain/strategy");
  const engine = new GameEngine(),
    strategy = new Strategy();
  let state = engine.create("dy", 5, "ai-match");
  for (let turn = 0; turn < 100 && !engine.finished(state); turn++) {
    const actor = engine.actors(state)[0],
      decision = strategy.decide(
        engine.project(state, actor),
        actor,
        turn % 12 === 0 ? "normal" : "easy",
        `ai:${turn}`,
      );
    state = engine.apply(state, actor, decision.chosen, `move:${turn}`);
  }
  expect(engine.finished(state)).toBe(true);
});
