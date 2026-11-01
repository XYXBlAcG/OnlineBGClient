export const enemyThornsRule = { maximum: 8, decay: 1 };
export const heatRule = { threshold: 8, residual: 6, cooling: 3 };
export const expeditionResources = {
  heat: {
    name: "热量",
    maximum: 20,
    hint: `行动结束时达到 ${heatRule.threshold} 点，受到热量减 ${heatRule.residual} 点伤害；随后自动冷却 ${heatRule.cooling} 点。`,
  },
  turret: {
    name: "炮台",
    maximum: 12,
    hint: "每轮全队行动结束后，对生命最低的敌人造成等量伤害；战斗结束后移除。",
  },
  focus: {
    name: "蓄能",
    maximum: 3,
    hint: "下一轮额外获得等量能量，随后清空。",
  },
  echo: {
    name: "回响",
    maximum: 60,
    hint: "下一轮开始时对生命最低的敌人造成等量伤害，随后清空。",
  },
  blessing: {
    name: "祝福",
    maximum: 20,
    hint: "溢出治疗转化为格挡，每转化 1 点消耗 1 层祝福。",
  },
} as const;
export type HeroResources = Record<keyof typeof expeditionResources, number>;
export function initialResources(): HeroResources {
  return { heat: 0, turret: 0, focus: 0, echo: 0, blessing: 0 };
}

export const resourceEffects = {
  heat: "heat",
  device: "turret",
  focus: "focus",
  echo: "echo",
  blessing: "blessing",
} as const;
