import { expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
it("permits the pool renderer dependency but excludes city source and assets", async () => {
  const root = await mkdtemp(join(tmpdir(), "release-scope-"));
  try {
    for (const dir of ["dist", "src-tauri/resources/hosting/web"]) {
      await mkdir(join(root, dir, "assets"), { recursive: true });
      await writeFile(join(root, dir, "index.html"), "app");
      await writeFile(join(root, dir, "assets", "PoolGame.js"), "pool");
    }
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ version: "0.5.0", dependencies: { three: "0.187.0" } }),
    );
    const script = resolve("scripts/verify-release-scope.mjs");
    expect(() =>
      execFileSync(process.execPath, [script], { cwd: root, stdio: "pipe" }),
    ).not.toThrow();
    await mkdir(join(root, "src/domain/city"), { recursive: true });
    expect(() =>
      execFileSync(process.execPath, [script], { cwd: root, stdio: "pipe" }),
    ).toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
