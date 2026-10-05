import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Strategies } from "../src/domain/strategies";
it("dispatches dedicated economic strategies with legal reproducible decisions", () => {
  const engine = new GameEngine(),
    policies = new Strategies();
  for (const kind of ["ktd", "ccbs"] as const) {
    const state = engine.create(kind, 3, "economy"),
      actor = engine.actors(state)[0],
      view = engine.project(state, actor);
    const decision = policies.decide(view, actor, "normal", "fixed");
    expect(decision.chosen.type).toBe(`${kind}-action`);
    expect(() =>
      engine.apply(state, actor, decision.chosen, "apply"),
    ).not.toThrow();
    expect(
      policies.decide(view, actor, "normal", "fixed", decision.version),
    ).toEqual(decision);
  }
});
it("finishes seeded economic self play across player counts without illegal actions", () => {
  const engine = new GameEngine(),
    policies = new Strategies();
  for (const kind of ["ktd", "ccbs"] as const)
    for (const players of kind === "ktd" ? [2, 3, 5, 8] : [2, 3, 4]) {
      let state = engine.create(kind, players, `self:${kind}:${players}`),
        steps = 0;
      for (; steps < 3000 && !engine.finished(state); steps++) {
        const actor = engine.actors(state)[0];
        expect(actor).toBeDefined();
        const observation = engine.project(state, actor);
        const result = policies.select(kind).complete(
          {
            observation,
            actor,
            difficulty: "easy",
            seed: `step:${steps}`,
            audit: false,
          },
          policies.select(kind).score(
            {
              observation,
              actor,
              difficulty: "easy",
              seed: `step:${steps}`,
              audit: false,
            },
            policies.select(kind).candidates({
              observation,
              actor,
              difficulty: "easy",
              seed: `step:${steps}`,
              audit: false,
            }),
          ),
          [],
        );
        expect(result.audit).toBeUndefined();
        state = engine.apply(state, actor, result.chosen, `play:${steps}`);
      }
      console.log(
        kind,
        players,
        "steps",
        steps,
        "finished",
        engine.finished(state),
      );
      expect(engine.finished(state)).toBe(true);
    }
}, 120000);
it("constrains hidden Catan resources and remembers only visible Splendor cards", () => {
  const engine = new GameEngine(),
    policies = new Strategies();
  let state = engine.create("ktd", 3, "hidden");
  if (state.kind !== "ktd") throw new Error("game");
  state.view.playerData[0].resources = [1, 2, 0, 0, 0];
  state.view.playerData[1].resources = [2, 1, 0, 0, 0];
  state.view.playerData[2].resources = [0, 2, 1, 0, 0];
  state.view.bankData.resources = [16, 14, 18, 19, 19];
  const observation = engine.project(state, 0),
    sampled = policies.select("ktd").sample(observation, 0, "same");
  if (sampled.kind !== "ktd") throw new Error("game");
  for (let r = 0; r < 5; r++)
    expect(
      sampled.view.playerData.reduce((sum, p) => sum + p.resources[r], 0) +
        sampled.view.bankData.resources[r],
    ).toBe(19);
  state.view.playerData[1].resources = [0, 2, 1, 0, 0];
  state.view.playerData[2].resources = [2, 1, 0, 0, 0];
  expect(engine.project(state, 0)).toEqual(observation);
  expect(
    policies.select("ktd").sample(engine.project(state, 0), 0, "same"),
  ).toEqual(sampled);
});
it("conditions beliefs on a pending public trade and does not cancel before replies", () => {
  const engine = new GameEngine(),
    policies = new Strategies();
  let state = engine.create("ktd", 3, "trade-belief");
  for (let step = 0; step < 12; step++) {
    const actor = engine.actors(state)[0];
    state = engine.apply(
      state,
      actor,
      engine.candidates(state, actor)[0].action,
      `setup:${step}`,
    );
  }
  if (state.kind !== "ktd") throw new Error("game");
  state.view.lastDice = 1;
  state.view.lastOp = { type: 0, playerId: 0 };
  state.view.playerData.forEach((p) => (p.resources = [0, 0, 0, 0, 0]));
  state.view.playerData[0].resources = [3, 0, 0, 0, 0];
  state.view.playerData[1].resources = [0, 0, 0, 1, 0];
  state.view.bankData.resources = [16, 19, 19, 18, 19];
  state = engine.apply(
    state,
    0,
    {
      type: "ktd-action",
      move: {
        kind: "trade",
        give: [1, 0, 0, 0, 0],
        take: [0, 0, 0, 1, 0],
        targets: [1, 2],
      },
    },
    "offer",
  );
  expect(engine.actors(state)).toEqual([1, 2]);
  const observation = engine.project(state, 1);
  for (let seed = 0; seed < 10; seed++) {
    const sampled = policies
      .select("ktd")
      .sample(observation, 1, `belief:${seed}`);
    if (sampled.kind !== "ktd") throw new Error("game");
    expect(sampled.view.playerData[0].resources[0]).toBeGreaterThanOrEqual(1);
    expect(() =>
      engine.apply(
        sampled,
        1,
        { type: "ktd-action", move: { kind: "respond", accept: true } },
        "accept",
      ),
    ).not.toThrow();
  }
  const disabled = {
    observation,
    actor: 1,
    difficulty: "easy" as const,
    seed: "off",
    audit: false,
    tradeEnabled: false,
  };
  expect(
    policies
      .select("ktd")
      .candidates(disabled)
      .some(
        (c) => c.action.type === "ktd-action" && c.action.move.kind === "trade",
      ),
  ).toBe(false);
});
