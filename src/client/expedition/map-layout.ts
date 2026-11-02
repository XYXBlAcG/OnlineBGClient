import type { MapNode } from "../../domain/expedition/adventure-types";
export function routeLayout(map: MapNode[][]) {
  const width = Math.max(
      720,
      120 + Math.max(...map.map((row) => row.length)) * 108,
    ),
    height = 164 + (map.length - 1) * 116,
    nodeWidth = 94,
    nodeHeight = 78;
  const floors = map.map((_, floor) => 70 + (map.length - 1 - floor) * 116);
  const points = new Map(
    map.flat().map((node) => [
      node.id,
      {
        x: 60 + ((node.lane + 0.5) / map[node.floor].length) * (width - 120),
        y: floors[node.floor],
      },
    ]),
  );
  const links = map.flatMap((row) =>
    row.flatMap((node) =>
      node.next.map((id) => {
        const from = points.get(node.id)!,
          to = points.get(id)!,
          start = from.y - nodeHeight / 2 - 6,
          end = to.y + nodeHeight / 2 + 6,
          bend = (start - end) * 0.45;
        return {
          from: node.id,
          to: id,
          path: `M${from.x},${start} C${from.x},${start - bend} ${to.x},${end + bend} ${to.x},${end}`,
        };
      }),
    ),
  );
  return { width, height, nodeWidth, nodeHeight, floors, points, links };
}
