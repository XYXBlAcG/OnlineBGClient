import type { CardDefinition } from "./card-types";
export const extensionCards = {
  guard_counter: {
    name: "反击姿态",
    cost: 1,
    target: "self",
    icon: "⛨",
    effects: [
      {
        kind: "block",
        amount: 6,
      },
      {
        kind: "thorns",
        amount: 2,
      },
    ],
  },
  guard_resolve: {
    name: "不屈战意",
    cost: 2,
    target: "self",
    icon: "♜",
    effects: [
      {
        kind: "strength",
        amount: 3,
      },
      {
        kind: "block",
        amount: 5,
      },
    ],
    exhaust: true,
  },
  guard_bastion_charge: {
    name: "堡垒冲锋",
    cost: 2,
    target: "enemy",
    icon: "⬢",
    effects: [
      {
        kind: "damage",
        amount: 4,
        scale: "block",
      },
    ],
  },
  guard_command: {
    name: "军阵号令",
    cost: 2,
    target: "self",
    icon: "⚑",
    effects: [
      {
        kind: "block",
        amount: 6,
        target: "party",
      },
      {
        kind: "draw",
        amount: 1,
      },
    ],
  },
  guard_reprisal: {
    name: "以守为攻",
    cost: 1,
    target: "enemy",
    icon: "⛨",
    effects: [
      {
        kind: "damage",
        amount: 4,
        scale: "block",
      },
    ],
    exhaust: true,
  },
  guard_aegis: {
    name: "重装援护",
    cost: 2,
    target: "ally",
    icon: "⬡",
    effects: [
      {
        kind: "block",
        amount: 16,
      },
      {
        kind: "cleanse",
        amount: 1,
      },
    ],
  },
  ranger_opening: {
    name: "伺机而动",
    cost: 0,
    target: "self",
    icon: "◎",
    effects: [
      {
        kind: "draw",
        amount: 1,
      },
      {
        kind: "focus",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  ranger_pin: {
    name: "钉射",
    cost: 1,
    target: "enemy",
    icon: "➶",
    effects: [
      {
        kind: "damage",
        amount: 6,
      },
      {
        kind: "weak",
        amount: 1,
      },
    ],
  },
  ranger_ambush: {
    name: "伏击连射",
    cost: 2,
    target: "enemy",
    icon: "⋙",
    effects: [
      {
        kind: "damage",
        amount: 8,
        scale: "marked",
      },
      {
        kind: "draw",
        amount: 1,
        target: "self",
      },
    ],
  },
  ranger_mist: {
    name: "迷踪雾",
    cost: 1,
    target: "self",
    icon: "≋",
    effects: [
      {
        kind: "block",
        amount: 6,
      },
      {
        kind: "draw",
        amount: 1,
      },
    ],
  },
  ranger_spring: {
    name: "踏风",
    cost: 0,
    target: "self",
    icon: "⌁",
    effects: [
      {
        kind: "block",
        amount: 4,
      },
      {
        kind: "draw",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  ranger_hunt: {
    name: "猎场标记",
    cost: 2,
    target: "all-enemies",
    icon: "◎",
    effects: [
      {
        kind: "damage",
        amount: 4,
      },
      {
        kind: "vulnerable",
        amount: 2,
      },
    ],
  },
  alchemy_antidote: {
    name: "净化蒸馏",
    cost: 1,
    target: "ally",
    icon: "⚗",
    effects: [
      {
        kind: "cleanse",
        amount: 1,
      },
      {
        kind: "regen",
        amount: 3,
      },
    ],
  },
  alchemy_reagent: {
    name: "催化反应",
    cost: 1,
    target: "enemy",
    icon: "✺",
    effects: [
      {
        kind: "damage",
        amount: 3,
        scale: "poison",
      },
      {
        kind: "poison",
        amount: 2,
      },
    ],
  },
  alchemy_cloud: {
    name: "腐蚀云",
    cost: 2,
    target: "all-enemies",
    icon: "☁",
    effects: [
      {
        kind: "poison",
        amount: 5,
      },
      {
        kind: "weak",
        amount: 1,
      },
    ],
  },
  alchemy_life: {
    name: "生命培养液",
    cost: 2,
    target: "ally",
    icon: "✚",
    effects: [
      {
        kind: "heal",
        amount: 8,
      },
      {
        kind: "blessing",
        amount: 5,
      },
    ],
  },
  alchemy_capsule: {
    name: "缓释胶囊",
    cost: 1,
    target: "self",
    icon: "◷",
    effects: [
      {
        kind: "regen",
        amount: 4,
      },
      {
        kind: "focus",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  alchemy_tincture: {
    name: "协同酊剂",
    cost: 2,
    target: "self",
    icon: "⚗",
    effects: [
      {
        kind: "regen",
        amount: 2,
        target: "party",
      },
      {
        kind: "block",
        amount: 5,
        target: "party",
      },
    ],
  },
  common_patience: {
    name: "耐心筹备",
    cost: 0,
    target: "self",
    icon: "◷",
    effects: [
      {
        kind: "focus",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  common_ration: {
    name: "应急口粮",
    cost: 1,
    target: "self",
    icon: "✚",
    effects: [
      {
        kind: "heal",
        amount: 5,
      },
    ],
    exhaust: true,
  },
  common_rescue: {
    name: "救援绳索",
    cost: 1,
    target: "ally",
    icon: "⌁",
    effects: [
      {
        kind: "block",
        amount: 7,
      },
      {
        kind: "draw",
        amount: 1,
      },
    ],
  },
  common_flare: {
    name: "信号焰火",
    cost: 1,
    target: "all-enemies",
    icon: "✹",
    effects: [
      {
        kind: "vulnerable",
        amount: 1,
      },
      {
        kind: "damage",
        amount: 3,
      },
    ],
  },
  common_canteen: {
    name: "净水壶",
    cost: 0,
    target: "self",
    icon: "◡",
    effects: [
      {
        kind: "cleanse",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  common_sharpen: {
    name: "砥砺",
    cost: 1,
    target: "self",
    icon: "⚒",
    effects: [
      {
        kind: "strength",
        amount: 1,
      },
      {
        kind: "draw",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  common_scavenge: {
    name: "拾荒",
    cost: 0,
    target: "self",
    icon: "◈",
    effects: [
      {
        kind: "draw",
        amount: 2,
      },
    ],
    exhaust: true,
  },
  common_cover: {
    name: "掩护前进",
    cost: 2,
    target: "self",
    icon: "⬡",
    effects: [
      {
        kind: "block",
        amount: 8,
        target: "party",
      },
    ],
  },
  common_trap: {
    name: "简易陷阱",
    cost: 1,
    target: "enemy",
    icon: "♠",
    effects: [
      {
        kind: "damage",
        amount: 5,
      },
      {
        kind: "weak",
        amount: 1,
      },
    ],
  },
  common_lantern: {
    name: "远行灯",
    cost: 1,
    target: "self",
    icon: "☀",
    effects: [
      {
        kind: "blessing",
        amount: 4,
      },
      {
        kind: "block",
        amount: 5,
      },
    ],
  },
  common_second: {
    name: "后备计划",
    cost: 1,
    target: "self",
    icon: "◷",
    effects: [
      {
        kind: "draw",
        amount: 1,
      },
      {
        kind: "echo",
        amount: 6,
      },
    ],
  },
  common_last: {
    name: "孤注一掷",
    cost: 3,
    target: "enemy",
    icon: "ϟ",
    effects: [
      {
        kind: "damage",
        amount: 23,
      },
    ],
    exhaust: true,
  },
} as const satisfies Record<string, CardDefinition>;
