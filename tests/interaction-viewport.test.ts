import { effectMotion } from "../src/client/effect-motion";
import { expect, it } from "vitest";
import { effectClip } from "../src/client/effect-viewport";
import { readFileSync } from "node:fs";
it("clips effects to the visible game area in viewport coordinates", () => {
  expect(
    effectClip({ left: -20, top: 80, right: 700, bottom: 900 }, 600, 800),
  ).toEqual({ left: 0, top: 80, right: 0, bottom: 0 });
  expect(
    effectClip({ left: 80, top: 120, right: 700, bottom: 600 }, 1000, 800),
  ).toEqual({ left: 80, top: 120, right: 300, bottom: 200 });
});
it("keeps switch labels out of ordinary form layout and uses a shrinkable emoji grid", () => {
  const css = readFileSync("src/styles.css", "utf8");
  expect(css).toContain("label:not(.checkbox, .ui-switch-label)");
  expect(css).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
  expect(css).toContain("--layer-effects:20");
  expect(readFileSync("src/client/Interactions.tsx", "utf8")).toContain(
    "createPortal",
  );
});

it("keeps the selected unit origin and exact impact endpoint while amplifying the effect", () => {
  const frames = effectMotion("impact", 200, 20, 16, 1.8);
  expect(frames.body[0].transform).toContain("+ 0px");
  expect(frames.body[2].transform).toContain("+ 200px");
  expect(frames.body[2].transform).toContain("+ 20px");
  expect(frames.body[2].transform).toContain("scale(3.6)");
  expect(frames.fragments.length).toBeLessThanOrEqual(16);
});
