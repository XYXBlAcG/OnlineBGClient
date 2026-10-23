import { expect, it } from "vitest";
import { mapZoom, zoomScroll } from "../src/client/map-view";
it("bounds map zoom and keeps the pinch anchor at the same screen position", () => {
  expect(mapZoom(0.1)).toBe(0.25);
  expect(mapZoom(10)).toBe(4);
  expect(mapZoom(1.75)).toBe(1.75);
  expect(zoomScroll({ left: 80, top: 40, x: 100, y: 60, zoom: 1 }, 2)).toEqual({
    left: 260,
    top: 140,
  });
  expect(zoomScroll({ left: 0, top: 0, x: 50, y: 50, zoom: 2 }, 1)).toEqual({
    left: 0,
    top: 0,
  });
});
it("preserves a map's relative center when rotating and clamps it inside the new bounds", async () => {
  const { resizeScroll } = await import("../src/client/map-view");
  expect(
    resizeScroll(
      {
        left: 200,
        top: 100,
        width: 400,
        height: 300,
        scrollWidth: 1000,
        scrollHeight: 800,
      },
      { width: 700, height: 200, scrollWidth: 1400, scrollHeight: 500 },
    ),
  ).toEqual({ left: 210, top: 56.25 });
  expect(
    resizeScroll(
      {
        left: 0,
        top: 0,
        width: 400,
        height: 300,
        scrollWidth: 400,
        scrollHeight: 300,
      },
      { width: 700, height: 200, scrollWidth: 700, scrollHeight: 200 },
    ),
  ).toEqual({ left: 0, top: 0 });
});
