import { expect, it } from "vitest";
import { PoolStrategy } from "../src/domain/pool/strategy";
import { Strategies } from "../src/domain/strategies";
import { ComputePool, SearchCoordinator } from "../src/domain/compute";
import { executeSearchTask } from "../src/domain/strategy";
import { PoolRules } from "../src/domain/pool/rules";
import { cuePlacementValid } from "../src/domain/pool/table";
import type { SearchRequest } from "../src/domain/strategy";

it("is registered as the playable AI for pool", () => {
  expect(new Strategies().select("pool")).toBeInstanceOf(PoolStrategy);
});

it("generates legal target shots and scores them with the shared physics", () => {
  const rules = new PoolRules(() => 0.5);
  const state = rules.create(2, false, {
    pool: { mode: "eight-ball", shotSeconds: 60, assist: true },
  });
  const strategy = new PoolStrategy();
  const request: SearchRequest = {
    observation: state,
    actor: 0,
    difficulty: "normal",
    seed: "pool-ai",
    audit: true,
  };
  const candidates = strategy.candidates(request);
  expect(candidates.length).toBeGreaterThan(0);
  expect(strategy.roots(request, [])).toEqual([]);
  expect(
    candidates.every((candidate) => candidate.action.type === "pool-shot"),
  ).toBe(true);
  const scored = strategy.score(
    request,
    candidates.slice(0, Math.min(2, candidates.length)),
  );
  expect(scored.length).toBeGreaterThan(0);
  expect(scored[0].features.length).toBeGreaterThan(0);
  expect(Number.isFinite(scored[0].score)).toBe(true);
  const decision = strategy.decide(state, 0, "normal", "pool-ai");
  expect(decision.chosen.type).toBe("pool-shot");
  expect(decision.candidates.length).toBeGreaterThan(0);
  if (decision.chosen.type !== "pool-shot") throw new Error("动作错误");
  expect(rules.apply(state, 0, decision.chosen).kind).toBe("pool");
});

it("places the cue ball on a legal spot when the AI has ball in hand", () => {
  const rules = new PoolRules(() => 0.5);
  const state = rules.create(2, false, {
    pool: { mode: "eight-ball", shotSeconds: 60, assist: true },
  });
  const view = structuredClone(state.view);
  view.phase = "ball-in-hand";
  view.ballInHand = true;
  const candidates = new PoolStrategy().candidates({
    observation: { kind: "pool", view },
    actor: 0,
    difficulty: "normal",
    seed: "pool-ai-placement",
    audit: true,
  });
  const placements = candidates
    .map((candidate) => candidate.action)
    .filter((action) => action.type === "pool-shot" && action.cue);
  expect(placements.length).toBeGreaterThan(0);
  for (const action of placements)
    if (action.type === "pool-shot" && action.cue)
      expect(cuePlacementValid(view.balls, action.cue)).toBe(true);
});

it("executes through the real compute coordinator without falling back to unsupported simulation", async () => {
  const rules = new PoolRules(() => 0.5);
  const state = rules.create(2, false, {
    pool: { mode: "eight-ball", shotSeconds: 60, assist: true },
  });
  const port = () => {
    let receive: (output: {
      id: number;
      output?: {
        type: "score";
        candidates: import("../src/domain/types").DecisionCandidate[];
      };
    }) => void = () => {};
    return {
      send: (input: {
        id: number;
        task: import("../src/domain/strategy").SearchTask;
      }) => {
        queueMicrotask(() =>
          receive({
            id: input.id,
            output: executeSearchTask(new PoolStrategy(), input.task) as {
              type: "score";
              candidates: import("../src/domain/types").DecisionCandidate[];
            },
          }),
        );
      },
      receive: (
        callback: (output: {
          id: number;
          output?: {
            type: "score";
            candidates: import("../src/domain/types").DecisionCandidate[];
          };
        }) => void,
      ) => {
        receive = callback;
      },
      error: () => {},
      close: () => {},
    };
  };
  const coordinator = new SearchCoordinator(new ComputePool(port, 1));
  const result = await coordinator.decide(
    {
      observation: state,
      actor: 0,
      difficulty: "normal",
      seed: "pool-compute",
      audit: true,
    },
    1,
  );
  expect(result.chosen.type).toBe("pool-shot");
});

it.each(["easy", "normal", "hard"] as const)(
  "scores a mid-rack with multiple shots without entering unsupported rollout (%s)",
  (difficulty) => {
    const state = new PoolRules(() => 0.5).create(2, false);
    state.view.phase = "aim";
    state.view.shotNumber = 1;
    state.view.groups = [0, 1];
    state.view.openTable = false;
    state.view.balls = state.view.balls.map((ball) =>
      ball.id === 0
        ? { ...ball, x: -0.5, y: 0 }
        : ball.id === 1
          ? { ...ball, x: 0.2, y: 0.15 }
          : ball.id === 8
            ? { ...ball, x: 0.75, y: 0.32 }
            : { ...ball, pocketed: true },
    );
    const strategy = new Strategies().select("pool");
    const request: SearchRequest = {
      observation: state,
      actor: 0,
      difficulty,
      seed: "mid-rack",
      audit: true,
    };
    const candidates = strategy.candidates(request);
    expect(candidates.length).toBeGreaterThan(1);
    const scored = strategy.score(request, candidates);
    expect(strategy.roots(request, scored)).toEqual([]);
    expect(strategy.budget(request).samples).toBe(0);
    expect(
      new Strategies().decide(state, 0, difficulty, "mid-rack").chosen.type,
    ).toBe("pool-shot");
  },
);

it("executes mid-rack choices through real workers in all difficulties", async () => {
  const { Worker } = await import("node:worker_threads");
  const pool = new ComputePool(() => {
    const worker = new Worker(
      new URL("../dist-server/ai-worker.mjs", import.meta.url),
    );
    return {
      send: (value) => worker.postMessage(value),
      receive: (callback) => worker.on("message", callback),
      error: (callback) => worker.on("error", callback),
      close: () => {
        void worker.terminate();
      },
    };
  }, 2);
  const state = new PoolRules(() => 0.5).create(2, false);
  state.view.phase = "aim";
  state.view.shotNumber = 1;
  state.view.groups = [0, 1];
  state.view.openTable = false;
  state.view.balls = state.view.balls.map((ball) =>
    ball.id === 0
      ? { ...ball, x: -0.5, y: 0 }
      : ball.id === 1
        ? { ...ball, x: 0.2, y: 0.15 }
        : ball.id === 8
          ? { ...ball, x: 0.75, y: 0.32 }
          : { ...ball, pocketed: true },
  );
  try {
    const coordinator = new SearchCoordinator(pool);
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const result = await coordinator.decide(
        {
          observation: state,
          actor: 0,
          difficulty,
          seed: "real-mid-rack",
          audit: false,
        },
        2,
      );
      expect(result.chosen.type).toBe("pool-shot");
      expect(result.audit).toBeUndefined();
    }
  } finally {
    pool.close();
  }
}, 30000);

it("schedules room AI despite continuous shots having no fixed options", async () => {
  const { Room } = await import("../src/domain/room");
  const room = new Room("pool-ai", {
    kind: "pool",
    humans: 1,
    ai: [{ difficulty: "easy", name: "甲" }],
    team: false,
    training: false,
  });
  const controller = room.claim("主持");
  room.start(controller);
  if (room.state?.kind !== "pool") throw Error("牌桌类型");
  room.state.view.turn = 1;
  const request = room.aiRequest();
  expect(request?.observation.kind).toBe("pool");
  expect(
    new PoolStrategy().candidates({ ...request!, audit: false }).length,
  ).toBeGreaterThan(0);
});

it("caps shot search and adds reproducible execution error by difficulty", () => {
  const view = new PoolRules(() => 0.5).create(2, false);
  const strategy = new PoolStrategy();
  const request: SearchRequest = {
    observation: view,
    actor: 0,
    difficulty: "easy",
    seed: "aim-control",
    audit: false,
  };
  const easy = strategy.candidates(request)[0].action;
  const hard = strategy.candidates({ ...request, difficulty: "hard" })[0]
    .action;
  expect(easy).toMatchObject({ type: "pool-shot" });
  if (easy.type !== "pool-shot" || hard.type !== "pool-shot")
    throw Error("未出杆");
  expect(Math.abs(easy.aim)).toBeGreaterThan(Math.abs(hard.aim));
  expect(strategy.candidates(request)).toEqual(strategy.candidates(request));
  expect(
    strategy.candidates({ ...request, seed: "another-aim" })[0].action,
  ).not.toEqual(easy);
  expect(strategy.candidates(request).length).toBeLessThanOrEqual(4);
});

it("raises the AI cue along the final aim if a ball sits behind the cue", () => {
  const state = new PoolRules(() => 0.5).create(2, false);
  state.view.phase = "aim";
  state.view.balls = [
    { id: 0, x: 0, y: 0, pocketed: false },
    { id: 1, x: 0.42, y: 0, pocketed: false },
    { id: 2, x: -0.07, y: 0, pocketed: false },
  ];
  const strategy = new PoolStrategy();
  const shots = strategy
    .candidates({
      observation: state,
      actor: 0,
      difficulty: "hard",
      seed: "cue-obstacle",
      audit: false,
    })
    .map(({ action }) => action);
  expect(shots.length).toBeGreaterThan(0);
  const shot = shots.find(
    (shot) => shot.type === "pool-shot" && (shot.elevation ?? 0) > 0.1,
  );
  if (!shot || shot.type !== "pool-shot") throw Error("没有抬杆");
  const played = new PoolRules(() => 0.5).apply(state, 0, shot);
  expect(played.view.lastShot?.elevation).toBeCloseTo(shot.elevation!);
  const normalized = new PoolRules(() => 0.5).apply(state, 0, {
    ...shot,
    elevation: 0,
  });
  expect(normalized.view.lastShot?.elevation).toBeCloseTo(shot.elevation!);
});
