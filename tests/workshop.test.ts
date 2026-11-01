import { expect, it } from "vitest";
import { featuredWorkshopPacks } from "../src/domain/workshop/featured";
import {
  workshopPackSchema,
  roomPluginsSchema,
} from "../src/domain/workshop/model";
import {
  readWorkshopPackage,
  writeWorkshopPackage,
} from "../src/client/workshop/package";
import { zipSync, strToU8 } from "fflate";
it("插件配方压缩包可往返，模板保留版本、作者与所有效果", async () => {
  for (const pack of featuredWorkshopPacks)
    expect(await readWorkshopPackage(writeWorkshopPackage(pack))).toEqual(pack);
});
it("拒绝脚本、未声明资源、重复效果和路径穿越，配置限制来自同一模型", async () => {
  const pack = featuredWorkshopPacks[0];
  expect(
    workshopPackSchema.safeParse({
      ...pack,
      effects: [...pack.effects, pack.effects[0]],
    }).success,
  ).toBe(false);
  expect(
    workshopPackSchema.safeParse({ ...pack, scripts: ["run.js"] }).success,
  ).toBe(false);
  expect(roomPluginsSchema.safeParse([pack, pack]).success).toBe(false);
  await expect(
    readWorkshopPackage(zipSync({ "../manifest.json": strToU8("{}") })),
  ).rejects.toThrow();
  await expect(
    readWorkshopPackage(
      zipSync({
        "manifest.json": strToU8(JSON.stringify(pack)),
        "scripts/run.js": strToU8("alert(1)"),
      }),
    ),
  ).rejects.toThrow();
});
