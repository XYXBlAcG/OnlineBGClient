import type { MapNode } from "../../domain/expedition/adventure-types";
export function routeLayout(map: MapNode[][]) {
  const width = 720,
    height = 1440,
    nodeWidth = 94,
    nodeHeight = 78;
  const floors = map.map((_, floor) => 70 + (map.length - 1 - floor) * 116);
  const points = new Map(
    map.flat().map((node) => [
      node.id,
      {
        x: 60 + ((node.lane + 0.5) / map[node.floor].length) * 600,
        y: floors[node.floor],
      },
    ]),
  );
  return { width, height, nodeWidth, nodeHeight, floors, points };
}
