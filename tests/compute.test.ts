import { expect, it } from "vitest";
import { Worker } from "node:worker_threads";
import {
  ComputePool,
  SearchCoordinator,
  type ComputePort,
} from "../src/domain/compute";
import { GameEngine } from "../src/domain/engine";
import { Strategy } from "../src/domain/strategy";
function port(): ComputePort {
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
}
it("uses real worker threads with reproducible decisions and optional audit", async () => {
  const pool = new ComputePool(port, 4),
    compute = new SearchCoordinator(pool),
    engine = new GameEngine();
  try {
    for (const kind of ["uno", "dy", "tq"] as const) {
      let game = engine.create(kind, 3, `compute:${kind}`);
      if (kind === "uno")
        game = engine.apply(game, 0, { type: "uno-start" }, "start");
      const actor = engine.actors(game)[0],
        observation = engine.project(game, actor),
        request = {
          observation,
          actor,
          difficulty: "normal" as const,
          seed: "fixed",
          audit: true,
        };
      const expected = new Strategy().decide(
        observation,
        actor,
        request.difficulty,
        request.seed,
      );
      const parallel = await compute.decide(request, 4);
      expect(parallel.audit).toEqual(expected);
      const minimal = await compute.decide({ ...request, audit: false }, 1);
      expect(minimal.chosen).toEqual(expected.chosen);
      expect(minimal.audit).toBeUndefined();
    }
  } finally {
    pool.close();
  }
}, 60000);
it("cancels obsolete work without poisoning subsequent tasks", async () => {
  const pool = new ComputePool(port, 2),
    compute = new SearchCoordinator(pool),
    engine = new GameEngine(),
    controller = new AbortController();
  const game = engine.create("tq", 3, "cancel"),
    request = {
      observation: game,
      actor: engine.actors(game)[0],
      difficulty: "hard" as const,
      seed: "slow",
      audit: false,
    };
  const pending = compute.decide(request, 2, controller.signal);
  controller.abort();
  await expect(pending).rejects.toThrow("取消");
  const easy = await compute.decide({ ...request, difficulty: "easy" }, 2);
  expect(easy.chosen.type).toBe("tq-move");
  pool.close();
}, 60000);
it("bounds economic search and reproduces only completed samples through the audit registry", async () => {
  const pool = new ComputePool(port, 4),
    coordinator = new SearchCoordinator(pool),
    engine = new GameEngine();
  try {
    const { Strategies } = await import("../src/domain/strategies");
    for (const kind of ["ktd", "ccbs"] as const) {
      const state = engine.create(kind, 3, "deadline"),
        actor = engine.actors(state)[0],
        observation = engine.project(state, actor),
        start = Date.now();
      const result = await coordinator.decide(
        { observation, actor, difficulty: "hard", seed: "budget", audit: true },
        4,
      );
      expect(Date.now() - start).toBeLessThan(4000);
      expect(() =>
        engine.apply(state, actor, result.chosen, "apply"),
      ).not.toThrow();
      const audit = result.audit!;
      const reproduced = new Strategies().decide(
        observation,
        actor,
        "hard",
        "budget",
        audit.version,
        { search: audit.search, tradeEnabled: audit.tradeEnabled },
      );
      expect(reproduced).toEqual(audit);
      const minimal = await coordinator.decide(
        {
          observation,
          actor,
          difficulty: "easy",
          seed: "budget",
          audit: false,
        },
        1,
      );
      expect(minimal.audit).toBeUndefined();
    }
  } finally {
    pool.close();
  }
}, 30000);
it("reports actual completed work independently of audit", async () => {
  const pool = new ComputePool(port, 4),
    compute = new SearchCoordinator(pool),
    engine = new GameEngine();
  const state = engine.create("tq", 6, "benchmark");
  const progress: import("../src/domain/performance").ComputeProgress[] = [];
  try {
    const result = await compute.decide(
      {
        observation: state,
        actor: engine.actors(state)[0],
        difficulty: "hard",
        seed: "benchmark",
        audit: false,
      },
      4,
      undefined,
      (value) => progress.push(value),
    );
    expect(progress[0].status).toBe("computing");
    expect(progress.at(-1)?.status).toBe("completed");
    expect(progress.at(-1)?.simulations).toBe(result.simulations);
    expect(progress.at(-1)?.elapsedMs).toBeGreaterThan(0);
    expect(progress.at(-1)?.threads).toBe(4);
    expect(result.audit).toBeUndefined();
  } finally {
    pool.close();
  }
}, 60000);
