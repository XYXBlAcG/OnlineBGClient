type AscensionEffects = {
  enemyHealth: number;
  enemyAttack: number;
  bossHealth: number;
  shopPrice: number;
  campHealing: number;
  modifierCount: number;
  extraBossMinions: number;
  extraRouteCost: number;
  startGold: number;
  startMaxHp: number;
  startLuck: number;
  startCompass: number;
  mechanicStart: number;
};

type AscensionTier = {
  level: number;
  name: string;
  penalty: string;
  boost: string;
  effects: Partial<AscensionEffects>;
};

const baseEffects: AscensionEffects = {
  enemyHealth: 1,
  enemyAttack: 1,
  bossHealth: 1,
  shopPrice: 1,
  campHealing: 1,
  modifierCount: 0,
  extraBossMinions: 0,
  extraRouteCost: 0,
  startGold: 0,
  startMaxHp: 0,
  startLuck: 0,
  startCompass: 0,
  mechanicStart: 0,
};

const ascensionTiers: readonly AscensionTier[] = [
  {
    level: 1,
    name: "微光裂隙",
    penalty: "敌人生命 +3%",
    boost: "初始金币 +5",
    effects: { enemyHealth: 0.03, startGold: 5 },
  },
  {
    level: 2,
    name: "低语回廊",
    penalty: "敌人攻击 +1%",
    boost: "初始幸运筹码 +1",
    effects: { enemyAttack: 0.01, startLuck: 1 },
  },
  {
    level: 3,
    name: "磨损旅途",
    penalty: "商店与卡牌服务价格 +8%",
    boost: "最大生命 +1",
    effects: { shopPrice: 0.08, startMaxHp: 1 },
  },
  {
    level: 4,
    name: "双重威胁",
    penalty: "所有战斗获得 1 个负面词条",
    boost: "初始罗盘 +1",
    effects: { modifierCount: 1, startCompass: 1 },
  },
  {
    level: 5,
    name: "枯竭补给",
    penalty: "敌人生命再 +3%；首领战增加 1 个幼体",
    boost: "初始金币 +5",
    effects: { enemyHealth: 0.03, extraBossMinions: 1, startGold: 5 },
  },
  {
    level: 6,
    name: "逆流之路",
    penalty: "营地恢复 -12%",
    boost: "最大生命 +1",
    effects: { campHealing: -0.12, startMaxHp: 1 },
  },
  {
    level: 7,
    name: "多重回响",
    penalty: "捷径、回溯与隐秘裂隙额外消耗 1 罗盘",
    boost: "初始罗盘 +1",
    effects: { extraRouteCost: 1, startCompass: 1 },
  },
  {
    level: 8,
    name: "命运压迫",
    penalty: "战斗获得第 2 个负面词条",
    boost: "初始幸运筹码 +1",
    effects: { modifierCount: 1, startLuck: 1 },
  },
  {
    level: 9,
    name: "终局预兆",
    penalty: "敌人攻击再 +3%",
    boost: "初始金币 +5",
    effects: { enemyAttack: 0.03, startGold: 5 },
  },
  {
    level: 10,
    name: "塔心崩落",
    penalty: "敌人生命再 +4%；首领生命 +8%；首领议程起始 +1",
    boost: "最大生命 +2",
    effects: {
      enemyHealth: 0.04,
      bossHealth: 0.08,
      mechanicStart: 1,
      startMaxHp: 2,
    },
  },
];

export function ascensionProfile(level: number) {
  const finite = Number.isFinite(level) ? Math.floor(level) : 0,
    value = Math.max(0, Math.min(10, finite)),
    effects = { ...baseEffects };
  for (const tier of ascensionTiers)
    if (tier.level <= value)
      for (const [key, amount] of Object.entries(tier.effects) as [
        keyof AscensionEffects,
        number,
      ][])
        effects[key] += amount;
  return { level: value, ...effects };
}

export const ascensionLevels = Array.from({ length: 11 }, (_, level) => {
  const tiers = ascensionTiers.filter((tier) => tier.level <= level);
  return {
    level,
    label: `N${level}`,
    name: `N${level} · ${level === 0 ? "初次远征" : tiers.at(-1)!.name}`,
    penalties: tiers.map((tier) => tier.penalty),
    boosts: tiers.map((tier) => tier.boost),
  };
});
