import { expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import sources from "../public/art/sources.json";
import { fighterArt, effectTexture } from "../src/client/art";
it("美术有唯一来源、校验和与原始授权，小型素材可覆盖全部战斗角色", () => {
  let bytes = 0;
  for (const source of sources) {
    const data = readFileSync(`public/art/${source.file}`);
    bytes += data.length;
    expect(createHash("sha256").update(data).digest("hex")).toBe(source.sha256);
    expect(source.license).toBe("CC0-1.0");
  }
  expect(bytes).toBeLessThan(2 * 1024 * 1024);
  for (const kind of [
    "guardian",
    "ranger",
    "alchemist",
    "beast",
    "sentinel",
    "crystal",
    "warden",
  ])
    expect(fighterArt(kind)?.url).toContain("/art/");
  expect(existsSync(`public${effectTexture("confetti")}`)).toBe(true);
});

it("扩充的像素帧和样式引用都存在，不产生运行时缺图", async () => {
  const style = JSON.parse(
    readFileSync("public/art/expedition/style.json", "utf8"),
  );
  for (const frames of Object.values(style.animations) as string[][])
    for (const file of frames)
      expect(existsSync(`public/art/expedition/${file}`)).toBe(true);
  const { expeditionItemArt } =
    await import("../src/client/expedition/item-art");
  for (const kind of [
    "damage",
    "heal",
    "block",
    "poison",
    "energy",
    "draw",
  ] as const)
    expect(
      existsSync(`public${expeditionItemArt([{ kind, amount: 1 }])}`),
    ).toBe(true);
  const css = readFileSync("src/client/expedition/world-art.css", "utf8");
  for (const match of css.matchAll(/url\('([^']+)'\)/g))
    expect(existsSync(`public${match[1]}`)).toBe(true);
});
