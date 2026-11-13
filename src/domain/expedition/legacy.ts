export const legacyNodeIds = [
  "supply1",
  "vitality1",
  "camp1",
  "supply2",
  "navigation1",
  "fortune1",
  "vitality2",
  "supply3",
  "camp2",
  "navigation2",
  "fortune2",
  "fieldKit",
  "freeReroll",
] as const;
export type LegacyNodeId = (typeof legacyNodeIds)[number];

export interface LegacyEffects {
  startGold: number;
  startMaxHp: number;
  startCompass: number;
  startLuck: number;
  campHealing: number;
  startPotions: number;
  freeRerolls: number;
}

export interface LegacyNode {
  id: LegacyNodeId;
  name: string;
  icon: string;
  tier: number;
  description: string;
  cost: number;
  requires: readonly LegacyNodeId[];
  effects: Partial<LegacyEffects>;
}

export const legacyNodes: readonly LegacyNode[] = [
  {
    id: "supply1",
    name: "补给储备 I",
    icon: "◈",
    tier: 1,
    description: "每局开始时，每名角色获得 10 金币。",
    cost: 20,
    requires: [],
    effects: { startGold: 10 },
  },
  {
    id: "vitality1",
    name: "生命刻印 I",
    icon: "✚",
    tier: 1,
    description: "每局开始时，每名角色最大生命 +2。",
    cost: 25,
    requires: [],
    effects: { startMaxHp: 2 },
  },
  {
    id: "camp1",
    name: "营地整备 I",
    icon: "⌂",
    tier: 2,
    description: "营地休息恢复量 +5%。",
    cost: 30,
    requires: ["vitality1"],
    effects: { campHealing: 0.05 },
  },
  {
    id: "supply2",
    name: "补给储备 II",
    icon: "◈",
    tier: 2,
    description: "每局开始时，每名角色额外获得 10 金币。",
    cost: 40,
    requires: ["supply1"],
    effects: { startGold: 10 },
  },
  {
    id: "navigation1",
    name: "导航仪 I",
    icon: "✥",
    tier: 3,
    description: "每局开始时，队伍罗盘 +1。",
    cost: 40,
    requires: ["supply2"],
    effects: { startCompass: 1 },
  },
  {
    id: "fortune1",
    name: "命运筹码 I",
    icon: "◇",
    tier: 3,
    description: "每名角色每局开始时幸运筹码 +1。",
    cost: 35,
    requires: ["camp1"],
    effects: { startLuck: 1 },
  },
  {
    id: "vitality2",
    name: "生命刻印 II",
    icon: "✚",
    tier: 4,
    description: "每局开始时，每名角色额外最大生命 +2。",
    cost: 50,
    requires: ["camp1"],
    effects: { startMaxHp: 2 },
  },
  {
    id: "supply3",
    name: "补给储备 III",
    icon: "◈",
    tier: 4,
    description: "每局开始时，每名角色额外获得 10 金币。",
    cost: 60,
    requires: ["navigation1"],
    effects: { startGold: 10 },
  },
  {
    id: "camp2",
    name: "营地整备 II",
    icon: "⌂",
    tier: 5,
    description: "营地休息恢复量再 +5%。",
    cost: 60,
    requires: ["vitality2"],
    effects: { campHealing: 0.05 },
  },
  {
    id: "navigation2",
    name: "导航仪 II",
    icon: "✥",
    tier: 5,
    description: "每局开始时，队伍罗盘再 +1。",
    cost: 80,
    requires: ["navigation1"],
    effects: { startCompass: 1 },
  },
  {
    id: "fortune2",
    name: "命运筹码 II",
    icon: "◇",
    tier: 5,
    description: "每名角色每局开始时幸运筹码再 +1。",
    cost: 70,
    requires: ["fortune1"],
    effects: { startLuck: 1 },
  },
  {
    id: "fieldKit",
    name: "先遣补给",
    icon: "⚗",
    tier: 6,
    description: "每局开始时，每名角色额外携带 1 瓶随机药水。",
    cost: 60,
    requires: ["supply3", "camp2"],
    effects: { startPotions: 1 },
  },
  {
    id: "freeReroll",
    name: "命运余响",
    icon: "↻",
    tier: 6,
    description: "每名角色每局第一次个人奖励重选不消耗幸运筹码。",
    cost: 70,
    requires: ["fortune2", "navigation2"],
    effects: { freeRerolls: 1 },
  },
];

export const legacyNodeById = new Map(
  legacyNodes.map((node) => [node.id, node]),
);
export const legacyTiers = [
  ...new Set(legacyNodes.map((node) => node.tier)),
].map((tier) => ({
  tier,
  nodes: legacyNodes.filter((node) => node.tier === tier),
}));

const emptyEffects: LegacyEffects = {
  startGold: 0,
  startMaxHp: 0,
  startCompass: 0,
  startLuck: 0,
  campHealing: 0,
  startPotions: 0,
  freeRerolls: 0,
};

export function normalizeLegacy(
  nodes: readonly LegacyNodeId[],
): LegacyNodeId[] {
  const valid = new Set(nodes.filter((id) => legacyNodeById.has(id)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of legacyNodes)
      if (
        valid.has(node.id) &&
        !node.requires.every((required) => valid.has(required))
      ) {
        valid.delete(node.id);
        changed = true;
      }
  }
  return legacyNodeIds.filter((id) => valid.has(id));
}

export function legacyProfile(nodes: readonly LegacyNodeId[]): LegacyEffects {
  const effects = { ...emptyEffects };
  for (const id of normalizeLegacy(nodes)) {
    const node = legacyNodeById.get(id)!;
    for (const [key, value] of Object.entries(node.effects) as [
      keyof LegacyEffects,
      number,
    ][])
      effects[key] += value;
  }
  return { ...effects, campHealing: 1 + effects.campHealing };
}

export function legacyEffectLines(effects: Partial<LegacyEffects>): string[] {
  const parts: string[] = [];
  if (effects.startGold) parts.push(`起始金币 +${effects.startGold}`);
  if (effects.startMaxHp) parts.push(`最大生命 +${effects.startMaxHp}`);
  if (effects.startCompass) parts.push(`起始罗盘 +${effects.startCompass}`);
  if (effects.startLuck) parts.push(`幸运筹码 +${effects.startLuck}`);
  if (effects.campHealing)
    parts.push(`营地恢复 +${Math.round(effects.campHealing * 100)}%`);
  if (effects.startPotions) parts.push(`开局药水 +${effects.startPotions}`);
  if (effects.freeRerolls) parts.push("首次奖励重选免费");
  return parts;
}

export function legacySpent(nodes: readonly LegacyNodeId[]): number {
  return normalizeLegacy(nodes).reduce(
    (sum, id) => sum + (legacyNodeById.get(id)?.cost ?? 0),
    0,
  );
}

export function legacyPrerequisitesMet(
  nodes: readonly LegacyNodeId[],
  id: LegacyNodeId,
): boolean {
  const node = legacyNodeById.get(id);
  if (!node) return false;
  const unlocked = new Set(normalizeLegacy(nodes));
  return node.requires.every((required) => unlocked.has(required));
}

export function knowledgeForRun(run: {
  chapter: number;
  won: boolean;
  bosses: readonly number[];
  ascension: number;
}) {
  return (
    6 +
    Math.max(0, Math.min(3, run.chapter)) * 4 +
    Math.min(4, run.bosses.length) * 2 +
    (run.won ? 18 : 0) +
    Math.max(0, Math.min(10, run.ascension)) * 2
  );
}
