import { expect, it } from "vitest";
import { difficultyProfile } from "../src/domain/graphwar/balance";
import { GraphwarStrategy } from "../src/domain/graphwar/strategy";
import { GameEngine } from "../src/domain/engine";
import { type GraphwarState } from "../src/domain/graphwar/types";
import { Strategies } from "../src/domain/strategies";
import {
  ComputePool,
  SearchCoordinator,
  type ComputePort,
} from "../src/domain/compute";
import { Worker } from "node:worker_threads";

it("chooses a legal targeted formula with auditable scoring and no hidden information", () => {
  const engine = new GameEngine(),
    state = engine.create("graphwar", 2, "aim") as GraphwarState;
  state.view.terrain = [];
  const strategy = new GraphwarStrategy();
  for (const difficulty of ["easy", "normal", "hard"] as const) {
    const observation = engine.project(state, 0);
    const decision = new Strategies().decide(observation, 0, difficulty, "aim");
    expect(["graphwar-fire", "graphwar-guard", "graphwar-move"]).toContain(
      decision.chosen.type,
    );
    const after = engine.apply(
      state,
      0,
      decision.chosen,
      "shot",
    ) as GraphwarState;
    expect(after.view.sequence).toBe(1);
    expect(after.view.soldiers.every((s) => s.hp > 0)).toBe(true);
    expect(decision.candidates[0].features.length).toBeGreaterThan(0);
    const request = {
      observation,
      actor: 0,
      difficulty,
      seed: "aim",
      audit: false,
    };
    const moves = strategy.candidates(request);
    expect(moves.length).toBeLessThanOrEqual(
      difficultyProfile[difficulty].candidates,
    );
    expect(moves).toEqual(strategy.candidates(request));
    expect(
      moves.filter((c) => c.action.type === "graphwar-fire").length,
    ).toBeGreaterThan(0);
    const candidates = strategy.score(request, moves);
    const minimal = strategy.complete(request, candidates, []);
    expect(minimal.audit).toBeUndefined();
    expect(candidates.every((c) => c.features.length === 0)).toBe(true);
    expect(minimal.chosen).toEqual(decision.chosen);
  }
});

it("uses real CPU workers with reproducible choices and cancels obsolete work", async () => {
  const port = (): ComputePort => {
    const worker = new Worker(
      new URL("../dist-server/ai-worker.mjs", import.meta.url),
    );
    return {
      send: (v) => worker.postMessage(v),
      receive: (cb) => worker.on("message", cb),
      error: (cb) => worker.on("error", cb),
      close: () => {
        void worker.terminate();
      },
    };
  };
  const pool = new ComputePool(port, 2),
    compute = new SearchCoordinator(pool),
    engine = new GameEngine();
  const request = {
    observation: engine.create("graphwar", 4, "workers"),
    actor: 0,
    difficulty: "normal" as const,
    seed: "parallel",
    audit: false,
  };
  try {
    const first = await compute.decide(request, 1);
    const second = await compute.decide(request, 2);
    expect(second.chosen).toEqual(first.chosen);
    const abort = new AbortController();
    const work = compute.decide(
      { ...request, difficulty: "hard" },
      2,
      abort.signal,
    );
    abort.abort();
    await expect(work).rejects.toThrow("取消");
    expect(["graphwar-fire", "graphwar-guard", "graphwar-move"]).toContain(
      (await compute.decide(request, 2)).chosen.type,
    );
  } finally {
    pool.close();
  }
}, 30000);

it("completes seeded obstacle matches with the same legal kernel and bounded actions", () => {
  const engine = new GameEngine(),
    strategy = new GraphwarStrategy();
  for (const map of ["islands", "fortress"] as const) {
    let state = engine.create("graphwar", 4, `match:${map}`, false, {
      graphwar: {
        map,
        size: "standard",
        mode: "demolition",
        soldiers: 1,
        preview: false,
        turnSeconds: 0,
      },
    }) as GraphwarState;
    for (let move = 0; move < 200 && !state.view.finished; move++) {
      const actor = state.view.turn;
      const request = {
        observation: state,
        actor,
        difficulty: "normal" as const,
        seed: `move:${move}`,
        audit: false,
      };
      const result = strategy.complete(
        request,
        strategy.score(request, strategy.candidates(request)),
        [],
      );
      state = engine.apply(
        state,
        actor,
        result.chosen,
        "turn",
      ) as GraphwarState;
    }
    expect(state.view.finished).toBe(true);
    expect(state.view.sequence).toBeLessThanOrEqual(200);
    expect(state.view.soldiers.some((s) => s.hp < 100)).toBe(true);
  }
}, 30000);
