import { mkdtemp, mkdir, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execute = promisify(execFile),
  directory = await mkdtemp(join(tmpdir(), "onlinebg-dmg-"));
try {
  await execute("ditto", [
    "src-tauri/target/release/bundle/macos/OnlineBGClient.app",
    join(directory, "OnlineBGClient.app"),
  ]);
  await symlink("/Applications", join(directory, "Applications"));
  await mkdir("artifacts/release-build", { recursive: true });
  await execute("hdiutil", [
    "create",
    "-volname",
    "OnlineBGClient",
    "-srcfolder",
    directory,
    "-format",
    "UDZO",
    "-ov",
    resolve("artifacts/release-build/OnlineBGClient-macOS-arm64.dmg"),
  ]);
} finally {
  await rm(directory, { recursive: true, force: true });
}
