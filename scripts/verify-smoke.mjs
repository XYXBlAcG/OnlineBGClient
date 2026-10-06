import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
const smokeChecks = [
  "verify-restart",
  "verify-client",
  "verify-social",
  "verify-catan",
  "verify-splendor",
  "verify-beginner-guides",
  "verify-education",
  "verify-viewport",
  "verify-ai-observation",
  "verify-workspace",
  "verify-guide-targets",
  "verify-mobile-host",
  "verify-cache",
];
const results = [];
await mkdir(".tmp/smoke", { recursive: true });
for (const name of smokeChecks) {
  console.log(`SMOKE START: ${name}`);
  const started = Date.now();
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [`scripts/${name}.mjs`], {
      stdio: "inherit",
    });
    child.once("error", (error) =>
      resolve({
        name,
        code: 1,
        error: String(error),
        elapsedMs: Date.now() - started,
      }),
    );
    child.once("exit", (code, signal) =>
      resolve({
        name,
        code: code ?? 1,
        signal,
        elapsedMs: Date.now() - started,
      }),
    );
  });
  results.push(result);
  await writeFile(
    ".tmp/smoke/results.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(`SMOKE ${result.code === 0 ? "PASS" : "FAIL"}: ${name}`);
}
const failed = results.filter((result) => result.code !== 0);
console.log(
  `SMOKE SUITE: ${results.length - failed.length}/${results.length} passed`,
);
process.exitCode = failed.length ? 1 : 0;
