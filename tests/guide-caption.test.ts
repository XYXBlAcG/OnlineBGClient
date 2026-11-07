import { expect, it } from "vitest";
import {
  placeGuideCaption,
  type GuideRect,
} from "../src/client/GuideHighlight";

const inside = (
  position: { left: number; top: number },
  size: { width: number; height: number },
  rect: GuideRect,
) =>
  position.left < rect.x + rect.width &&
  position.left + size.width > rect.x &&
  position.top < rect.y + rect.height &&
  position.top + size.height > rect.y;

it("places the caption outside a wide row of mahjong tiles", () => {
  const rects = Array.from({ length: 9 }, (_, index) => ({
    x: 100 + index * 40,
    y: 220,
    width: 36,
    height: 64,
  }));
  const size = { width: 260, height: 52 };
  const position = placeGuideCaption(rects, size, { width: 800, height: 600 });
  for (const rect of rects) expect(inside(position, size, rect)).toBe(false);
  expect(position.top).toBeGreaterThan(284);
});

it("moves the caption above a target near the bottom edge", () => {
  const rects = [{ x: 300, y: 520, width: 120, height: 48 }];
  const size = { width: 240, height: 54 };
  const position = placeGuideCaption(rects, size, { width: 800, height: 600 });
  expect(inside(position, size, rects[0])).toBe(false);
  expect(position.top + size.height).toBeLessThan(520);
});
