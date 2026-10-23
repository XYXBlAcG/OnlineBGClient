import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { ClientStore } from "../src/client/storage";
import { attachmentLimits } from "../src/domain/attachments";
it("isolates and deduplicates local images, expires closed rooms and clears media without losing records", async () => {
  const store = new ClientStore();
  await store.clearCache({ images: true, audit: false });
  const bytes = new Blob(["image"]),
    image = {
      id: "a".repeat(64),
      mime: "image/png" as const,
      width: 1,
      height: 1,
      size: bytes.size,
    };
  await store.saveImage("one", image, bytes);
  await store.saveImage("one", image, bytes);
  expect((await store.cacheUsage()).images).toBe(bytes.size);
  expect(await new ClientStore().image("one", image.id)).toBeDefined();
  expect(await store.image("two", image.id)).toBeUndefined();
  const original = Date.now;
  let now = original();
  Date.now = () => now;
  try {
    await store.expireImages("one");
    now += attachmentLimits.ttl + 1;
    expect(await store.image("one", image.id)).toBeUndefined();
    expect((await store.cacheUsage()).images).toBe(0);
  } finally {
    Date.now = original;
  }
  await store.saveImage("two", image, bytes);
  await store.clearCache({ images: true, audit: false });
  expect(await store.image("two", image.id)).toBeUndefined();
});
