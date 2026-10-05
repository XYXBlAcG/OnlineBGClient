import { expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareRelease } from "../scripts/release-assets.mjs";
it("requires both platforms, checks the stable tag and hashes named downloads", async () => {
  const root = await mkdtemp(join(tmpdir(), "onlinebg-release-"));
  try {
    await mkdir(join(root, "windows"));
    await mkdir(join(root, "mac"));
    await writeFile(join(root, "windows", "setup.exe"), "MZinstaller");
    await expect(
      prepareRelease(root, join(root, "out"), "0.1.0", "v0.1.0"),
    ).rejects.toThrow("macOS");
    await writeFile(
      join(root, "mac", "OnlineBGClient-macOS-arm64.zip"),
      "PKbundle",
    );
    await expect(
      prepareRelease(root, join(root, "out"), "0.1.0", "v0.2.0"),
    ).rejects.toThrow("版本");
    const result = await prepareRelease(
      root,
      join(root, "out"),
      "0.1.0",
      "v0.1.0",
    );
    expect(result.assets.map((p) => p.split("/").at(-1))).toEqual([
      "OnlineBGClient-0.1.0-Windows-x64.exe",
      "OnlineBGClient-0.1.0-macOS-arm64.zip",
      "SHA256SUMS.txt",
    ]);
    const hashes = await readFile(result.assets[2], "utf8");
    expect(hashes).toMatch(/^[a-f0-9]{64}  OnlineBGClient-/);
    expect(hashes.split("\n").filter(Boolean)).toHaveLength(2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
