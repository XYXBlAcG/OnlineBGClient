import type { MapNode } from "../../domain/expedition/adventure-types";

type Point = { x: number; y: number };
type Curve = { start: Point; c1: Point; c2: Point; end: Point };

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

export function routeLayout(map: MapNode[][]) {
  const width = Math.max(
      720,
      160 + Math.max(...map.map((row) => row.length)) * 128,
    ),
    height = 200 + (map.length - 1) * 196,
    nodeWidth = 94,
    nodeHeight = 78;
  const floors = map.map((_, floor) => 88 + (map.length - 1 - floor) * 196);
  const points = new Map(
    map.flat().map((node) => [
      node.id,
      {
        x: 80 + ((node.lane + 0.5) / map[node.floor].length) * (width - 160),
        y: floors[node.floor],
      },
    ]),
  );
  const links = map
    .flatMap((row) =>
      row.flatMap((node) =>
        node.next.map((id, edgeIndex) => {
          const from = points.get(node.id)!,
            to = points.get(id)!,
            backward = to.y > from.y,
            shortcut = !map[node.floor + 1]?.some(
              (candidate) => candidate.id === id,
            ),
            direction = Math.sign(to.y - from.y) || -1,
            start = {
              x: from.x,
              y: from.y + direction * (nodeHeight / 2 + 7),
            },
            end = {
              x: to.x,
              y: to.y - direction * (nodeHeight / 2 + 7),
            },
            laneOffset =
              (((node.floor + node.lane + edgeIndex + id.length) % 3) - 1) * 7;
          if (backward || shortcut) {
            const side = to.x >= from.x ? 1 : -1,
              corridor =
                side > 0 ? width - 24 - edgeIndex * 8 : 24 + edgeIndex * 8,
              sourceGap =
                from.y + direction * (nodeHeight / 2 + 22) + laneOffset,
              targetGap = to.y - direction * (nodeHeight / 2 + 22) + laneOffset,
              sourceCorner = {
                x: corridor,
                y: sourceGap,
              },
              targetCorner = {
                x: corridor,
                y: targetGap,
              },
              curves: Curve[] = [
                {
                  start,
                  c1: {
                    x: from.x + side * 20,
                    y: start.y + direction * 8,
                  },
                  c2: {
                    x: corridor,
                    y: sourceGap,
                  },
                  end: sourceCorner,
                },
                {
                  start: sourceCorner,
                  c1: {
                    x: corridor + side * 12,
                    y: sourceGap + (targetGap - sourceGap) * 0.34,
                  },
                  c2: {
                    x: corridor + side * 12,
                    y: targetGap - (targetGap - sourceGap) * 0.34,
                  },
                  end: targetCorner,
                },
                {
                  start: targetCorner,
                  c1: {
                    x: corridor,
                    y: targetGap,
                  },
                  c2: {
                    x: to.x + side * 20,
                    y: end.y - direction * 8,
                  },
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
          const half = (end.y - start.y) / 2,
            curves: Curve[] = [
              {
                start,
                c1: {
                  x: from.x + laneOffset * 0.35,
                  y: start.y + half * 0.38,
                },
                c2: {
                  x: to.x + laneOffset * 0.35,
                  y: end.y - half * 0.38,
                },
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
  return { width, height, nodeWidth, nodeHeight, floors, points, links };
}
