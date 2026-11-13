import type { MapNode } from "../../domain/expedition/adventure-types";

type Point = { x: number; y: number };
type Curve = { start: Point; c1: Point; c2: Point; end: Point };
export type RouteOrientation = "portrait" | "landscape";

function pathFromCurves(curves: readonly Curve[]) {
  return curves
    .map(
      (curve, index) =>
        `${index ? "" : `M${curve.start.x},${curve.start.y} `}C${curve.c1.x},${curve.c1.y} ${curve.c2.x},${curve.c2.y} ${curve.end.x},${curve.end.y}`,
    )
    .join(" ");
}

export function pointOnCurves(curves: readonly Curve[], step: number): Point {
  const scaled = Math.max(0, Math.min(1, step)) * curves.length,
    index = Math.min(curves.length - 1, Math.floor(scaled)),
    curve = curves[index],
    t = curves.length === 1 ? step : scaled - index,
    inverse = 1 - t;
  return {
    x:
      inverse ** 3 * curve.start.x +
      3 * inverse ** 2 * t * curve.c1.x +
      3 * inverse * t ** 2 * curve.c2.x +
      t ** 3 * curve.end.x,
    y:
      inverse ** 3 * curve.start.y +
      3 * inverse ** 2 * t * curve.c1.y +
      3 * inverse * t ** 2 * curve.c2.y +
      t ** 3 * curve.end.y,
  };
}

export function routeLayout(
  map: MapNode[][],
  orientation: RouteOrientation = "portrait",
) {
  const horizontal = orientation === "landscape",
    lanes = Math.max(...map.map((row) => row.length)),
    width = horizontal
      ? 200 + (map.length - 1) * 196
      : Math.max(720, 160 + lanes * 128),
    height = horizontal
      ? Math.max(360, 140 + lanes * 112)
      : 200 + (map.length - 1) * 196,
    nodeWidth = 94,
    nodeHeight = 78,
    halfAlong = (horizontal ? nodeWidth : nodeHeight) / 2,
    floors = map.map((_, floor) =>
      horizontal ? 100 + floor * 196 : 88 + (map.length - 1 - floor) * 196,
    ),
    place = (along: number, across: number): Point =>
      horizontal ? { x: along, y: across } : { x: across, y: along },
    alongOf = (point: Point) => (horizontal ? point.x : point.y),
    acrossOf = (point: Point) => (horizontal ? point.y : point.x);
  const points = new Map(
    map.flat().map((node) => {
      const count = map[node.floor].length,
        across = horizontal
          ? 70 + ((node.lane + 0.5) / count) * (height - 140)
          : 80 + ((node.lane + 0.5) / count) * (width - 160);
      return [node.id, place(floors[node.floor], across)];
    }),
  );
  const links = map
    .flatMap((row) =>
      row.flatMap((node) =>
        node.next.map((id, edgeIndex) => {
          const from = points.get(node.id)!,
            to = points.get(id)!,
            fromAlong = alongOf(from),
            toAlong = alongOf(to),
            backward = horizontal ? toAlong < fromAlong : toAlong > fromAlong,
            shortcut = !map[node.floor + 1]?.some(
              (candidate) => candidate.id === id,
            ),
            direction = Math.sign(toAlong - fromAlong) || (horizontal ? 1 : -1),
            laneOffset =
              (((node.floor + node.lane + edgeIndex + id.length) % 3) - 1) * 7;
          if (backward || shortcut) {
            const side = acrossOf(to) >= acrossOf(from) ? 1 : -1,
              corridor =
                side > 0
                  ? (horizontal ? height : width) - 24 - edgeIndex * 8
                  : 24 + edgeIndex * 8,
              sourceGap = fromAlong + direction * (halfAlong + 22) + laneOffset,
              targetGap = toAlong - direction * (halfAlong + 22) + laneOffset,
              start = place(
                fromAlong + direction * (halfAlong + 7),
                acrossOf(from),
              ),
              end = place(toAlong - direction * (halfAlong + 7), acrossOf(to)),
              sourceCorner = place(sourceGap, corridor),
              targetCorner = place(targetGap, corridor),
              curves: Curve[] = [
                {
                  start,
                  c1: place(
                    alongOf(start) + direction * 8,
                    acrossOf(from) + side * 20,
                  ),
                  c2: sourceCorner,
                  end: sourceCorner,
                },
                {
                  start: sourceCorner,
                  c1: place(
                    sourceGap + (targetGap - sourceGap) * 0.34,
                    corridor + side * 12,
                  ),
                  c2: place(
                    targetGap - (targetGap - sourceGap) * 0.34,
                    corridor + side * 12,
                  ),
                  end: targetCorner,
                },
                {
                  start: targetCorner,
                  c1: targetCorner,
                  c2: place(
                    alongOf(end) - direction * 8,
                    acrossOf(to) + side * 20,
                  ),
                  end,
                },
              ];
            return {
              from: node.id,
              to: id,
              shortcut,
              backward,
              curves,
              path: pathFromCurves(curves),
            };
          }
          const start = place(
              fromAlong + direction * (halfAlong + 7),
              acrossOf(from),
            ),
            end = place(toAlong - direction * (halfAlong + 7), acrossOf(to)),
            span = alongOf(end) - alongOf(start),
            curves: Curve[] = [
              {
                start,
                c1: place(
                  alongOf(start) + span * 0.19,
                  acrossOf(from) + laneOffset * 0.35,
                ),
                c2: place(
                  alongOf(end) - span * 0.19,
                  acrossOf(to) + laneOffset * 0.35,
                ),
                end,
              },
            ];
          return {
            from: node.id,
            to: id,
            shortcut,
            backward,
            curves,
            path: pathFromCurves(curves),
          };
        }),
      ),
    )
    .sort(
      (left, right) =>
        Number(left.shortcut || left.backward) -
        Number(right.shortcut || right.backward),
    );
  return {
    orientation,
    width,
    height,
    nodeWidth,
    nodeHeight,
    floors,
    floorLabels: floors.map((along) =>
      horizontal ? { x: along, y: 34 } : { x: 12, y: along },
    ),
    points,
    links,
  };
}
