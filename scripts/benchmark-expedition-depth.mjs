import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const seeds = Number(process.env.EXPEDITION_BENCHMARK_SEEDS ?? 2);
if (!Number.isInteger(seeds) || seeds < 1 || seeds > 1000)
  throw new Error("种子数应为 1–1000");
await mkdir(".tmp/expedition", { recursive: true });
await build({
  stdin: {
    contents: `export { ExpeditionAdventure } from './src/domain/expedition/adventure';export { ExpeditionStrategy } from './src/domain/expedition/ai';export { heroContent } from './src/domain/expedition/content';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/expedition/depth-benchmark.mjs",
  logLevel: "error",
});
const { ExpeditionAdventure, ExpeditionStrategy, heroContent } = await import(
  pathToFileURL(`${process.cwd()}/.tmp/expedition/depth-benchmark.mjs`)
);
const ai = new ExpeditionStrategy(),
  trials = [];
for (let profession = 0; profession < heroContent.length; profession++) {
  for (let seed = 0; seed < seeds; seed++) {
    let counter = 0;
    const rules = new ExpeditionAdventure(
      () => (((seed + 1) * 9301 + ++counter * 49297) % 233280) / 233280,
    );
    let state = rules.create(2, false, {
        expedition: { difficulty: "standard" },
      }),
      steps = 0;
    for (let actor = 0; actor < 2; actor++)
      state = rules.apply(state, actor, {
        type: "expedition-action",
        move: {
          type: "profession",
          profession: (profession + actor) % heroContent.length,
        },
      });
    const start = performance.now(),
      phases = new Set();
    while (!rules.finished(state) && steps++ < 4000) {
      const actor = rules.actors(state)[0];
      if (actor === undefined) {
        await writeFile(
          ".tmp/expedition/stalled-depth.json",
          JSON.stringify(state, null, 2),
        );
        throw new Error(`停滞：${state.view.phase}`);
      }
      const request = {
        observation: rules.project(state, actor),
        actor,
        difficulty: "normal",
        seed: `depth:${seed}:${steps}`,
        audit: false,
      };
      const ranked = ai
        .score(request, ai.candidates(request))
        .sort((a, b) => b.score - a.score);
      if (!ranked.every((candidate) => Number.isFinite(candidate.score)))
        throw new Error("策略分数出现非有限值");
      phases.add(state.view.phase);
      state = rules.apply(state, actor, ranked[0].action);
    }
    if (!rules.finished(state))
      throw new Error(`超过行动上限：${profession}/${seed}`);
    const trial = {
      profession: heroContent[profession].name,
      partner: heroContent[(profession + 1) % heroContent.length].name,
      seed,
      outcome: state.view.phase,
      chapter: state.view.chapter + 1,
      node: state.view.floor + 1,
      steps,
      rounds: state.view.combat.metrics.rounds,
      elapsedMs: Math.round(performance.now() - start),
      phases: [...phases],
    };
    trials.push(trial);
    process.stdout.write(
      `${trial.profession}/${seed}: ${trial.outcome}, 大层 ${trial.chapter}, 节点 ${trial.node}, ${steps} 次行动\n`,
    );
  }
}
const hash = createHash("sha256");
for (const file of (await readdir("src/domain/expedition"))
  .filter((file) => file.endsWith(".ts"))
  .sort())
  hash.update(file).update(await readFile(`src/domain/expedition/${file}`));
await mkdir("artifacts/expedition-depth", { recursive: true });
await writeFile(
  "artifacts/expedition-depth/benchmark.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceSha256: hash.digest("hex"),
      policy:
        "normal heuristic, public observation, no lookahead; paired adjacent professions",
      seedsPerProfession: seeds,
      difficulty: "standard",
      trials,
    },
    null,
    2,
  ),
);
