import { createHash } from "node:crypto";
import { build } from "esbuild";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
await mkdir(".tmp/expedition", { recursive: true });
await build({
  stdin: {
    contents: `export { ExpeditionAdventure } from './src/domain/expedition/adventure';export { ExpeditionStrategy } from './src/domain/expedition/ai';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/expedition/benchmark.mjs",
  logLevel: "error",
});
const { ExpeditionAdventure, ExpeditionStrategy } = await import(
  pathToFileURL(`${process.cwd()}/.tmp/expedition/benchmark.mjs`)
);
const list = (name, fallback) =>
    (process.env[name] ?? fallback).split(",").map((value) => {
      const trimmed = value.trim(),
        numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : trimmed;
    }),
  difficulties = (
    process.env.EXPEDITION_BENCHMARK_DIFFICULTIES ?? "story,standard,challenge"
  )
    .split(",")
    .map((value) => value.trim()),
  playersList = list("EXPEDITION_BENCHMARK_PLAYERS", "1,2,3,4"),
  ascensions = list("EXPEDITION_BENCHMARK_ASCENSIONS", "0"),
  seeds = Number(process.env.EXPEDITION_BENCHMARK_SEEDS ?? 8),
  ai = new ExpeditionStrategy(),
  rows = [];
for (const difficulty of ["story", "standard", "challenge"])
  if (difficulties.includes(difficulty))
    for (const ascension of ascensions)
      for (const players of playersList) {
        const trials = [],
          start = performance.now();
        for (let seed = 0; seed < seeds; seed++) {
          let counter = 0;
          const rules = new ExpeditionAdventure(() => {
            counter++;
            return (((seed + 1) * 9301 + counter * 49297) % 233280) / 233280;
          });
          let state = rules.create(players, false, {
              expedition: { difficulty, ascension },
            }),
            steps = 0;
          const seen = new Set();
          while (!rules.finished(state) && steps++ < 6000) {
            const actor = rules.actors(state)[0];
            if (actor === undefined)
              throw new Error(`停滞 ${state.view.phase}`);
            const request = {
              observation: rules.project(state, actor),
              actor,
              difficulty: "normal",
              seed: `trial:${seed}:${steps}`,
              audit: false,
            };
            const decision = ai
              .score(request, ai.candidates(request))
              .sort((a, b) => b.score - a.score)[0];
            seen.add(state.view.phase);
            state = rules.apply(state, actor, decision.action);
          }
          if (!rules.finished(state)) throw new Error("超过行动上限");
          trials.push({
            seed,
            outcome: state.view.phase,
            floor: state.view.floor + 1,
            steps,
            hp: state.view.combat.heroes.reduce((s, h) => s + h.hp, 0),
            phases: [...seen],
          });
        }
        rows.push({
          difficulty,
          ascension,
          players,
          trials,
          won: trials.filter((t) => t.outcome === "won").length,
          elapsedMs: Math.round(performance.now() - start),
        });
      }
const sourceHash = createHash("sha256");
for (const file of (await readdir("src/domain/expedition"))
  .filter((file) => file.endsWith(".ts"))
  .sort())
  sourceHash
    .update(file)
    .update(await readFile(`src/domain/expedition/${file}`));
const report = {
  sourceSha256: sourceHash.digest("hex"),
  generatedAt: new Date().toISOString(),
  policy: "normal heuristic, projected observation, no lookahead",
  seedsPerConfiguration: seeds,
  rows,
};
await mkdir("artifacts/expedition-chapter", { recursive: true });
await writeFile(
  "artifacts/expedition-chapter/benchmark.json",
  JSON.stringify(report, null, 2),
);
process.stdout.write(
  rows
    .map(
      (r) =>
        `${r.difficulty} N${r.ascension} ${r.players}p ${r.won}/${seeds} ${r.elapsedMs}ms`,
    )
    .join("\n") + "\n",
);
