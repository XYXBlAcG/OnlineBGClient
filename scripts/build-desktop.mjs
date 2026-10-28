import { releaseVersion } from "./release-version.mjs";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
await releaseVersion();
const env = { ...process.env };
if (!env.TAURI_SIGNING_PRIVATE_KEY) {
  env.TAURI_SIGNING_PRIVATE_KEY = await readFile(
    ".secrets/updater.key",
    "utf8",
  );
  env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = await readFile(
    ".secrets/updater.password",
    "utf8",
  );
}
const child = spawn(
  process.execPath,
  ["node_modules/@tauri-apps/cli/tauri.js", "build", ...process.argv.slice(2)],
  { stdio: "inherit", env },
);
child.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
