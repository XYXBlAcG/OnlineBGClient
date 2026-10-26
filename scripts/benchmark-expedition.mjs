import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { cpus, arch, platform } from "node:os";
await build({
  entryPoints: ["src/domain/expedition/benchmark.ts"],
  outfile: ".tmp/expedition-benchmark.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { benchmark } = await import("../.tmp/expedition-benchmark.mjs");
const count = Number(process.env.SAMPLES || 100);
if (!Number.isInteger(count) || count < 1 || count > 1000)
  throw new Error("SAMPLES must be 1–1000");
const report = benchmark(count);
report.holdout = benchmark(200, undefined, 1000);
const hash = createHash("sha256");
for (const name of [
  "content",
  "types",
  "rules",
  "random",
  "strategy",
  "benchmark",
])
  hash.update(await readFile(`src/domain/expedition/${name}.ts`));
report.rulesHash = hash.digest("hex").slice(0, 12);
report.generatedAt = new Date().toISOString();
report.environment = `${cpus()[0].model}; ${platform()} ${arch()}; Node ${process.versions.node}`;
report.holdout.environment = report.environment;
await mkdir("artifacts/demo/expedition", { recursive: true });
await writeFile(
  "src/client/expedition/balance-report.json",
  JSON.stringify(report, null, 2),
);
await writeFile(
  "artifacts/demo/expedition/balance-report.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
