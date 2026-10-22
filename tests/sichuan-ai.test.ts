import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Strategies } from "../src/domain/strategies";
import { MahjongStrategy } from "../src/domain/mahjong/strategy";
import type { GameState } from "../src/domain/types";
it("plays legal complete AI games with visible information and reproducible decisions", () => {
  for (const seed of ["a", "b"]) {
    const engine = new GameEngine(),
      strategy = new MahjongStrategy();
    let state = engine.create("scmj", 4, seed);
    for (let n = 0; n < 650 && !engine.finished(state); n++) {
      const actor = engine.actors(state)[0],
        observation = engine.project(state, actor);
      const req = {
        actor,
        observation,
        difficulty: "normal" as const,
        seed: `${seed}-${n}`,
        audit: false,
      };
      const candidates = strategy.score(req, strategy.candidates(req));
      const result = strategy.complete(req, candidates, []);
      expect(result.audit).toBeUndefined();
      state = engine.apply(state, actor, result.chosen, `${seed}-${n}`);
    }
    expect(engine.finished(state)).toBe(true);
    if (state.kind !== "scmj") throw new Error();
    expect(state.view.scores.reduce((a, b) => a + b, 0)).toBe(0);
  }
});
it("samples only unknown tiles and respects visible hand and wall cardinality", () => {
  const engine = new GameEngine(),
    strategy = new MahjongStrategy();
  let state = engine.create("scmj", 4, "sample");
  for (let i = 0; i < 8; i++) {
    const actor = engine.actors(state)[0];
    state = engine.apply(
      state,
      actor,
      engine.candidates(state, actor)[0].action,
      `p-${i}`,
    );
  }
  const view = engine.project(state, 0);
  if (view.kind !== "scmj") throw new Error();
  for (let i = 0; i < 20; i++) {
    const sampled = strategy.sample(view, 0, `s-${i}`);
    expect(sampled.view.hands[0]).toEqual(view.view.hands[0]);
    expect(sampled.view.wall.length).toBe(view.view.wall.length);
    const all = [
      ...sampled.view.hands.flat(),
      ...sampled.view.wall,
      ...sampled.view.rivers.flat(),
      ...sampled.view.melds.flat().flatMap((m) => m.tiles),
    ];
    expect(all.length).toBe(108);
    expect(new Set(all).size).toBe(108);
  }
  const actor = engine.actors(state)[0];
  expect(
    new Strategies().decide(
      engine.project(state, actor),
      actor,
      "hard",
      "registered",
    ).chosen.type,
  ).toBe("scmj-action");
});
import { Worker } from "node:worker_threads";
import { ComputePool, SearchCoordinator } from "../src/domain/compute";
it("runs hard Mahjong in real CPU workers and reproduces the completed audit samples", async () => {
  const pool = new ComputePool(() => {
    const worker = new Worker(
      new URL("../dist-server/ai-worker.mjs", import.meta.url),
    );
    return {
      send: (input) => worker.postMessage(input),
      receive: (callback) => worker.on("message", callback),
      error: (callback) => worker.on("error", callback),
      close: () => {
        void worker.terminate();
      },
    };
  }, 2);
  const engine = new GameEngine();
  let state = engine.create("scmj", 4, "parallel");
  for (let i = 0; i < 8; i++) {
    const actor = engine.actors(state)[0];
    state = engine.apply(
      state,
      actor,
      engine.candidates(state, actor)[0].action,
      `setup-${i}`,
    );
  }
  const actor = engine.actors(state)[0],
    observation = engine.project(state, actor),
    registry = new Strategies();
  try {
    const coordinator = new SearchCoordinator(pool);
    const warm = await coordinator.decide(
      { actor, observation, difficulty: "normal", seed: "warm", audit: false },
      2,
    );
    expect(warm.audit).toBeUndefined();
    const result = await coordinator.decide(
      { actor, observation, difficulty: "hard", seed: "parallel", audit: true },
      2,
    );
    expect(() =>
      engine.apply(state, actor, result.chosen, "apply"),
    ).not.toThrow();
    expect(result.audit?.simulations).toBeGreaterThan(0);
    const audit = result.audit!;
    expect(
      registry.decide(observation, actor, "hard", "parallel", audit.version, {
        search: audit.search,
      }),
    ).toEqual(audit);
  } finally {
    pool.close();
  }
}, 15000);
