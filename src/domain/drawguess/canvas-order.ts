import type { DrawFill, DrawStroke } from "./types";

export function nextCanvasOrder(strokes: readonly DrawStroke[], fills: readonly DrawFill[]) {
  return 1 + Math.max(0, ...strokes.map((stroke) => stroke.order ?? 0), ...fills.map((fill) => fill.order ?? 0));
}

export function orderedCanvasLayer(strokes: DrawStroke[], fills: DrawFill[], layer: number) {
  return [
    ...fills.filter((fill) => fill.layer === layer).map((fill) => ({ fill, order: fill.order ?? 0 })),
    ...strokes.filter((stroke) => (stroke.layer ?? 0) === layer).map((stroke) => ({ stroke, order: stroke.order ?? 0 })),
  ].sort((a, b) => a.order - b.order);
}
