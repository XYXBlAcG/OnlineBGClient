import { chapterAt, endlessScale } from "./chapters";
import {
  expeditionDifficulties,
  type ExpeditionRun,
  type MapNode,
  type NodeKind,
} from "./adventure-types";
import { shuffled } from "./random";
import { creatures, legacyCreatureIds, type CreatureId } from "./world";
import type { Creature } from "./extra-creatures";
import type { EncounterDefinition, EnemyDefinition } from "./content";
import { ascensionProfile } from "./ascension";
import { encounterModifiers, type EncounterModifierId } from "./modifiers";
import {
  routeKind,
  routeProfileIds,
  type RouteProfileId,
} from "./route-profiles";
export function generateMap(
  seed: string,
  layout: 1 | 2 = 2,
  chapter = 0,
): MapNode[][] {
  const theme = chapterAt(chapter);
  const widthCap = Math.min(5, 4 + Math.floor(chapter / 2)),
    rawWidths = Array.from({ length: theme.depth }, (_, floor) => {
      if (layout === 1) return 3;
      if (floor === theme.depth - 1) return 1;
      if (floor === 0) return shuffled([3, 4], `${seed}:width:${floor}`)[0];
      return shuffled(
        Array.from({ length: widthCap - 1 }, (_, index) => index + 2),
        `${seed}:width:${floor}`,
      )[0];
    });
  if (layout === 2) rawWidths[Math.floor(theme.depth * 0.5)] = 4;
  const widths =
    layout === 1
      ? rawWidths
      : rawWidths.map((width, floor) => {
          if (floor === 0 || floor === rawWidths.length - 1) return width;
          return Math.max(
            2,
            Math.min(rawWidths[floor - 1] + 1, width, widthCap),
          );
        });
  if (layout === 2) {
    const wideFloor = Math.floor(theme.depth * 0.5);
    widths[wideFloor - 1] = Math.min(
      widthCap,
      Math.max(3, widths[wideFloor - 1]),
    );
    widths[wideFloor] = widthCap;
  }
  const map: MapNode[][] = widths.map((width, floor) => {
    const profiles = shuffled(routeProfileIds, `${seed}:route-order:${floor}`),
      routes: RouteProfileId[] = [],
      kindFor = (profile: RouteProfileId) =>
        floor === 0
          ? profile === "vanguard" || profile === "slayer"
            ? ("battle" as const)
            : profile === "provision" || profile === "blackmarket"
              ? ("shop" as const)
              : profile === "ritual" || profile === "pilgrimage"
                ? ("event" as const)
                : ("library" as const)
          : routeKind(profile, floor, theme.depth);
    for (let lane = 0; lane < width; lane++) {
      const usedKinds = new Set(routes.map((profile) => kindFor(profile))),
        available = profiles.find(
          (profile) => !usedKinds.has(kindFor(profile)),
        );
      routes.push(available ?? profiles[lane % profiles.length]);
    }
    return Array.from({ length: width }, (_, lane) => {
      const route =
          routes[lane] ?? routeProfileIds[lane % routeProfileIds.length],
        kind = kindFor(route);
      return {
        id: `${chapter ? `c${chapter}-` : ""}f${floor}-${lane}`,
        floor,
        lane,
        kind,
        route,
        next: [],
      };
    });
  });
  if (!map[0].some((node) => node.kind === "battle")) {
    map[0][0].kind = "battle";
    map[0][0].route = "vanguard";
  }
  for (const floor of [3, 7, 10]) {
    if (
      floor >= map.length - 1 ||
      map[floor].some((node) => node.kind === "camp")
    )
      continue;
    const camp = map[floor][0];
    camp.kind = "camp";
    camp.route = "pilgrimage";
  }
  for (let floor = 0; floor < map.length - 1; floor++) {
    const layer = map[floor],
      next = map[floor + 1];
    for (const node of layer) {
      const position = (node.lane + 0.5) / layer.length;
      node.next =
        layout === 1
          ? next
              .filter((to) => Math.abs(to.lane - node.lane) <= 1)
              .map((to) => to.id)
          : (() => {
              const ordered = [...next].sort(
                (a, b) =>
                  Math.abs((a.lane + 0.5) / next.length - position) -
                  Math.abs((b.lane + 0.5) / next.length - position),
              );
              return ordered
                .slice(
                  0,
                  Math.min(
                    2,
                    1 +
                      Number(
                        next.length > 1 &&
                          shuffled(
                            [false, false, true],
                            `${seed}:branch:${node.id}`,
                          )[0],
                      ),
                  ),
                )
                .map((to) => to.id);
            })();
    }
    if (layout === 2)
      for (const target of next)
        if (!layer.some((node) => node.next.includes(target.id))) {
          const nearest = [...layer]
            .filter((node) => node.next.length < 2)
            .sort(
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
          if (nearest) nearest.next.push(target.id);
        }
  }
  for (let floor = 0; floor < map.length - 1; floor++)
    for (const node of map[floor]) {
      const nextFloor = map[floor + 1],
        hasFreeExit = node.next.some((id) => {
          const target = nextFloor.find((candidate) => candidate.id === id);
          return target && target.kind !== "secret";
        });
      if (hasFreeExit) continue;
      const position = (node.lane + 0.5) / map[floor].length,
        target = [...nextFloor]
          .filter((candidate) => candidate.kind !== "secret")
          .sort(
            (a, b) =>
              Math.abs((a.lane + 0.5) / nextFloor.length - position) -
              Math.abs((b.lane + 0.5) / nextFloor.length - position),
          )[0];
      if (target && !node.next.includes(target.id)) node.next.push(target.id);
    }
  const shortcutFloor = Math.max(
    1,
    Math.min(map.length - 3, Math.floor((map.length - 2) * 0.45)),
  );
  for (const floor of [shortcutFloor, shortcutFloor + 3]) {
    if (floor >= map.length - 2) continue;
    const node = shuffled(
      map[floor].filter((candidate) => candidate.next.length < 2),
      `${seed}:shortcut-source:${floor}`,
    )[0];
    if (!node) continue;
    const position = (node.lane + 0.5) / map[floor].length;
    const target = [...map[floor + 2]].sort(
      (a, b) =>
        Math.abs((a.lane + 0.5) / map[floor + 2].length - position) -
        Math.abs((b.lane + 0.5) / map[floor + 2].length - position),
    )[0];
    if (
      target &&
      target.kind !== "boss" &&
      node.next.length < 2 &&
      !node.next.includes(target.id)
    )
      node.next.push(target.id);
  }
  const backSource = shuffled(
    (map[Math.floor((map.length - 2) * 0.6)] ?? []).filter(
      (node) => node.next.length < 2,
    ),
    `${seed}:back-source`,
  )[0];
  const backTarget =
    backSource && map[Math.max(0, backSource.floor - 2)]?.at(-1);
  if (
    backSource &&
    backTarget &&
    backTarget.kind !== "boss" &&
    backSource.next.length < 2 &&
    !backSource.next.includes(backTarget.id)
  )
    backSource.next.push(backTarget.id);
  return map;
}
export function generateSideMap(seed: string, chapter: number): MapNode[][] {
  const widths = [3, 2, 4, 3, 2, 1],
    pools: NodeKind[][] = [
      ["battle", "event", "gamble"],
      ["event", "shop", "treasure", "library", "recruit"],
      ["battle", "elite", "oracle", "pawnshop"],
      ["event", "gamble", "forge", "camp"],
      ["battle", "elite", "library", "hunt", "treasure"],
      ["rift"],
    ];
  const map: MapNode[][] = widths.map((width, floor) =>
    Array.from({ length: width }, (_, lane) => ({
      id: `side-${chapter}-f${floor}-${lane}`,
      floor,
      lane,
      kind:
        floor === widths.length - 1
          ? "rift"
          : shuffled(pools[floor], `${seed}:side-kind:${floor}:${lane}`)[0],
      route: shuffled(
        routeProfileIds,
        `${seed}:side-route:${floor}:${lane}`,
      )[0],
      next: [],
    })),
  );
  for (let floor = 0; floor < map.length - 1; floor++) {
    const layer = map[floor],
      next = map[floor + 1];
    for (const node of layer) {
      const position = (node.lane + 0.5) / layer.length,
        ordered = [...next].sort(
          (a, b) =>
            Math.abs((a.lane + 0.5) / next.length - position) -
            Math.abs((b.lane + 0.5) / next.length - position),
        );
      node.next = ordered
        .slice(
          0,
          1 +
            Number(
              shuffled([false, false, true], `${seed}:side-edge:${node.id}`)[0],
            ),
        )
        .map((target) => target.id);
    }
    for (const target of next)
      if (!layer.some((node) => node.next.includes(target.id))) {
        const source = [...layer]
          .filter((node) => node.next.length < 2)
          .sort(
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
        source?.next.push(target.id);
      }
  }
  return map;
}
export function mapChoices(run: ExpeditionRun): MapNode[] {
  if (!run.current) return run.map[0];
  const current = run.map.flat().find((node) => node.id === run.current)!;
  return run.map.flat().filter((node) => current.next.includes(node.id));
}
export function travelCost(
  run: ExpeditionRun,
  node: MapNode,
): { cost: number; backward: boolean; shortcut: boolean; visited: boolean } {
  const current = run.current
    ? run.map.flat().find((candidate) => candidate.id === run.current)
    : undefined;
  const backward = !!current && node.floor < current.floor,
    shortcut = !!current && node.floor > current.floor + 1,
    visited = run.path.includes(node.id),
    baseCost =
      Number(backward) +
      Number(shortcut) +
      Number(node.kind === "secret" && !visited),
    cost =
      baseCost > 0
        ? baseCost + ascensionProfile(run.ascension).extraRouteCost
        : 0;
  return { cost, backward, shortcut, visited };
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
          chapterAt(run.chapter).biome),
  );
  const routeElite: Partial<Record<RouteProfileId, CreatureId>> = {
    gambit: "marketReaver",
    descent: "riftSiren",
    companionship: "bondBreaker",
  };
  if (
    rank === "elite" &&
    node.route &&
    routeElite[node.route] &&
    !pool.includes(routeElite[node.route]!)
  )
    pool.push(routeElite[node.route]!);
  const players = run.combat.heroes.length,
    count = rank === "boss" ? 1 : Math.min(3, Math.ceil(players * 0.75));
  const choices = shuffled(pool, `${run.seed}:${node.id}:creatures`);
  const ascension = ascensionProfile(run.ascension),
    profile = expeditionDifficulties[run.difficulty],
    multiplier =
      run.tuning === 2 ? profile.multiplier : profile.legacyMultiplier,
    endless = run.endless
      ? endlessScale(run.chapter)
      : { health: 1, attack: 1, boss: 1 },
    difficulty = multiplier * ascension.enemyHealth * endless.health,
    attackDifficulty = multiplier * ascension.enemyAttack * endless.attack;
  const boss = creatures[choices[0]] as Creature;
  const bossDifficulty =
    difficulty * ascension.bossHealth * endless.boss;
  const definitions: EnemyDefinition[] =
    rank === "boss"
      ? [
          { ...boss, role: "boss" as const },
          ...(boss.parts ?? []).map((part) => ({
            ...part,
            role: "part" as const,
          })),
        ].slice(0, 4)
      : Array.from(
          { length: count },
          (_, index) => creatures[choices[index % choices.length]],
        );
  const enemies: EnemyDefinition[] = definitions.map((base, index) => {
    const partyHp =
        rank === "boss"
          ? index === 0
            ? 0.65 + 0.3 * players
            : 0.65 + 0.15 * players
          : 0.2 + (0.8 * players) / count,
      partyAttack = rank === "boss" ? 1 + (players - 2) * 0.09 : 1;
    const budget =
      run.campaignVersion === 2
        ? chapterAt(run.chapter)
        : { health: 1, attack: 1 };
    return {
      name: base.name,
      icon: base.icon,
      role: base.role ?? (rank === "boss" ? "boss" : "guard"),
      ...("part" in base && base.part ? { part: base.part } : {}),
      ...(base.traits?.length ? { traits: [...base.traits] } : {}),
      hp: Math.round(
        base.hp *
          partyHp *
          (1 + node.floor * 0.045) *
          (rank === "boss" ? bossDifficulty : difficulty) *
          budget.health,
      ),
      pattern: base.pattern.map((intent, step) => ({
        ...intent,
        amount: Math.max(
          1,
          Math.round(
            intent.amount *
              (intent.kind === "attack"
                ? attackDifficulty *
                  partyAttack *
                  (1 + node.floor * 0.025) *
                  budget.attack
                : 1),
          ),
        ),
        target:
          intent.target === "all"
            ? ("all" as const)
            : (index + step + node.floor) % players,
      })),
      ...(base.phasePattern
        ? {
            phasePattern: base.phasePattern.map((intent, step) => ({
              ...intent,
              amount: Math.max(
                1,
                Math.round(
                  intent.amount *
                    (intent.kind === "attack"
                      ? attackDifficulty *
                        partyAttack *
                        (1 + node.floor * 0.025) *
                        budget.attack
                      : 1),
                ),
              ),
              target:
                intent.target === "all"
                  ? ("all" as const)
                  : (index + step + node.floor) % players,
            })),
          }
        : {}),
    };
  });
  if (rank === "boss" && run.contract === "brood" && enemies.length < 4)
    enemies.push({
      name: "裂隙幼体",
      hp: Math.max(1, Math.round(16 * (1 + node.floor * 0.03) * difficulty)),
      icon: "beast",
      role: "minion",
      deathBurst: 5,
      pattern: [
        {
          kind: "attack",
          amount: Math.max(1, Math.round(3 * difficulty)),
          target: 0,
        },
      ],
    });
  if (rank === "boss" && ascension.extraBossMinions > 0 && enemies.length < 4)
    enemies.push({
      name: "高塔幼体",
      hp: Math.max(1, Math.round(14 * (1 + node.floor * 0.03) * difficulty)),
      icon: "beast",
      role: "minion",
      deathBurst: 3,
      pattern: [
        {
          kind: "attack",
          amount: Math.max(1, Math.round(3 * attackDifficulty)),
          target: 0,
        },
      ],
    });
  const modifierPool = Object.keys(encounterModifiers) as EncounterModifierId[];
  const modifierCount = Math.min(
    2,
    (rank === "elite" || rank === "boss" ? 1 : 0) +
      ascension.modifierCount +
      (rank === "elite" && run.hunt ? 1 : 0),
  );
  const modifiers = shuffled(
    modifierPool,
    `${run.seed}:${node.id}:modifiers`,
  ).slice(0, modifierCount);
  return {
    name:
      rank === "boss"
        ? enemies[0].name
        : rank === "elite"
          ? "精英 · " + enemies[0].name
          : `第 ${node.floor + 1} 节点 · ${chapterAt(run.chapter).name}`,
    subtitle:
      rank === "boss"
        ? "章末决战"
        : rank === "elite"
          ? "危险遭遇 · 胜利后获得共享遗物"
          : "普通遭遇",
    enemies,
    ...(modifiers.length ? { modifiers } : {}),
    ...(rank === "boss" && boss.summons
      ? {
          summons: boss.summons.map((rule) => ({
            ...rule,
            template: {
              ...rule.template,
              hp: Math.max(
                1,
                Math.round(
                  rule.template.hp * (1 + node.floor * 0.03) * difficulty,
                ),
              ),
              pattern: rule.template.pattern.map((intent) => ({
                ...intent,
                amount:
                  intent.kind === "attack"
                    ? Math.max(1, Math.round(intent.amount * attackDifficulty))
                    : intent.amount,
              })),
            },
          })),
        }
      : {}),
    ...(rank === "boss" && boss.mechanic
      ? {
          mechanic: {
            ...structuredClone(boss.mechanic),
            track: {
              ...boss.mechanic.track,
              initial:
                (boss.mechanic.track.initial ?? 0) + ascension.mechanicStart,
            },
          },
        }
      : {}),
  };
}

export const shopRaidBalance = {
  roundLimit: 24,
  healthMultiplier: 1.58,
  attackMultiplier: 1.36,
} as const;

export function shopRaidEncounter(
  run: ExpeditionRun,
  node: MapNode,
): EncounterDefinition {
  const encounter = encounterFor(run, {
      ...node,
      kind: "elite",
      floor: Math.min(run.map.length - 1, node.floor + 2),
    }),
    guard = creatures.marketReaver as Creature,
    party = encounter.enemies[0];
  return {
    ...encounter,
    name: guard.name,
    subtitle: `抢劫商店 · ${shopRaidBalance.roundLimit} 回合内击败守卫，否则老板带走全部商品`,
    enemies: [
      {
        ...party,
        name: guard.name,
        icon: guard.icon,
        hp: Math.round(party.hp * shopRaidBalance.healthMultiplier),
        pattern: guard.pattern.map((intent, step) => ({
          ...intent,
          amount:
            intent.kind === "attack"
              ? Math.max(
                  1,
                  Math.round(intent.amount * shopRaidBalance.attackMultiplier),
                )
              : intent.amount,
          target:
            intent.target === "all"
              ? ("all" as const)
              : (step + node.floor) % run.combat.heroes.length,
        })),
      },
      ...encounter.enemies.slice(1),
    ],
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
  oracle: "观星台",
  contract: "誓约碑",
  forge: "锻造所",
  secret: "隐秘裂隙",
  pawnshop: "当铺",
  gamble: "赌局",
  library: "禁书库",
  hunt: "追猎台",
  rift: "深渊裂隙",
  recruit: "旅伴营地",
  empty: "空商店",
};
export const nodeIcons: Record<NodeKind, string> = {
  battle: "⚔︎",
  elite: "♜︎",
  boss: "♛︎",
  event: "?",
  shop: "◈︎",
  camp: "♨︎",
  treasure: "✦︎",
  oracle: "◎︎",
  contract: "✶︎",
  forge: "⚒︎",
  secret: "◈︎",
  pawnshop: "▱︎",
  gamble: "⚄︎",
  library: "▥︎",
  hunt: "⌖︎",
  rift: "◈︎",
  recruit: "☺︎",
  empty: "·",
};
