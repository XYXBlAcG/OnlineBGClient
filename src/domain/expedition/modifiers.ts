export type EncounterModifierEffects = {
  enemyHealthIncrease: number;
  openingBlock: number;
  deathBurst: number;
  roundStrength: number;
  heroVulnerable: number;
  enemyThorns: number;
  attackHeal: number;
  allyDeathHeal: number;
};

export type EncounterModifierDefinition = {
  name: string;
  description: string;
  effects: Partial<EncounterModifierEffects>;
};

export const encounterModifiers = {
  reinforced: {
    name: "加固",
    description: "敌人生命提高 10%，开局获得 3 格挡。",
    effects: { enemyHealthIncrease: 0.1, openingBlock: 3 },
  },
  volatile: {
    name: "易爆",
    description: "非首领敌人死亡时爆裂，对全队造成伤害。",
    effects: { deathBurst: 3 },
  },
  frenzy: {
    name: "狂乱",
    description: "每轮敌方阶段结束后，存活敌人获得 1 力量。",
    effects: { roundStrength: 1 },
  },
  ambush: {
    name: "伏击",
    description: "战斗开始时全队获得 1 易伤，首轮压力更高。",
    effects: { heroVulnerable: 1 },
  },
  thorns: {
    name: "棘化",
    description: "敌人获得 1 反伤，连续攻击需要承担代价。",
    effects: { enemyThorns: 1 },
  },
  siphon: {
    name: "汲取",
    description: "敌人造成生命伤害后恢复 2 生命。",
    effects: { attackHeal: 2 },
  },
  renewal: {
    name: "复生",
    description: "任一敌人倒下时，其余敌人恢复 4 生命。",
    effects: { allyDeathHeal: 4 },
  },
  awakened: {
    name: "觉醒",
    description: "战斗开始时一名敌人获得随机特性。",
    effects: {},
  },
} as const satisfies Record<string, EncounterModifierDefinition>;

export type EncounterModifierId = keyof typeof encounterModifiers;

export function encounterModifierEffect(
  modifiers: readonly EncounterModifierId[] | undefined,
  key: keyof EncounterModifierEffects,
) {
  return (modifiers ?? []).reduce(
    (total, id) =>
      total +
      ((encounterModifiers[id].effects as Partial<EncounterModifierEffects>)[
        key
      ] ?? 0),
    0,
  );
}
