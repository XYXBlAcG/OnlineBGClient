import { drawHeight, drawWidth, type DrawPoint, type DrawStroke } from "./types";

function outline(stroke: DrawStroke): DrawPoint[] {
  const start = stroke.points[0];
  if (!start) return [];
  const finish = stroke.points.at(-1)!;
  const [x, y] = start;
  const [endX, endY] = finish;
  if (stroke.tool === "rect") return [start, [endX, y], finish, [x, endY], start];
  if (stroke.tool === "ellipse") {
    return Array.from({ length: 33 }, (_, i): DrawPoint => {
      const angle = Math.PI * i / 16;
      return [(x + endX + (endX - x) * Math.cos(angle)) / 2, (y + endY + (endY - y) * Math.sin(angle)) / 2];
    });
  }
  if (stroke.tool === "sticker") {
    const half = (stroke.width ?? 12) * 1.6;
    return [[x - half, y - half], [x + half, y - half], [x + half, y + half], [x - half, y + half], [x - half, y - half]];
  }
  return stroke.points;
}

function polygonContains([x, y]: DrawPoint, polygon: DrawPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!, [xj, yj] = polygon[j]!;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const cross = ([ax, ay]: DrawPoint, [bx, by]: DrawPoint, [x, y]: DrawPoint) =>
  (bx - ax) * (y - ay) - (by - ay) * (x - ax);

function intersects(a: DrawPoint, b: DrawPoint, c: DrawPoint, d: DrawPoint) {
  return Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])) <= Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) &&
    Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])) <= Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1])) &&
    cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0;
}

export function lassoHits(stroke: DrawStroke, polygon: DrawPoint[]) {
  if (polygon.length < 3 || stroke.tool === "eraser" || stroke.ink === "erase") return false;
  const path = outline(stroke);
  return path.some((point, index) => polygonContains(point, polygon) ||
    (index > 0 && polygon.some((start, edge) => intersects(path[index - 1]!, point, start, polygon[(edge + 1) % polygon.length]!))));
}

export function selectionBounds(strokes: DrawStroke[], ids: readonly string[]) {
  const points = strokes.filter((stroke) => ids.includes(stroke.id)).flatMap(outline);
  if (!points.length) return undefined;
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

export function selectionDelta(strokes: DrawStroke[], ids: readonly string[], dx: number, dy: number): DrawPoint {
  const bounds = selectionBounds(strokes, ids);
  if (!bounds) return [0, 0];
  return [
    Math.max(-Math.max(0, Math.floor(bounds.left)), Math.min(Math.max(0, Math.floor(drawWidth - bounds.right)), Math.round(dx))),
    Math.max(-Math.max(0, Math.floor(bounds.top)), Math.min(Math.max(0, Math.floor(drawHeight - bounds.bottom)), Math.round(dy))),
  ];
}

export function moveSelection(strokes: DrawStroke[], ids: readonly string[], dx: number, dy: number) {
  const [x, y] = selectionDelta(strokes, ids, dx, dy);
  return x || y ? strokes.map((stroke) => ids.includes(stroke.id)
    ? { ...stroke, points: stroke.points.map(([px, py]): DrawPoint => [px + x, py + y]) } : stroke) : strokes;
}
