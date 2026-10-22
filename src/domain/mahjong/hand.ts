import Majiang from "@kobalab/majiang-core";
import {
  tileCounts,
  tileSuit,
  tileType,
  type MahjongMeld,
  type MahjongOptions,
  type MahjongScore,
} from "./types";
const { Shoupai, Util } = Majiang;
const cache = new Map<string, number>();
export function shanten(tiles: number[], open = 0): number {
  const counts = tileCounts(tiles),
    key = `${open}:${counts.join("")}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const text =
    ["m", "p", "s"]
      .map(
        (s, i) =>
          s +
          counts
            .slice(i * 9, i * 9 + 9)
            .map((n, j) => String(j + 1).repeat(n))
            .join(""),
      )
      .join("") + ",z111+".repeat(open);
  const normal = Util.xiangting_yiban(Shoupai.fromString(text));
  const pairs = open
    ? Infinity
    : 6 - counts.reduce((sum, n) => sum + Math.floor(n / 2), 0);
  const value = Math.min(normal, pairs);
  if (cache.size >= 12000) cache.clear();
  cache.set(key, value);
  return value;
}
export function analyzeHand(
  tiles: number[],
  melds: MahjongMeld[],
  lack: number,
  options: MahjongOptions = { cap: 3, selfDraw: "base" },
  context: {
    self?: boolean;
    kongDraw?: boolean;
    kongDiscard?: boolean;
    rob?: boolean;
    last?: boolean;
  } = {},
): MahjongScore | null {
  if (
    lack < 0 ||
    tiles.some((t) => t < 0 || tileSuit(t) === lack) ||
    melds.some((m) => m.tiles.some((t) => t >= 0 && tileSuit(t) === lack)) ||
    tiles.length !== 14 - melds.length * 3 ||
    shanten(tiles, melds.length) !== -1
  )
    return null;
  const counts = tileCounts(tiles),
    all = [...tiles, ...melds.flatMap((m) => m.tiles)],
    allCounts = tileCounts(all),
    labels: string[] = [];
  let fan = 0;
  const pairs = !melds.length && counts.every((n) => n % 2 === 0);
  if (pairs) {
    const roots = counts.filter((n) => n === 4).length;
    labels.push(roots ? "龙七对" : "七对");
    fan += 2 + roots;
  } else {
    const triplets =
      counts.filter((n) => n % 3 === 2).length === 1 &&
      counts.every((n) => n % 3 !== 1);
    if (triplets) {
      labels.push("对对胡");
      fan++;
    }
    if (melds.length === 4) {
      labels.push("金钩钓");
      fan++;
    }
    const roots = allCounts.filter((n) => n === 4).length;
    if (roots) {
      labels.push(`${roots}根`);
      fan += roots;
    }
  }
  if (new Set(all.map(tileSuit)).size === 1) {
    labels.push("清一色");
    fan += 2;
  }
  for (const [enabled, name] of [
    [context.kongDraw, "杠上花"],
    [context.kongDiscard, "杠上炮"],
    [context.rob, "抢杠胡"],
    [context.last, "海底"],
  ] as const)
    if (enabled) {
      labels.push(name);
      fan++;
    }
  if (!labels.length) labels.push("平胡");
  if (context.self && options.selfDraw === "fan") {
    fan++;
    labels.push("自摸加番");
  }
  const value =
    2 ** Math.min(options.cap, fan) +
    (context.self && options.selfDraw === "base" ? 1 : 0);
  return { fan, labels, value };
}
export function winningTiles(
  tiles: number[],
  melds: MahjongMeld[],
  lack: number,
  options?: MahjongOptions,
): { type: number; score: MahjongScore }[] {
  const counts = tileCounts([...tiles, ...melds.flatMap((m) => m.tiles)]);
  const result: { type: number; score: MahjongScore }[] = [];
  for (let type = 0; type < 27; type++) {
    if (counts[type] >= 4 || Math.floor(type / 9) === lack) continue;
    const score = analyzeHand([...tiles, type * 4], melds, lack, options);
    if (score) result.push({ type, score });
  }
  return result;
}
