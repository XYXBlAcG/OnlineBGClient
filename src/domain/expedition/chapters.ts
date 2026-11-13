export const chapters = [
  {
    name: "风蚀遗迹",
    biome: "ruins",
    depth: 12,
    health: 1,
    attack: 1,
    width: 6,
    rule: "审判与命运：拆除律令碑、拨回未来议程，在阶段切换前保留爆发窗口。",
  },
  {
    name: "菌蚀花园",
    biome: "garden",
    depth: 14,
    health: 1.18,
    attack: 1.05,
    width: 8,
    rule: "孢子与根须：净化孢子、斩断连接，并决定先击破哪一具双生身体。",
  },
  {
    name: "齿轮熔炉",
    biome: "forge",
    depth: 14,
    health: 1.38,
    attack: 1.1,
    width: 8,
    rule: "熔炉与节拍：开关冷却阀管理热量，控制出牌数量避免时钟过载。",
  },
  {
    name: "镜月回廊",
    biome: "mirror",
    depth: 16,
    health: 1.58,
    attack: 1.16,
    width: 8,
    rule: "镜面与月潮：切换攻击和技能打断回响，在满潮前安排爆发与防护。",
  },
] as const;
export type Biome = (typeof chapters)[number]["biome"];
export const waystationRecovery = 0.3;
export const advancementChoices = {
  vitality: "体魄进阶 · 最大生命 +4",
  forge: "精研牌组 · 强化两次",
  supplies: "补给津贴 · 获得 60 金币",
} as const;
