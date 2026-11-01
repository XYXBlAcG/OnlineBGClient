import { chapters } from "./chapters";
import {
  expeditionDifficulties,
  type ExpeditionRun,
  type MapNode,
  type NodeKind,
} from "./adventure-types";
import { shuffled } from "./random";
import { creatures, legacyCreatureIds, type CreatureId } from "./world";
import type { Creature } from "./extra-creatures";
import type { EncounterDefinition } from "./content";
export function generateMap(
  seed: string,
  layout: 1 | 2 = 2,
  chapter = 0,
): MapNode[][] {
  const theme = chapters[chapter];
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
  if (chapter > 0) {
    kinds.splice(9, 0, ["battle", "elite", "event"], ["camp"]);
  }
  const widths = kinds.map((_, floor) =>
    chapter > 0 && floor === 6
      ? theme.width
      : layout === 1
        ? 3
        : floor === kinds.length - 1
          ? 1
          : shuffled(
              floor === 0
                ? [2, 3]
                : Array.from({ length: theme.width - 1 }, (_, i) => i + 2),
              `${seed}:width:${floor}`,
            )[0],
  );
  const map: MapNode[][] = kinds.map((choices, floor) =>
    Array.from({ length: widths[floor] }, (_, lane) => ({
      id: `${chapter ? `c${chapter}-` : ""}f${floor}-${lane}`,
      floor,
      lane,
      kind: shuffled(choices, `${seed}:map:${floor}:${lane}`)[0],
      next: [],
    })),
  );
  for (let floor = 0; floor < kinds.length - 1; floor++) {
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
    (id) =>
      creatures[id].rank === rank &&
      (run.campaignVersion === 1
        ? legacyCreatureIds.has(id)
        : ((creatures[id] as Creature).biome ?? "ruins") ===
          chapters[run.chapter].biome),
  );
  const players = run.combat.heroes.length,
    count =
      rank === "boss"
        ? run.campaignVersion === 1
          ? Math.min(2, players)
          : 1 + Math.ceil((players - 1) / 2)
        : Math.min(3, Math.ceil(players * 0.65));
  const choices = shuffled(pool, `${run.seed}:${node.id}:creatures`);
  const difficulty = expeditionDifficulties[run.difficulty].multiplier;
  const enemies = Array.from({ length: count }, (_, index) => {
    const guardPool = (Object.keys(creatures) as CreatureId[]).filter(
      (id) =>
        creatures[id].rank === "normal" &&
        ((creatures[id] as Creature).biome ?? "ruins") ===
          chapters[run.chapter].biome,
    );
    const base =
        creatures[
          rank === "boss" && run.campaignVersion === 2 && index > 0
            ? shuffled(guardPool, `${run.seed}:${node.id}:guards`)[
                (index - 1) % guardPool.length
              ]
            : choices[index % choices.length]
        ],
      partyHp =
        run.campaignVersion === 2 && rank === "boss"
          ? index === 0
            ? 0.6 + 0.4 * players
            : 0.7 + 0.3 * players
          : 0.2 + (0.8 * players) / count;
    const budget =
      run.campaignVersion === 2
        ? chapters[run.chapter]
        : { health: 1, attack: 1 };
    return {
      name: base.name,
      icon: base.icon,
      hp: Math.round(
        base.hp *
          partyHp *
          (1 + node.floor * 0.045) *
          difficulty *
          budget.health,
      ),
      pattern: base.pattern.map((intent, step) => ({
        ...intent,
        amount: Math.max(
          1,
          Math.round(
            intent.amount *
              (intent.kind === "attack"
                ? difficulty * (1 + node.floor * 0.025) * budget.attack
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
          : `第 ${node.floor + 1} 节点 · ${chapters[run.chapter].name}`,
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
