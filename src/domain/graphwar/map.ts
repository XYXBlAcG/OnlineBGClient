import { balance } from "./balance";
import {
  battlefield,
  type GraphwarOptions,
  type Circle,
  type Soldier,
  type Point,
} from "./types";
import { containsTerrain, distance, BattlefieldIndex } from "./trajectory";
export function battlefieldQuality(
  terrain: Circle[],
  width: number,
  height: number,
) {
  const columns = 48,
    rows = 32,
    blocked = Array.from({ length: columns }, (_, x) =>
      Array.from({ length: rows }, (_, y) =>
        containsTerrain(
          { terrain, craters: [] },
          {
            x: -width * 0.48 + (width * 0.96 * x) / (columns - 1),
            y: -height * 0.46 + (height * 0.92 * y) / (rows - 1),
          },
          balance.soldierRadius,
        ),
      ),
    );
  const field = new BattlefieldIndex({ terrain, craters: [] });
  const at = (x: number, y: number) => ({
    x: -width * 0.48 + (width * 0.96 * x) / (columns - 1),
    y: -height * 0.46 + (height * 0.92 * y) / (rows - 1),
  });
  const counts = [0, 0];
  for (let x = 0; x < columns; x++)
    for (const b of blocked[x]) if (b) counts[x < columns / 2 ? 0 : 1]++;
  let reachable = new Set(
    Array.from({ length: rows }, (_, i) => i).filter((y) => !blocked[0][y]),
  );
  for (let x = 1; x < columns && reachable.size; x++) {
    const next = new Set<number>();
    for (const y of reachable)
      for (let k = -1; k <= 1; k++)
        if (
          y + k >= 0 &&
          y + k < rows &&
          !blocked[x][y + k] &&
          !field.sweep(at(x - 1, y), at(x, y + k), balance.soldierRadius)
        )
          next.add(y + k);
    const queue = [...next];
    for (let head = 0; head < queue.length; head++)
      for (const dy of [-1, 1]) {
        const y = queue[head] + dy;
        if (
          y >= 0 &&
          y < rows &&
          !next.has(y) &&
          !blocked[x][y] &&
          !field.sweep(at(x, queue[head]), at(x, y), balance.soldierRadius)
        ) {
          next.add(y);
          queue.push(y);
        }
      }
    reachable = next;
  }
  return {
    passage: reachable.size > 0,
    coverDifference: Math.abs(counts[0] - counts[1]) / ((columns * rows) / 2),
    coverage: (counts[0] + counts[1]) / (columns * rows),
  };
}
export function generateBattlefield(
  players: number,
  options: GraphwarOptions,
  random: () => number,
) {
  const bounds = battlefield({ options }),
    teams = Array.from({ length: players }, (_, i) => i % 2);
  const gaussian = () =>
    Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random()))) *
    Math.cos(2 * Math.PI * random());
  for (let layout = 0; layout < 60; layout++) {
    const terrain: Circle[] = [],
      count = options.map === "open" ? 0 : bounds.obstacles;
    let center = { x: 0, y: 0 };
    for (let i = 0; i < count; i++) {
      if (i % 3 === 0)
        center = {
          x: (random() - 0.5) * bounds.width * 0.86,
          y: (random() - 0.5) * bounds.height * 0.88,
        };
      const radius = Math.max(
        0.65,
        Math.min(
          bounds.width * 0.055,
          (options.map === "fortress" ? 2.1 : 1.45) +
            gaussian() * bounds.width * 0.009,
        ),
      );
      terrain.push({
        x: Math.max(
          -bounds.width * 0.46,
          Math.min(bounds.width * 0.46, center.x + gaussian() * 3),
        ),
        y: Math.max(
          -bounds.height * 0.43,
          Math.min(bounds.height * 0.43, center.y + gaussian() * 2.5),
        ),
        radius,
        permanent: i % 13 === 0,
      });
    }
    const quality = battlefieldQuality(terrain, bounds.width, bounds.height);
    if (
      !quality.passage ||
      quality.coverDifference > 0.12 ||
      quality.coverage > 0.48
    )
      continue;
    const soldiers: Soldier[] = [];
    let failed = false;
    for (let slot = 0; slot < options.soldiers && !failed; slot++)
      for (let player = 0; player < players; player++) {
        let best: Point | undefined,
          bestScore = -Infinity;
        for (let attempt = 0; attempt < 320; attempt++) {
          const p = {
            x:
              (teams[player] === 0 ? -1 : 1) *
              bounds.width *
              (0.07 + random() * 0.39),
            y: (random() - 0.5) * bounds.height * 0.88,
          };
          if (containsTerrain({ terrain, craters: [] }, p, 1.5)) continue;
          const nearest = Math.min(...soldiers.map((s) => distance(s, p)));
          if (nearest < 4.1) continue;
          const cover = Math.min(
            ...terrain.map((c) => distance(c, p) - c.radius),
          );
          const score = Math.min(nearest, 12) + Math.min(5, cover) * 0.2;
          if (score > bestScore) {
            best = p;
            bestScore = score;
          }
        }
        if (!best) {
          failed = true;
          break;
        }
        soldiers.push({
          ...best,
          id: player * balance.maxSoldiers + slot,
          player,
          hp: balance.hp,
          guardUntil: 0,
        });
      }
    if (!failed)
      return { terrain, soldiers: soldiers.sort((a, b) => a.id - b.id), teams };
  }
  throw new Error("战场无法安全部署，请选择大型地图或减少兵力后重试");
}
