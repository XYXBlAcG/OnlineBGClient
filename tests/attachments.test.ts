import { afterEach, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AttachmentStore } from "../src/server/attachments";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
it("validates image bytes, deduplicates per room and survives reopening", async () => {
  const root = await mkdtemp(join(tmpdir(), "bg-media-"));
  roots.push(root);
  const store = new AttachmentStore(root);
  const image = await store.put("room", png);
  expect(image).toMatchObject({ mime: "image/png", width: 1, height: 1 });
  expect(await store.put("room", png)).toEqual(image);
  expect((await store.usage("room")).count).toBe(1);
  expect(await new AttachmentStore(root).get("room", image.id)).toEqual(png);
  expect(await store.get("other", image.id)).toBeNull();
  await expect(
    store.put("room", Buffer.from("not an image")),
  ).rejects.toThrow();
  await store.clear("room");
  expect(await store.get("room", image.id)).toBeNull();
});
it("removes only rooms past their inactive retention time", async () => {
  const root = await mkdtemp(join(tmpdir(), "bg-media-"));
  roots.push(root);
  const store = new AttachmentStore(root);
  const image = await store.put("room", png);
  await store.prune(new Set(), 1000);
  await store.prune(new Set(), 1000 + 86400001);
  expect(await store.get("room", image.id)).toBeNull();
});
it("accepts a clear image above the former budget but rejects the shared hard limit", async () => {
  const root = await mkdtemp(join(tmpdir(), "bg-clear-"));
  roots.push(root);
  const store = new AttachmentStore(root);
  const clear = Buffer.concat([png, Buffer.alloc(1100 * 1024)]);
  expect((await store.put("room", clear)).size).toBe(clear.length);
  await expect(
    store.put("room", Buffer.alloc(3 * 1024 * 1024 + 1)),
  ).rejects.toThrow("3 MB");
});
