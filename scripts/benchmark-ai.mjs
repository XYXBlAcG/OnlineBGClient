import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir(".tmp/benchmark", { recursive: true });
await build({
  entryPoints: [
    "src/domain/compute.ts",
    "src/domain/engine.ts",
    "src/domain/performance.ts",
  ],
  outdir: ".tmp/benchmark",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { ComputePool, SearchCoordinator } =
  await import("../.tmp/benchmark/compute.js");
const { GameEngine } = await import("../.tmp/benchmark/engine.js");
const cores = availableParallelism(),
  pool = new ComputePool(
    () => {
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
    },
    Math.min(32, cores),
  );
const coordinator = new SearchCoordinator(pool),
  engine = new GameEngine();
const kind = process.env.BENCHMARK_GAME || "tq";
let state = engine.create(kind, 3, "benchmark");
for (let i = 0; i < (kind === "ktd" ? 12 : kind === "ccbs" ? 6 : 18); i++) {
  const actor = engine.actors(state)[0];
  state = engine.apply(
    state,
    actor,
    engine.candidates(state, actor)[i % engine.candidates(state, actor).length]
      .action,
    `warm:${i}`,
  );
}
if (kind === "ktd") {
  state = engine.apply(
    state,
    0,
    { type: "ktd-action", move: { kind: "roll" } },
    "benchmark-dice",
  );
  if (state.kind !== "ktd") throw new Error("game");
  while (
    state.view.lastOp?.type === 3 &&
    engine.runtime.load(552).bg(state.view.lastDice) === 7
  ) {
    const actor = engine.actors(state)[0];
    state = engine.apply(
      state,
      actor,
      engine.candidates(state, actor)[0].action,
      `resolve:${actor}`,
    );
  }
  for (let r = 0; r < 5; r++) {
    const difference = 6 - state.view.playerData[0].resources[r];
    state.view.bankData.resources[r] -= difference;
    state.view.playerData[0].resources[r] = 6;
  }
}
const actor = engine.actors(state)[0],
  request = {
    observation: engine.project(state, actor),
    actor,
    difficulty: "hard",
    seed: "fixed-benchmark",
    audit: false,
  };
try {
  console.log(
    JSON.stringify({
      cores,
      game: kind,
      fixture:
        kind === "ktd"
          ? "seeded setup with supply-conserving rich build turn"
          : "seeded six-action position",
      difficulty: "hard",
    }),
  );
  for (const threads of [1, 4, 8, 16].filter((n) => n <= cores)) {
    await coordinator.decide({ ...request, difficulty: "easy" }, threads);
    const times = [];
    const completedSamples = [];
    let result;
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      result = await coordinator.decide(request, threads);
      times.push(Math.round(performance.now() - start));
      completedSamples.push(result.simulations);
    }
    console.log(
      JSON.stringify({
        threads,
        milliseconds: times,
        action: result.chosen,
        simulations: completedSamples,
      }),
    );
  }
  for (const audit of [false, true]) {
    const start = performance.now();
    await coordinator.decide({ ...request, audit }, Math.min(8, cores));
    console.log(
      JSON.stringify({
        audit,
        milliseconds: Math.round(performance.now() - start),
      }),
    );
  }
} finally {
  pool.close();
}
