import { expect, it } from "vitest";
import { generateMap } from "../src/domain/expedition/map";
import { routeLayout } from "../src/client/expedition/map-layout";
it("每条连线的端点与控制点都留在相邻节点行之间，不进入节点牌面", () => {
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
        for (const y of ys) {
          expect(y).toBeLessThan(from.y - layout.nodeHeight / 2);
          expect(y).toBeGreaterThan(to.y + layout.nodeHeight / 2);
        }
      }
    }
});
