import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Strategies } from "../src/domain/strategies";
import { DominionStrategy } from "../src/domain/dominion/strategy";
import type { DominionState } from "../src/domain/dominion/types";
it.each(["easy", "normal", "hard"] as const)(
  "finishes a legal %s AI match through projected observations",
  (difficulty) => {
    const engine = new GameEngine(),
      strategies = new Strategies();
    let state = engine.create(
      "dominion",
      2,
      `ai-${difficulty}`,
    ) as DominionState;
    let moves = 0;
    while (!engine.finished(state) && moves < 1800) {
      const actor = engine.actors(state)[0],
        observation = engine.project(state, actor);
      const request = {
        observation,
        actor,
        difficulty,
        seed: `decision-${moves}`,
        audit: false,
      };
      const strategy = strategies.select("dominion");
      const candidates = strategy.score(request, strategy.candidates(request));
      const samples = strategy.roots(request, candidates).map((candidate) => ({
        action: candidate.action,
        values: strategy.simulate(
          request,
          candidate.action,
          Array.from(
            { length: strategy.budget(request).samples },
            (_, index) => index,
          ),
        ),
      }));
      const result = strategy.complete(request, candidates, samples);
      expect(result.audit).toBeUndefined();
      const serialized = JSON.stringify(observation);
      state = engine.apply(
        state,
        actor,
        result.chosen,
        `move-${moves++}`,
      ) as DominionState;
      expect(JSON.stringify(observation)).toBe(serialized);
    }
    expect(moves).toBeLessThan(1800);
    expect(state.view.scores).toHaveLength(2);
  },
);
it("chooses province when affordable and records reproducible, observation-only reasoning", () => {
  const engine = new GameEngine(),
    strategy = new DominionStrategy();
  const state = engine.create("dominion", 2, "audit") as DominionState;
  state.view.phase = "buy";
  state.view.coins = 8;
  const observation = engine.project(state, 0);
  const decision = strategy.decide(observation, 0, "hard", "audit-seed");
  expect(decision.chosen).toEqual({
    type: "dominion-action",
    move: { type: "buy", card: "province" },
  });
  expect(strategy.decide(observation, 0, "hard", "audit-seed")).toEqual(
    decision,
  );
  expect(decision.assumptions.join("")).toContain("牌库顺序");
});
it.each([2, 3, 4])(
  "finishes %i-player random kingdoms with legal, private observations",
  (players) => {
    const engine = new GameEngine(),
      strategy = new DominionStrategy();
    let state = engine.create("dominion", players, `random-${players}`, false, {
      dominion: { mode: "random", kingdom: [] },
    }) as DominionState;
    let moves = 0;
    while (!engine.finished(state) && moves < 3500) {
      const actor = engine.actors(state)[0],
        observation = engine.project(state, actor);
      const request = {
        observation,
        actor,
        difficulty: "hard" as const,
        seed: `random-${moves}`,
        audit: false,
      };
      const decision = strategy.complete(
        request,
        strategy.score(request, strategy.candidates(request)),
        [],
      );
      state = engine.apply(
        state,
        actor,
        decision.chosen,
        `random-move-${moves++}`,
      ) as DominionState;
    }
    expect(moves, state.view.kingdom.join(",")).toBeLessThan(3500);
    expect(state.view.winners.length).toBeGreaterThan(0);
  },
);
it("executes the same audited and unaudited Dominion decisions in real worker threads", async () => {
  const { Worker } = await import("node:worker_threads");
  const { ComputePool, SearchCoordinator } =
    await import("../src/domain/compute");
  const pool = new ComputePool(() => {
    const worker = new Worker(
      new URL("../dist-server/ai-worker.mjs", import.meta.url),
    );
    return {
      send: (input) => worker.postMessage(input),
      receive: (callback) => {
        worker.on("message", callback);
      },
      error: (callback) => {
        worker.on("error", callback);
      },
      close: () => {
        void worker.terminate();
      },
    };
  }, 2);
  try {
    const engine = new GameEngine(),
      strategy = new DominionStrategy(),
      coordinator = new SearchCoordinator(pool);
    const state = engine.create("dominion", 2, "worker") as DominionState;
    state.view.phase = "buy";
    state.view.coins = 6;
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const request = {
        observation: engine.project(state, 0),
        actor: 0,
        difficulty,
        seed: "worker-decision",
        audit: true,
      };
      const expected = strategy.decide(
        request.observation,
        0,
        difficulty,
        request.seed,
      );
      const result = await coordinator.decide(request, 2);
      expect(result.audit).toEqual(expected);
      const plain = await coordinator.decide({ ...request, audit: false }, 1);
      expect(plain.chosen).toEqual(result.chosen);
      expect(plain.audit).toBeUndefined();
    }
  } finally {
    pool.close();
  }
}, 15000);
