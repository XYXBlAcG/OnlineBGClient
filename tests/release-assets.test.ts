import { expect, it } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { prepareRelease } from "../scripts/release-assets.mjs";
it("requires both signed desktop platforms and the iOS package", async () => {
  const root = await mkdtemp(join(tmpdir(), "onlinebg-release-"));
  try {
    const exe = join(root, "setup.exe"),
      mac = join(root, "app.dmg"),
      update = join(root, "OnlineBGClient.app.tar.gz"),
      ipa = join(root, "OnlineBGClient-unsigned.ipa"),
      output = join(root, "out");
    await writeFile(exe, "MZinstaller");
    await writeFile(
      exe + ".sig",
      Buffer.from("windows signature test fixture").toString("base64"),
    );
    await expect(
      prepareRelease(root, output, "0.2.0", "v0.2.0", "owner/repo"),
    ).rejects.toThrow("macOS");
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
    await writeFile(ipa, "not a package");
    await expect(
      prepareRelease(root, output, "0.2.0", "v0.2.0", "owner/repo"),
    ).rejects.toThrow("iOS 安装包");
    await writeFile(ipa, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
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
    expect(result.assets.map((path) => basename(path))).toContain(
      "OnlineBGClient-0.2.0-iOS-arm64-unsigned.ipa",
    );
    expect(result.assets.map((path) => basename(path))).not.toContain(
      expect.stringContaining(".zip"),
    );
    expect(result.assets.some((path) => path.endsWith(".dmg"))).toBe(false);
    expect(result.notes).toContain("## 更新内容");
    expect(result.notes).toContain("| iOS（未签名） |");
    expect(result.notes).toContain(
      "OnlineBGClient-0.2.0-iOS-arm64-unsigned.ipa",
    );
    expect(await readFile(join(output, "SHA256SUMS.txt"), "utf8")).toContain(
      "  OnlineBGClient-0.2.0-iOS-arm64-unsigned.ipa",
    );
    await writeFile(mac, "unused disk image");
    const { createHash } = await import("node:crypto");
    const pack = Buffer.from("optional emoji fixture");
    await writeFile(join(root, "apple-emoji-v1.tar.gz"), pack);
    await writeFile(
      join(root, "emoji-pack.json"),
      JSON.stringify({
        format: 1,
        bytes: pack.length,
        sha256: createHash("sha256").update(pack).digest("hex"),
        url: "https://github.com/owner/repo/releases/download/v0.2.0/apple-emoji-v1.tar.gz",
      }),
    );
    const withEmoji = await prepareRelease(
      root,
      output,
      "0.2.0",
      "v0.2.0",
      "owner/repo",
    );
    expect(withEmoji.assets.map((path) => basename(path))).not.toContain(
      "emoji-pack.json",
    );
    expect(
      JSON.parse(await readFile(join(output, "latest.json"), "utf8")).platforms,
    ).toEqual(manifest.platforms);
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
