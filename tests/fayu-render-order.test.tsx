import { expect, it, vi } from "vitest";
import { CanvasSurface, canvasPoint } from "../src/client/fayu/canvas-surface";
import type { DrawStroke } from "../src/domain/drawguess/types";

function setup() {
  const frames: FrameRequestCallback[] = [];
  let compositeDraws = 0;
  const paints: { target: string; kind: string; composite: string; at?: number }[] = [];
  const makeCanvas = (target: string) => {
    let x = 0;
    const context = {
      globalCompositeOperation: "source-over",
      save() {}, restore() {}, clearRect() {}, fillRect() {}, setTransform() {},
      drawImage() { if (target === "composite") compositeDraws++; },
      beginPath() {}, lineTo() {}, quadraticCurveTo() {}, setLineDash() {},
      getImageData(_x: number, _y: number, width: number, height: number) { return { width, height }; },
      moveTo(value: number) { x = value; },
      stroke() { paints.push({ target, kind: "stroke", composite: this.globalCompositeOperation, at: x }); },
    };
    return { width: 1000, height: 625, getContext: () => context } as unknown as HTMLCanvasElement;
  };
  vi.stubGlobal("document", { createElement: () => makeCanvas("layer") });
  vi.stubGlobal("requestAnimationFrame", (handler: FrameRequestCallback) => frames.push(handler));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const surface = new CanvasSurface(makeCanvas("composite"));
  return { surface, paints, compositeDraws: () => compositeDraws, draw: () => frames.shift()?.(0) };
}

const pen: DrawStroke = { id: "pen", ink: "ink", nextPart: 1, points: [[10, 8], [20, 8]] };

it("repaints moved ink with the same ID and keeps eraser previews on the active layer", () => {
  const { surface, paints, draw } = setup();
  try {
    const strokes = [pen, { ...pen, id: "upper", layer: 1 }] as const;
    surface.schedule({ strokes: [...strokes], fills: [] });
    draw();
    expect(paints).toHaveLength(2);
    paints.length = 0;
    const moved = { ...pen, points: [[30, 8], [40, 8]] as DrawStroke["points"] };
    const committed = [moved, strokes[1]];
    surface.schedule({ strokes: committed, fills: [] });
    draw();
    expect(paints).toEqual([{ target: "layer", kind: "stroke", composite: "source-over", at: 30 }]);
    paints.length = 0;
    surface.schedule({ strokes: committed, fills: [], draft: { ...pen, id: "erase", tool: "eraser" } });
    draw();
    expect(paints).toEqual([{ target: "layer", kind: "stroke", composite: "destination-out", at: 10 }]);
  } finally {
    surface.dispose();
    vi.unstubAllGlobals();
  }
});

it("uses the centered paper when the available canvas has letterboxing", () => {
  const rect = { left: 20, top: 40, width: 200, height: 200 };
  expect(canvasPoint(rect, 120, 140)).toEqual([500, 312.5]);
  expect(canvasPoint(rect, 120, 41)[1]).toBeLessThan(0);
});

it("samples only visible layers for filling without repainting the displayed canvas", async () => {
  const { surface, paints, compositeDraws } = setup();
  try {
    const frame = await surface.pixels({
      strokes: [pen, { ...pen, id: "hidden", layer: 1, points: [[32, 8], [42, 8]] }],
      fills: [],
      layers: [{ id: 0, name: "底稿" }, { id: 1, name: "隐藏", hidden: true }],
    });
    expect(frame).toMatchObject({ width: 1000, height: 625 });
    expect(paints.map(({ at }) => at)).toEqual([10]);
    expect(compositeDraws()).toBe(0);
  } finally {
    surface.dispose();
    vi.unstubAllGlobals();
  }
});
