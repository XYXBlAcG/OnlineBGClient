export const chapters = [
  {
    name: "风蚀遗迹",
    biome: "ruins",
    depth: 12,
    health: 1,
    attack: 1,
    width: 6,
    rule: "护甲与蓄力：观察格挡和攻击意图，保留爆发窗口。",
  },
  {
    name: "菌蚀花园",
    biome: "garden",
    depth: 14,
    health: 1.35,
    attack: 1.12,
    width: 8,
    rule: "孢子与再生：毒素绕过格挡，优先处理治疗者，净化可以阻止持续损血。",
  },
  {
    name: "齿轮熔炉",
    biome: "forge",
    depth: 14,
    health: 1.75,
    attack: 1.25,
    width: 8,
    rule: "机关与蓄力：拆除护卫并削弱蓄势中的攻击者，集火或提前援护。",
  },
] as const;
export type Biome = (typeof chapters)[number]["biome"];
export const waystationRecovery = 0.3;
export const advancementChoices = {
  vitality: "体魄进阶 · 最大生命 +4",
  forge: "精研牌组 · 强化两次",
  supplies: "补给津贴 · 获得 60 金币",
} as const;
