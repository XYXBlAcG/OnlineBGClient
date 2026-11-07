import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { configSchema } from "../src/domain/protocol";
import { Strategy } from "../src/domain/strategy";

it("creates 2v2 and 3v3 UNO team states with alternating teams", () => {
  const engine = new GameEngine();
  for (const players of [4, 6]) {
    const state = engine.create("uno", players, `team:${players}`, true);
    if (state.kind !== "uno") throw new Error("wrong game");
    expect(state.view.teamMode).toBe(true);
    expect(state.view.teams).toEqual(
      Array.from({ length: players }, (_, index) => index % 2),
    );
  }
  expect(() =>
    configSchema.parse({
      kind: "uno",
      humans: 2,
      ai: [{ difficulty: "normal", name: "" }],
      team: true,
      training: false,
    }),
  ).toThrow("4 人或 6 人");
});

it("reveals teammate hands but keeps opponents hidden", () => {
  const engine = new GameEngine();
  const state = engine.create("uno", 4, "visibility", true);
  if (state.kind !== "uno") throw new Error("wrong game");
  const view = engine.project(state, 0);
  if (view.kind !== "uno") throw new Error("wrong projection");
  expect(view.view.playerCards[0].every((card) => card >= 0)).toBe(true);
  expect(view.view.playerCards[2].every((card) => card >= 0)).toBe(true);
  expect(view.view.playerCards[1].every((card) => card < 0)).toBe(true);
  expect(view.view.playerCards[3].every((card) => card < 0)).toBe(true);
});

it("ends only when every member of a team has emptied their hand", () => {
  const engine = new GameEngine();
  const state = engine.create("uno", 4, "finish", true);
  if (state.kind !== "uno") throw new Error("wrong game");
  state.view.playerFinish = [1, 0, 0, 0];
  expect(engine.finished(state)).toBe(false);
  state.view.playerFinish = [1, 0, 1, 0];
  expect(engine.finished(state)).toBe(true);
  expect(engine.actors(state)).toEqual([]);
});

it("completes a real four-player team game with the shared UNO strategy", () => {
  const engine = new GameEngine(),
    strategy = new Strategy();
  let state = engine.create("uno", 4, "team-complete", true);
  for (let turn = 0; turn < 1200 && !engine.finished(state); turn++) {
    const actor = engine.actors(state)[0];
    if (actor === undefined) break;
    const decision = strategy.decide(
      engine.project(state, actor),
      actor,
      "easy",
      `team:${turn}`,
    );
    state = engine.apply(state, actor, decision.chosen, `move:${turn}`);
  }
  expect(engine.finished(state)).toBe(true);
  if (state.kind !== "uno") throw new Error("wrong game");
  expect([0, 1]).toContain(state.view.teamWinner);
}, 30000);
