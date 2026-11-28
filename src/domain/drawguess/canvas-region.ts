import { z } from "zod";
import { drawHeight, drawWidth, type DrawPoint } from "./types";

export const regionRunStride = 1024;
export const regionRunLimit = 8000;

export const drawRegionSchema = z.object({
  color: z.string().regex(/^#[\da-f]{6}$/i),
  runs: z.array(z.number().int().min(0).max(drawWidth * drawHeight * regionRunStride - 1)).min(1).max(regionRunLimit),
}).refine(({ runs }) => {
  let next = 0;
  for (const run of runs) {
    const start = Math.floor(run / regionRunStride);
    const length = (run % regionRunStride) + 1;
    if (start < next || start % drawWidth + length > drawWidth) return false;
    next = start + length;
  }
  return true;
}, "填充范围无效");
export type DrawRegion = z.infer<typeof drawRegionSchema>;

export function canvasRegion(rgba: Uint8ClampedArray, width: number, height: number, [x, y]: DrawPoint): number[] | null {
  const origin = Math.floor(y) * width + Math.floor(x);
  if (x < 0 || y < 0 || x >= width || y >= height) return [];
  const mark = new Uint8Array(width * height);
  const waiting = new Int32Array(width * height);
  let end = 0;
  const reference = origin * 4;
  const visit = (pixel: number) => {
    if (mark[pixel]) return;
    const at = pixel * 4;
    mark[pixel] = 1;
    for (let channel = 0; channel < 4; channel++)
      if (Math.abs(rgba[at + channel]! - rgba[reference + channel]!) > 24) return;
    mark[pixel] = 2;
    waiting[end++] = pixel;
  };
  visit(origin);
  for (let head = 0; head < end; head++) {
    const pixel = waiting[head]!;
    const column = pixel % width;
    if (column > 0) visit(pixel - 1);
    if (column + 1 < width) visit(pixel + 1);
    if (pixel >= width) visit(pixel - width);
    if (pixel + width < mark.length) visit(pixel + width);
  }
  const runs: number[] = [];
  for (let line = 0; line < height; line++) {
    const rowEnd = (line + 1) * width;
    for (let at = line * width; at < rowEnd; at++) {
      if (mark[at] !== 2) continue;
      const start = at;
      while (at + 1 < rowEnd && mark[at + 1] === 2) at++;
      runs.push(start * regionRunStride + at - start);
      if (runs.length > regionRunLimit) return null;
    }
  }
  return runs;
}
