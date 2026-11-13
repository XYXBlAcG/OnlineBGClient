import { expect, it } from "vitest";
import { generateMap } from "../src/domain/expedition/map";
import {
  pointOnCurves,
  routeLayout,
} from "../src/client/expedition/map-layout";
it("相邻连线、捷径和回溯的曲线都不进入节点牌面", () => {
  for (let seed = 0; seed < 20; seed++)
    for (let chapter = 0; chapter < 3; chapter++) {
      const map = generateMap(String(seed), 2, chapter),
        layout = routeLayout(map);
      expect(layout.links).toHaveLength(
        map.flat().reduce((count, n) => count + n.next.length, 0),
      );
      for (const edge of layout.links) {
        const from = layout.points.get(edge.from)!,
          to = layout.points.get(edge.to)!,
          coordinates = edge.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number),
          ys = coordinates.filter((_, i) => i % 2 === 1);
        expect(coordinates[0]).toBeCloseTo(from.x);
        expect(coordinates.at(-2)).toBeCloseTo(to.x);
        if (edge.shortcut || edge.backward) {
          let collision: { x: number; y: number } | undefined;
          for (let index = 1; index < 50 && !collision; index++) {
            const point = pointOnCurves(edge.curves, index / 50);
            for (const rect of layout.points.values()) {
              if (
                Math.abs(rect.x - point.x) < layout.nodeWidth / 2 - 2 &&
                Math.abs(rect.y - point.y) < layout.nodeHeight / 2 - 2
              ) {
                collision = point;
                break;
              }
            }
          }
          expect(
            collision,
            `seed ${seed}, chapter ${chapter}: ${edge.from} → ${edge.to}`,
          ).toBeUndefined();
          continue;
        }
        for (const y of ys) {
          expect(y).toBeLessThan(from.y - layout.nodeHeight / 2);
          expect(y).toBeGreaterThan(to.y + layout.nodeHeight / 2);
        }
      }
    }
});
it("横屏地图从左到右推进，连线不穿过节点", () => {
  for (let seed = 0; seed < 20; seed++)
    for (let chapter = 0; chapter < 3; chapter++) {
      const map = generateMap(String(seed), 2, chapter),
        layout = routeLayout(map, "landscape");
      expect(layout.orientation).toBe("landscape");
      for (let floor = 0; floor < map.length; floor++)
        for (const node of map[floor])
          expect(layout.points.get(node.id)!.x).toBeCloseTo(
            layout.floors[floor],
          );
      for (const edge of layout.links) {
        const from = layout.points.get(edge.from)!,
          to = layout.points.get(edge.to)!;
        if (!edge.backward) expect(to.x).toBeGreaterThan(from.x);
        let collision: { x: number; y: number } | undefined;
        for (let index = 0; index < 50 && !collision; index++) {
          const point = pointOnCurves(edge.curves, index / 50);
          for (const rect of layout.points.values()) {
            if (
              Math.abs(rect.x - point.x) < layout.nodeWidth / 2 - 2 &&
              Math.abs(rect.y - point.y) < layout.nodeHeight / 2 - 2
            ) {
              collision = point;
              break;
            }
          }
        }
        expect(
          collision,
          `seed ${seed}, chapter ${chapter}: ${edge.from} → ${edge.to}`,
        ).toBeUndefined();
      }
    }
});
