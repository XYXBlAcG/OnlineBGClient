import type { CardDefinition } from "./card-types";
export const mechanicCards = {
  machine_bolt: {
    name: "铆钉射击",
    cost: 1,
    target: "enemy",
    icon: "⚙",
    effects: [
      {
        kind: "damage",
        amount: 7,
      },
      {
        kind: "heat",
        amount: 1,
        target: "self",
      },
    ],
  },
  machine_plate: {
    name: "隔热装甲",
    cost: 1,
    target: "self",
    icon: "▣",
    effects: [
      {
        kind: "block",
        amount: 6,
      },
      {
        kind: "cool",
        amount: 2,
      },
    ],
  },
  machine_turret: {
    name: "便携炮台",
    cost: 1,
    target: "self",
    icon: "♜",
    effects: [
      {
        kind: "device",
        amount: 2,
      },
    ],
    exhaust: true,
  },
  machine_vent: {
    name: "紧急排热",
    cost: 0,
    target: "self",
    icon: "♨",
    effects: [
      {
        kind: "cool",
        amount: 4,
      },
      {
        kind: "draw",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  machine_overload: {
    name: "超载炮击",
    cost: 2,
    target: "enemy",
    icon: "ϟ",
    effects: [
      {
        kind: "damage",
        amount: 8,
        scale: "heat",
      },
      {
        kind: "heat",
        amount: 3,
        target: "self",
      },
    ],
  },
  machine_sentry: {
    name: "哨戒装置",
    cost: 2,
    target: "self",
    icon: "♜",
    effects: [
      {
        kind: "device",
        amount: 3,
      },
      {
        kind: "block",
        amount: 5,
      },
    ],
    exhaust: true,
  },
  machine_repair: {
    name: "现场检修",
    cost: 1,
    target: "ally",
    icon: "⚒",
    effects: [
      {
        kind: "heal",
        amount: 4,
      },
      {
        kind: "block",
        amount: 4,
      },
    ],
  },
  machine_reactor: {
    name: "点燃反应堆",
    cost: 0,
    target: "self",
    icon: "☀",
    effects: [
      {
        kind: "heat",
        amount: 4,
      },
      {
        kind: "energy",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  machine_salvo: {
    name: "联动齐射",
    cost: 2,
    target: "all-enemies",
    icon: "⚙",
    effects: [
      {
        kind: "damage",
        amount: 5,
        scale: "turret",
      },
      {
        kind: "heat",
        amount: 2,
        target: "self",
      },
    ],
  },
  machine_coolant: {
    name: "循环冷却",
    cost: 1,
    target: "self",
    icon: "❄",
    effects: [
      {
        kind: "cool",
        amount: 5,
      },
      {
        kind: "block",
        amount: 8,
      },
    ],
  },
  machine_plating: {
    name: "团队镀层",
    cost: 2,
    target: "self",
    icon: "⬢",
    effects: [
      {
        kind: "block",
        amount: 7,
        target: "party",
      },
      {
        kind: "heat",
        amount: 2,
        target: "self",
      },
    ],
  },
  machine_coil: {
    name: "蓄电线圈",
    cost: 1,
    target: "self",
    icon: "ϟ",
    effects: [
      {
        kind: "focus",
        amount: 2,
      },
      {
        kind: "heat",
        amount: 1,
      },
    ],
  },
  machine_scrap: {
    name: "回收零件",
    cost: 0,
    target: "self",
    icon: "⚒",
    effects: [
      {
        kind: "draw",
        amount: 2,
      },
      {
        kind: "heat",
        amount: 3,
      },
    ],
    exhaust: true,
  },
  machine_spikes: {
    name: "尖刺护板",
    cost: 1,
    target: "self",
    icon: "♠",
    effects: [
      {
        kind: "thorns",
        amount: 3,
      },
      {
        kind: "block",
        amount: 4,
      },
    ],
    exhaust: true,
  },
  machine_drill: {
    name: "钻头突破",
    cost: 1,
    target: "enemy",
    icon: "↗",
    effects: [
      {
        kind: "damage",
        amount: 7,
      },
      {
        kind: "vulnerable",
        amount: 1,
      },
    ],
  },
  machine_fan: {
    name: "涡轮风扇",
    cost: 1,
    target: "self",
    icon: "✺",
    effects: [
      {
        kind: "cool",
        amount: 3,
      },
      {
        kind: "focus",
        amount: 1,
      },
    ],
  },
  machine_siege: {
    name: "攻城模式",
    cost: 3,
    target: "enemy",
    icon: "♜",
    effects: [
      {
        kind: "damage",
        amount: 18,
        scale: "turret",
      },
      {
        kind: "heat",
        amount: 4,
        target: "self",
      },
    ],
  },
  machine_shield: {
    name: "应急屏障",
    cost: 0,
    target: "ally",
    icon: "⬡",
    effects: [
      {
        kind: "block",
        amount: 7,
      },
      {
        kind: "heat",
        amount: 2,
        target: "self",
      },
    ],
    exhaust: true,
  },
  machine_assembly: {
    name: "快速组装",
    cost: 2,
    target: "self",
    icon: "⚒",
    effects: [
      {
        kind: "device",
        amount: 2,
      },
      {
        kind: "draw",
        amount: 2,
      },
    ],
    exhaust: true,
  },
  machine_furnace: {
    name: "熔炉冲击",
    cost: 1,
    target: "all-enemies",
    icon: "☀",
    effects: [
      {
        kind: "damage",
        amount: 4,
        scale: "heat",
      },
      {
        kind: "heat",
        amount: 2,
        target: "self",
      },
    ],
  },
  machine_insulate: {
    name: "绝缘维护",
    cost: 1,
    target: "ally",
    icon: "▣",
    effects: [
      {
        kind: "cleanse",
        amount: 1,
      },
      {
        kind: "block",
        amount: 5,
      },
    ],
  },
  machine_precision: {
    name: "精密校准",
    cost: 1,
    target: "self",
    icon: "◎",
    effects: [
      {
        kind: "strength",
        amount: 2,
      },
      {
        kind: "cool",
        amount: 2,
      },
    ],
    exhaust: true,
  },
  machine_bunker: {
    name: "移动堡垒",
    cost: 3,
    target: "self",
    icon: "⬢",
    effects: [
      {
        kind: "block",
        amount: 15,
        target: "party",
      },
      {
        kind: "heat",
        amount: 4,
        target: "self",
      },
    ],
  },
  machine_afterburn: {
    name: "余热脉冲",
    cost: 1,
    target: "enemy",
    icon: "✹",
    effects: [
      {
        kind: "damage",
        amount: 5,
        scale: "heat",
      },
      {
        kind: "cool",
        amount: 3,
        target: "self",
      },
    ],
  },
} as const satisfies Record<string, CardDefinition>;
