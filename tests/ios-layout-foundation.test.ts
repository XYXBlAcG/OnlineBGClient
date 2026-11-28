import { expect, it } from "vitest";
import { mobileViewport } from "../src/client/mobile-viewport";
import { readFileSync } from "node:fs";
it("does not treat pinch zoom as a keyboard and reports available width", () => {
  expect(
    mobileViewport({
      width: 390,
      height: 844,
      visualHeight: 422,
      visualWidth: 195,
      offsetTop: 0,
      scale: 2,
    }),
  ).toMatchObject({ keyboard: false, width: 195 });
});
it("bounds the visual viewport during keyboard transitions", () => {
  expect(
    mobileViewport({
      width: 390,
      height: 844,
      visualHeight: 900,
      offsetTop: 0,
    }),
  ).toMatchObject({ height: 844 });
});
it("provides touch layouts for portrait and landscape samples", () => {
  const css = readFileSync("src/client/ui/mobile-foundation.css", "utf8");
  expect(css).toContain("safe-area-inset-left");
  expect(css).toContain("44px");
  expect(css).toContain(".scmj-hand");
  expect(css).toContain("repeat(7");
  expect(css).toContain(".exp-intent-strip");
});
