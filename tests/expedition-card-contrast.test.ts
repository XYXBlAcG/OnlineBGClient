import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("浅深色牌面正文和辅助文字均保持可读对比度，不对不可用卡牌整体降透明度", () => {
  const css = readFileSync("src/client/expedition/cards.css", "utf8");
  const luminance = (hex: string) =>
    hex
      .match(/\w{2}/g)!
      .map((value) => {
        const n = parseInt(value, 16) / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      })
      .reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
        0,
      );
  const surfaces = [
    ...css.matchAll(
      /--exp-paper:\s*(#[a-f\d]{6});\s*--exp-card-foreground:\s*(#[a-f\d]{6});\s*--exp-card-secondary:\s*(#[a-f\d]{6});/g,
    ),
  ];
  expect(surfaces).toHaveLength(2);
  for (const [, paper, text, secondary] of surfaces) {
    for (const ink of [text, secondary]) {
      const values = [luminance(paper), luminance(ink)].sort((a, b) => b - a);
      expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(7);
    }
  }
  expect(css).not.toMatch(/opacity:\s*0\.\d/);
});
