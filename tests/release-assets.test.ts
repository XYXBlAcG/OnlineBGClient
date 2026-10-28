import { expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { prepareRelease } from "../scripts/release-assets.mjs";
it("requires both signed platforms and produces a stable deterministic updater manifest", async () => {
  const root = await mkdtemp(join(tmpdir(), "onlinebg-release-"));
  try {
    const exe = join(root, "setup.exe"),
      mac = join(root, "app.dmg"),
      update = join(root, "OnlineBGClient.app.tar.gz"),
      output = join(root, "out");
    await writeFile(exe, "MZinstaller");
    await writeFile(
      exe + ".sig",
      Buffer.from("windows signature test fixture").toString("base64"),
    );
    await expect(
      prepareRelease(root, output, "0.2.0", "v0.2.0", "owner/repo"),
    ).rejects.toThrow("macOS");
    const dmg = Buffer.alloc(1024);
    dmg.write("koly", 512);
    await writeFile(mac, dmg);
    await writeFile(update, Buffer.from([31, 139, 1, 2]));
    await expect(
      prepareRelease(root, output, "0.2.0", "v0.2.0", "owner/repo"),
    ).rejects.toThrow();
    await writeFile(
      update + ".sig",
      Buffer.from("mac signature test fixture").toString("base64"),
    );
    await expect(
      prepareRelease(root, output, "0.2.0", "v0.3.0", "owner/repo"),
    ).rejects.toThrow("版本");
    const result = await prepareRelease(
      root,
      output,
      "0.2.0",
      "v0.2.0",
      "owner/repo",
    );
    const manifest = JSON.parse(
      await readFile(join(output, "latest.json"), "utf8"),
    );
    expect(manifest.version).toBe("0.2.0");
    expect(Object.keys(manifest.platforms).sort()).toEqual([
      "darwin-aarch64",
      "windows-x86_64",
    ]);
    expect(manifest.platforms["darwin-aarch64"].url).toContain(
      "/v0.2.0/OnlineBGClient-0.2.0-macOS-arm64.app.tar.gz",
    );
    expect(result.assets.map((path) => basename(path))).not.toContain(
      expect.stringContaining(".zip"),
    );
    const first = await readFile(join(output, "latest.json"), "utf8");
    await prepareRelease(root, output, "0.2.0", "v0.2.0", "owner/repo");
    expect(await readFile(join(output, "latest.json"), "utf8")).toBe(first);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("keeps the native, application and published version on the same source", async () => {
  const { releaseVersion } = await import("../scripts/release-version.mjs");
  const { version } = await import("../package.json");
  expect(await releaseVersion()).toBe(version);
});
