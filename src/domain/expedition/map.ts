import {
  expeditionDifficulties,
  type ExpeditionRun,
  type MapNode,
  type NodeKind,
} from "./adventure-types";
import { shuffled } from "./random";
import { creatures, type CreatureId } from "./world";
import type { EncounterDefinition } from "./content";
export function generateMap(seed: string, layout: 1 | 2 = 2): MapNode[][] {
  const kinds: NodeKind[][] = [
    ["battle"],
    ["battle", "event", "shop"],
    ["battle", "elite", "event"],
    ["camp"],
    ["battle", "shop", "event"],
    ["treasure"],
    ["battle", "elite", "event"],
    ["camp"],
    ["elite", "event", "shop"],
    ["battle", "event"],
    ["camp"],
    ["boss"],
  ];
  const widths = kinds.map((_, floor) =>
    layout === 1
      ? 3
      : floor === 11
        ? 1
        : shuffled(
            floor === 0 ? [2, 3] : [2, 3, 4, 5, 6],
            `${seed}:width:${floor}`,
          )[0],
  );
  const map: MapNode[][] = kinds.map((choices, floor) =>
    Array.from({ length: widths[floor] }, (_, lane) => ({
      id: `f${floor}-${lane}`,
      floor,
      lane,
      kind: shuffled(choices, `${seed}:map:${floor}:${lane}`)[0],
      next: [],
    })),
  );
  for (let floor = 0; floor < 11; floor++) {
    const layer = map[floor],
      next = map[floor + 1];
    for (const node of layer) {
      const position = (node.lane + 0.5) / layer.length;
      node.next =
        layout === 1
          ? next
              .filter((to) => Math.abs(to.lane - node.lane) <= 1)
              .map((to) => to.id)
          : [...next]
              .sort(
                (a, b) =>
                  Math.abs((a.lane + 0.5) / next.length - position) -
                  Math.abs((b.lane + 0.5) / next.length - position),
              )
              .slice(0, shuffled([1, 2], `${seed}:edges:${node.id}`)[0])
              .map((to) => to.id);
    }
    if (layout === 2)
      for (const target of next)
        if (!layer.some((node) => node.next.includes(target.id))) {
          const nearest = [...layer].sort(
            (a, b) =>
              Math.abs(
                (a.lane + 0.5) / layer.length -
                  (target.lane + 0.5) / next.length,
              ) -
              Math.abs(
                (b.lane + 0.5) / layer.length -
                  (target.lane + 0.5) / next.length,
              ),
          )[0];
          nearest.next.push(target.id);
        }
  }
  return map;
}
export function mapChoices(run: ExpeditionRun): MapNode[] {
  if (!run.current) return run.map[0];
  const current = run.map.flat().find((node) => node.id === run.current)!;
  return run.map.flat().filter((node) => current.next.includes(node.id));
}
export function encounterFor(
  run: ExpeditionRun,
  node: MapNode,
): EncounterDefinition {
  const rank =
    node.kind === "boss" ? "boss" : node.kind === "elite" ? "elite" : "normal";
  const pool = (Object.keys(creatures) as CreatureId[]).filter(
    (id) => creatures[id].rank === rank,
  );
  const players = run.combat.heroes.length,
    count =
      rank === "boss"
        ? Math.min(2, players)
        : Math.min(3, Math.ceil(players * 0.65));
  const choices = shuffled(pool, `${run.seed}:${node.id}:creatures`);
  const difficulty = expeditionDifficulties[run.difficulty].multiplier;
  const enemies = Array.from({ length: count }, (_, index) => {
    const base = creatures[choices[index % choices.length]],
      partyHp = 0.2 + (0.8 * players) / count;
    return {
      name: base.name,
      icon: base.icon,
      hp: Math.round(base.hp * partyHp * (1 + node.floor * 0.045) * difficulty),
      pattern: base.pattern.map((intent, step) => ({
        ...intent,
        amount: Math.max(
          1,
          Math.round(
            intent.amount *
              (intent.kind === "attack"
                ? difficulty * (1 + node.floor * 0.025)
                : 1),
          ),
        ),
        target:
          intent.target === "all"
            ? ("all" as const)
            : (index + step + node.floor) % players,
      })),
    };
  });
  return {
    name:
      rank === "boss"
        ? enemies[0].name
        : rank === "elite"
          ? "精英 · " + enemies[0].name
          : `第 ${node.floor + 1} 层 · 遗迹交锋`,
    subtitle:
      rank === "boss"
        ? "章末决战"
        : rank === "elite"
          ? "危险遭遇 · 胜利后获得共享遗物"
          : "普通遭遇",
    enemies,
  };
}

export const nodeNames: Record<NodeKind, string> = {
  battle: "战斗",
  elite: "精英",
  boss: "首领",
  event: "奇遇",
  shop: "商店",
  camp: "营地",
  treasure: "宝藏",
};
export const nodeIcons: Record<NodeKind, string> = {
  battle: "⚔",
  elite: "♜",
  boss: "♛",
  event: "?",
  shop: "◈",
  camp: "♨",
  treasure: "✦",
};
