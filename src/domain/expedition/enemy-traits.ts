export const enemyTraits = {
  vengeful: {
    name: "复仇",
    description: "其他敌人倒下时获得 2 力量。",
    allyDeathStrength: 2,
    attackHeal: 0,
    attackStrength: 0,
    openingBlock: 0,
  },
  leech: {
    name: "汲取",
    description: "造成生命伤害后恢复 2 生命。",
    allyDeathStrength: 0,
    attackHeal: 2,
    attackStrength: 0,
    openingBlock: 0,
  },
  overclock: {
    name: "超载",
    description: "每次攻击行动后获得 1 力量。",
    allyDeathStrength: 0,
    attackHeal: 0,
    attackStrength: 1,
    openingBlock: 0,
  },
  bulwark: {
    name: "壁垒",
    description: "战斗开始时获得 6 格挡。",
    allyDeathStrength: 0,
    attackHeal: 0,
    attackStrength: 0,
    openingBlock: 6,
  },
} as const;

export type EnemyTraitId = keyof typeof enemyTraits;
