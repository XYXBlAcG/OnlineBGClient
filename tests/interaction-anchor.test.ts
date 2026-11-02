import { expect, it } from "vitest";
import { effectAnchorRect } from "../src/client/effect-anchor";
it("投掷取头像本身中心，忽略昵称与隐藏的重复头像", () => {
  const face = {
    getBoundingClientRect: () => ({
      left: 100,
      top: 40,
      width: 40,
      height: 40,
    }),
  };
  const source = {
    querySelector: () => face,
    getBoundingClientRect: () => ({
      left: 80,
      top: 40,
      width: 100,
      height: 90,
    }),
  };
  const hidden = {
    querySelector: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
  };
  const surface = {
    querySelectorAll: () => [hidden, source],
  } as unknown as HTMLElement;
  expect(effectAnchorRect(surface, "[data-game-avatar]")!.point).toEqual({
    x: 120,
    y: 60,
  });
});

it("滚动后重新定位头像，不返回屏幕外的重复节点", () => {
  const face = (left: number, top: number) => ({
    querySelector: () => null,
    getBoundingClientRect: () => ({ left, top, width: 40, height: 40 }),
  });
  const surface = {
    querySelectorAll: () => [face(-60, 10), face(300, 210)],
  } as unknown as HTMLElement;
  expect(effectAnchorRect(surface, "[data-game-unit]")!.point).toEqual({
    x: 320,
    y: 230,
  });
});
