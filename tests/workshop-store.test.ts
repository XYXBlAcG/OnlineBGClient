import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { ClientStore } from "../src/client/storage";
import { featuredWorkshopPacks } from "../src/domain/workshop/featured";
it("真实 IndexedDB 安装、停用、升级与卸载保留用户开关，不影响存档存储", async () => {
  const store = new ClientStore(),
    pack = featuredWorkshopPacks[0];
  await store.installPlugin(pack);
  expect(
    (await store.plugins()).find((p) => p.pack.id === pack.id)?.enabled,
  ).toBe(true);
  await store.enablePlugin(pack.id, false);
  await store.installPlugin({ ...pack, version: "1.1.0" });
  expect(
    (await store.plugins()).find((p) => p.pack.id === pack.id),
  ).toMatchObject({ enabled: false, pack: { version: "1.1.0" } });
  await expect(store.installPlugin(pack)).rejects.toThrow("旧版");
  await store.removePlugin(pack.id);
  expect((await store.plugins()).some((p) => p.pack.id === pack.id)).toBe(
    false,
  );
});
