import { it, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { readdir, utimes } from "node:fs/promises";
import { join } from "node:path";
import { AssetStore } from "../src/server/assets";

it("validates actual image metadata and deduplicates persistent image content", async () => {
  const root = mkdtempSync(join(tmpdir(), "stickers-"));
  const png = readFileSync("tests/fixtures/sticker.png");
  try {
    const store = new AssetStore(root);
    const first = await store.save(png, "图");
    expect(first).toMatchObject({ width: 1, height: 1, mime: "image/png" });
    expect((await store.save(png, "图二")).id).toBe(first.id);
    expect(await new AssetStore(root).metadata(first.id)).toEqual(first);
    expect(await store.bytes(first.id)).toEqual(png);
    await expect(
      store.save(Buffer.from("not an image"), "坏图"),
    ).rejects.toThrow();
    await expect(
      store.save(Buffer.alloc(5 * 1024 * 1024 + 1), "过大"),
    ).rejects.toThrow("5 MB");
    const huge = Buffer.from(png);
    huge.writeUInt32BE(4096, 16);
    await expect(store.save(huge, "尺寸")).rejects.toThrow("2048");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("keeps referenced GIF previews and recent uploads while collecting expired unreferenced resources", async () => {
  const root = mkdtempSync(join(tmpdir(), "sticker-cleanup-"));
  try {
    const store = new AssetStore(root);
    const png = readFileSync("tests/fixtures/sticker.png"),
      gif = readFileSync("tests/fixtures/sticker.gif");
    await expect(store.save(gif, "动图")).rejects.toThrow("静态预览");
    const preview = await store.save(png, "预览");
    const animation = await store.save(gif, "动图", preview.id);
    const unused = await store.save(
      Buffer.concat([png, Buffer.from([0])]),
      "未引用",
    );
    const refreshed = await store.save(
      Buffer.concat([png, Buffer.from([1])]),
      "重新上传",
    );
    const old = new Date(Date.now() - 7200000);
    for (const file of await readdir(root))
      await utimes(join(root, file), old, old);
    await store.save(Buffer.concat([png, Buffer.from([1])]), "重新上传");
    await store.collect(new Set([animation.id]));
    expect(await store.metadata(animation.id)).toEqual(animation);
    expect(await store.bytes(preview.id)).toEqual(png);
    expect(await store.metadata(refreshed.id)).toEqual(refreshed);
    await expect(store.bytes(unused.id)).rejects.toMatchObject({
      code: "ENOENT",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
