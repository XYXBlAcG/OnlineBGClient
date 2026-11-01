import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { roomSurfaceTransition } from "../src/client/party/navigation";
it("房间菜单与派对是互斥页面，发送后没有父弹窗留在牌桌上", () => {
  const menu = roomSurfaceTransition(null, { type: "open", surface: "menu" });
  const party = roomSurfaceTransition(menu, { type: "open", surface: "party" });
  expect(party).toBe("party");
  expect(roomSurfaceTransition(party, { type: "sent" })).toBeNull();
});
it("全屏汉字使用实心填充，禁止字内描边、透明填字和文字裁剪渐变", () => {
  for (const file of [
    "src/client/party/party.css",
    "src/client/ui/social-experience.css",
  ]) {
    const css = postcss.parse(readFileSync(file, "utf8"));
    css.walkRules((rule) => {
      if (
        !/party-(?:caption|title|finale)|social-banner.*strong/.test(
          rule.selector,
        )
      )
        return;
      rule.walkDecls((decl) => {
        if (decl.prop === "filter") expect(decl.value).toBe("none");
        if (decl.prop.includes("text-stroke"))
          expect(decl.value).toMatch(/^0(?:px)?$/);
        if (decl.prop === "-webkit-text-fill-color")
          expect(decl.value).not.toBe("transparent");
        if (decl.prop.includes("background-clip"))
          expect(decl.value).not.toBe("text");
      });
    });
  }
});
it("静态 SVG 构图不受动画坐标系干扰，透明粒子不使用会填灰底的光线滤镜", () => {
  const css = readFileSync("src/client/party/party.css", "utf8");
  expect(css).not.toMatch(/\[data-scene\]\s*\*/);
  expect(readFileSync("src/client/party/filters.ts", "utf8")).not.toContain(
    "GodrayFilter",
  );
});
