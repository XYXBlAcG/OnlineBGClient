import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-smoke-report-"));
try {
  const binary = join(
    directory,
    process.platform === "win32" ? "report-test.exe" : "report-test",
  );
  execFileSync(
    "rustc",
    ["--test", "src-tauri/examples/support/smoke_report.rs", "-o", binary],
    { stdio: "inherit" },
  );
  execFileSync(binary, [], { stdio: "inherit" });
} finally {
  await rm(directory, { recursive: true, force: true });
}
