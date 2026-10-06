import { createWriteStream } from "node:fs";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function runNativeSmoke({
  command = "cargo",
  args = [
    "run",
    "--release",
    "--manifest-path",
    "src-tauri/Cargo.toml",
    "--example",
    "smoke",
    "--features",
    "tauri/custom-protocol",
  ],
  output,
  profile = "ai",
  timeoutMs = 900000,
}) {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, "");
  const log = createWriteStream(output + ".process.log");
  let transcript = "";
  let timedOut = false;
  const result = await new Promise((resolveResult, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        COMPANION_SMOKE_OUTPUT: output,
        COMPANION_SMOKE_PROFILE: profile,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
      } else {
        process.kill(-child.pid, "SIGKILL");
      }
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      log.write(chunk);
      transcript += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      log.write(chunk);
      transcript += chunk.toString();
      process.stderr.write(chunk);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      log.end();
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolveResult({ code, signal });
    });
  });
  await new Promise((resolveLog) => log.end(resolveLog));
  const report = await readFile(output, "utf8");
  if (timedOut)
    throw new Error(`Native smoke timed out: ${report || transcript}`);
  if (result.code !== 0)
    throw new Error(
      `Native smoke exited code=${result.code}, signal=${result.signal}: ${report || transcript}`,
    );
  if (!report) throw new Error(`Native smoke did not report: ${transcript}`);
  console.log(report);
  if (!report.startsWith("PASS")) throw new Error(report);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await runNativeSmoke({
    output: resolve(
      process.env.COMPANION_SMOKE_OUTPUT ?? ".tmp/smoke/native-ai-result.txt",
    ),
    profile: process.env.COMPANION_SMOKE_PROFILE ?? "ai",
  });
}
