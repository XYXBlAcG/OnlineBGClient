import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const levels = [0, 5, 10];
const seeds = Number(process.env.EXPEDITION_DIFFICULTY_SEEDS ?? 16);
const modes = ["standard", "challenge"];
const tolerance = Math.ceil(seeds * 0.08);
await mkdir(".tmp/expedition-difficulty-verify", { recursive: true });
await build({
  stdin: {
    contents: `
      export { ExpeditionAdventure } from './src/domain/expedition/adventure';
      export { ExpeditionStrategy } from './src/domain/expedition/ai';
    `,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/expedition-difficulty-verify/runtime.mjs",
  logLevel: "error",
});
const { ExpeditionAdventure, ExpeditionStrategy } = await import(
  pathToFileURL(
    join(process.cwd(), ".tmp/expedition-difficulty-verify/runtime.mjs"),
  )
);

function play(seed, difficulty, ascension) {
  let serial = 0;
  const rules = new ExpeditionAdventure(() => {
      serial += 1;
      return (
        ((((seed + 1) * 9301 +
          (ascension + 1) * 271 +
          (["standard", "challenge"].indexOf(difficulty) + 1) * 7919 +
          serial * 49297) %
          233280) +
          233280) %
        233280 /
        233280
      );
    }),
    strategy = new ExpeditionStrategy("adaptive");
  let current = rules.create(1, false, {
    expedition: { difficulty, ascension },
  });
  let steps = 0;
  while (!rules.finished(current) && steps++ < 12000) {
    const actor = rules.actors(current)[0];
    if (actor === undefined) throw new Error("run stalled without an actor");
    const request = {
        observation: rules.project(current, actor),
        actor,
        difficulty: "hard",
        seed: `verify:${difficulty}:${ascension}:${seed}:${steps}`,
        audit: false,
      },
      decision = strategy
        .score(request, strategy.candidates(request))
        .sort((left, right) => right.score - left.score)[0];
    if (!decision) throw new Error("run stalled without a decision");
    current = rules.apply(current, actor, decision.action);
  }
  return current.view.phase === "won";
}

const results = {};
for (const mode of modes)
  for (const level of levels) {
    let wins = 0;
    for (let seed = 0; seed < seeds; seed += 1)
      if (play(seed, mode, level)) wins += 1;
    results[`${mode}-N${level}`] = wins;
    console.log(`${mode} N${level}: ${wins}/${seeds}`);
  }

const problems = [];
const check = (label, passed, detail) => {
  if (!passed) problems.push(`${label}（${detail}）`);
};
for (const mode of modes) {
  const n0 = results[`${mode}-N0`],
    n5 = results[`${mode}-N5`],
    n10 = results[`${mode}-N10`];
  if (mode === "challenge")
    check(
      `${mode} N0 需要保持可玩`,
      n0 >= Math.ceil(seeds * 0.08),
      `${n0}/${seeds}`,
    );
  check(
    `${mode} N0→N5 不应明显上升`,
    n5 <= n0 + tolerance,
    `${n0}→${n5}，容差 ${tolerance}`,
  );
  check(
    `${mode} N5→N10 不应明显上升`,
    n10 <= n5 + tolerance,
    `${n5}→${n10}，容差 ${tolerance}`,
  );
  check(`${mode} N10 应低于 N0`, n10 <= n0, `${n0}→${n10}`);
}
if (problems.length) {
  console.error(`难度曲线校验失败：\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `难度曲线校验通过：挑战档 N0 保持非零，标准/挑战随 N 递减（容差 ${tolerance} 场，每档 ${seeds} 种种子）`,
);
