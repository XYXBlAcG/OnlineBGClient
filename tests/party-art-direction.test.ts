import { expect, it } from "vitest";
import { partyArt, resolvePartyArt } from "../src/domain/party/stage";
import { partyItems, type PartyEvent } from "../src/domain/party";
it("全部商品拥有明确的演出方案，主体不依赖换 emoji 的单一动画", () => {
  expect(Object.keys(partyArt).sort()).toEqual(Object.keys(partyItems).sort());
  expect(
    new Set(Object.values(partyArt).map((a) => a.scene)).size,
  ).toBeGreaterThan(20);
  expect(
    Object.values(partyArt).filter((a) => a.glyph !== "emoji").length,
  ).toBeGreaterThan(40);
  expect(partyArt.frost.scene).not.toBe(partyArt.thunder.scene);
  expect(partyArt.train.scene).not.toBe(partyArt.disco.scene);
});
it("插件可以声明场景与非表情图形，并由同一演出路由处理", () => {
  const event = {
    item: "comic",
    plugin: { id: "test", version: "1.0.0", effect: "one" },
    visual: { scene: "ice", particle: "crystal", pattern: "rain" },
  } as PartyEvent;
  expect(resolvePartyArt(event)).toMatchObject({
    scene: "ice",
    glyph: "crystal",
  });
});
import { cinemaArtwork } from "../src/client/party/cinema-art";
import { partyScenes } from "../src/domain/party/stage";
it("每类演出拥有独立矢量构图，汉字不进入 SVG 滤镜", () => {
  const scenes = partyScenes.map((s) => cinemaArtwork(s, "#ff0055", "test", 4));
  expect(new Set(scenes).size).toBe(partyScenes.length);
  for (const artwork of scenes) {
    expect(artwork).not.toContain("<text");
    expect(artwork).toContain("data-");
  }
  expect(cinemaArtwork("train", "#fff", "train", 4)).toContain("data-wheel");
  expect(cinemaArtwork("lightning", "#fff", "bolt", 4)).toContain("data-bolt");
});
it("幕布分别向两侧打开，玫瑰有卷瓣花心，爆炸包含明确炸弹主体", () => {
  expect(cinemaArtwork("spotlight", "#fff", "curtain", 4)).toContain(
    "data-curtain-left",
  );
  expect(cinemaArtwork("spotlight", "#fff", "curtain", 4)).toContain(
    "data-curtain-right",
  );
  expect(cinemaArtwork("bloom", "#fff", "rose", 4)).toContain("data-rose-core");
  expect(cinemaArtwork("blast", "#fff", "bomb", 4)).toContain("data-bomb");
});
