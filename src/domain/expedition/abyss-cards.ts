import type { CardDefinition } from "./card-types";

export const abyssCards = {
  abyss_strike: {
    name: "深渊刺击",
    cost: 1,
    target: "enemy",
    icon: "◆︎",
    effects: [{ kind: "damage", amount: 6 }],
  },
  abyss_guard: {
    name: "余烬护壁",
    cost: 1,
    target: "self",
    icon: "▣︎",
    effects: [{ kind: "block", amount: 6 }],
  },
  abyss_drain: {
    name: "汲取回响",
    cost: 1,
    target: "enemy",
    icon: "◉︎",
    effects: [
      { kind: "damage", amount: 4 },
      { kind: "heal", amount: 2, target: "self" },
    ],
  },
  abyss_lantern: {
    name: "深处提灯",
    cost: 1,
    target: "self",
    icon: "☼︎",
    effects: [{ kind: "draw", amount: 2 }],
  },
  abyss_veil: {
    name: "暮色帷幕",
    cost: 1,
    target: "enemy",
    icon: "◌︎",
    effects: [
      { kind: "weak", amount: 1 },
      { kind: "vulnerable", amount: 1 },
    ],
  },
  abyss_ember: {
    name: "双生余烬",
    cost: 1,
    target: "enemy",
    icon: "✦︎",
    effects: [{ kind: "damage", amount: 3, hits: 2 }],
  },
  abyss_rite: {
    name: "行旅祝仪",
    cost: 1,
    target: "self",
    icon: "❧︎",
    effects: [
      { kind: "strength", amount: 1 },
      { kind: "dexterity", amount: 1 },
    ],
  },
  abyss_wave: {
    name: "深层潮涌",
    cost: 2,
    target: "enemy",
    icon: "≋︎",
    effects: [{ kind: "damage", amount: 9 }],
  },
  abyss_mend: {
    name: "拾荒包扎",
    cost: 1,
    target: "ally",
    icon: "✚︎",
    effects: [{ kind: "heal", amount: 8 }],
  },
  abyss_echo: {
    name: "回响复写",
    cost: 2,
    target: "self",
    icon: "❖︎",
    effects: [
      { kind: "echo", amount: 1 },
      { kind: "blessing", amount: 1 },
    ],
    exhaust: true,
  },
  abyss_shard: {
    name: "腐蚀晶屑",
    cost: 1,
    target: "enemy",
    icon: "❂︎",
    effects: [{ kind: "poison", amount: 4 }],
  },
  abyss_ward: {
    name: "塔影庇护",
    cost: 2,
    target: "self",
    icon: "⬢︎",
    effects: [{ kind: "block", amount: 11 }],
  },
} as const satisfies Record<string, CardDefinition>;
