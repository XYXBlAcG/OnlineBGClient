import type { CardDefinition } from "./card-types";
export const starCards = {
  star_ray: {
    name: "星芒",
    cost: 1,
    target: "enemy",
    icon: "✦︎",
    effects: [
      {
        kind: "damage",
        amount: 6,
      },
      {
        kind: "focus",
        amount: 1,
        target: "self",
      },
    ],
  },
  star_veil: {
    name: "星纱",
    cost: 1,
    target: "self",
    icon: "☽︎",
    effects: [
      {
        kind: "block",
        amount: 6,
      },
      {
        kind: "focus",
        amount: 1,
      },
    ],
  },
  star_echo: {
    name: "延迟回响",
    cost: 1,
    target: "self",
    icon: "◷︎",
    effects: [
      {
        kind: "echo",
        amount: 9,
      },
    ],
  },
  star_chart: {
    name: "观星图谱",
    cost: 1,
    target: "self",
    icon: "✧︎",
    effects: [
      {
        kind: "draw",
        amount: 2,
      },
      {
        kind: "focus",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  star_comet: {
    name: "彗尾",
    cost: 2,
    target: "enemy",
    icon: "☄︎",
    effects: [
      {
        kind: "damage",
        amount: 10,
      },
      {
        kind: "echo",
        amount: 7,
        target: "self",
      },
    ],
  },
  star_eclipse: {
    name: "月蚀",
    cost: 1,
    target: "enemy",
    icon: "☾︎",
    effects: [
      {
        kind: "weak",
        amount: 2,
      },
      {
        kind: "echo",
        amount: 4,
        target: "self",
      },
    ],
  },
  star_orbit: {
    name: "环星屏障",
    cost: 2,
    target: "self",
    icon: "◎︎",
    effects: [
      {
        kind: "block",
        amount: 9,
        target: "party",
      },
      {
        kind: "focus",
        amount: 1,
      },
    ],
  },
  star_reserve: {
    name: "余晖储能",
    cost: 0,
    target: "self",
    icon: "✦︎",
    effects: [
      {
        kind: "focus",
        amount: 2,
      },
    ],
    exhaust: true,
  },
  star_survey: {
    name: "巡天",
    cost: 0,
    target: "self",
    icon: "✧︎",
    effects: [
      {
        kind: "draw",
        amount: 2,
      },
    ],
    exhaust: true,
  },
  star_rain: {
    name: "流星雨",
    cost: 2,
    target: "all-enemies",
    icon: "✺︎",
    effects: [
      {
        kind: "damage",
        amount: 7,
      },
      {
        kind: "echo",
        amount: 6,
        target: "self",
      },
    ],
  },
  star_lens: {
    name: "聚星透镜",
    cost: 1,
    target: "self",
    icon: "◈︎",
    effects: [
      {
        kind: "strength",
        amount: 2,
      },
      {
        kind: "focus",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  star_moon: {
    name: "静月",
    cost: 1,
    target: "ally",
    icon: "☽︎",
    effects: [
      {
        kind: "block",
        amount: 9,
      },
      {
        kind: "regen",
        amount: 2,
      },
    ],
  },
  star_fork: {
    name: "双星",
    cost: 1,
    target: "enemy",
    icon: "✧︎",
    effects: [
      {
        kind: "damage",
        amount: 4,
      },
      {
        kind: "damage",
        amount: 4,
      },
    ],
  },
  star_omen: {
    name: "陨落预兆",
    cost: 2,
    target: "enemy",
    icon: "◷︎",
    effects: [
      {
        kind: "vulnerable",
        amount: 3,
      },
      {
        kind: "echo",
        amount: 12,
        target: "self",
      },
    ],
  },
  star_dawn: {
    name: "黎明潮",
    cost: 2,
    target: "self",
    icon: "☀︎",
    effects: [
      {
        kind: "heal",
        amount: 5,
        target: "party",
      },
      {
        kind: "focus",
        amount: 1,
      },
    ],
  },
  star_nova: {
    name: "超新星",
    cost: 3,
    target: "all-enemies",
    icon: "✹︎",
    effects: [
      {
        kind: "damage",
        amount: 17,
      },
      {
        kind: "echo",
        amount: 8,
        target: "self",
      },
    ],
    exhaust: true,
  },
  star_pulse: {
    name: "星核脉动",
    cost: 1,
    target: "self",
    icon: "✦︎",
    effects: [
      {
        kind: "block",
        amount: 4,
      },
      {
        kind: "echo",
        amount: 5,
      },
      {
        kind: "focus",
        amount: 1,
      },
    ],
  },
  star_bridge: {
    name: "光桥",
    cost: 1,
    target: "ally",
    icon: "⌁︎",
    effects: [
      {
        kind: "draw",
        amount: 1,
      },
      {
        kind: "block",
        amount: 6,
      },
    ],
  },
  star_clear: {
    name: "澄澈夜空",
    cost: 1,
    target: "self",
    icon: "☾︎",
    effects: [
      {
        kind: "cleanse",
        amount: 1,
        target: "party",
      },
      {
        kind: "focus",
        amount: 1,
      },
    ],
  },
  star_converge: {
    name: "星轨汇聚",
    cost: 2,
    target: "self",
    icon: "◎︎",
    effects: [
      {
        kind: "echo",
        amount: 18,
      },
    ],
    exhaust: true,
  },
  star_watch: {
    name: "守望星辰",
    cost: 1,
    target: "self",
    icon: "✧︎",
    effects: [
      {
        kind: "regen",
        amount: 3,
      },
      {
        kind: "echo",
        amount: 3,
      },
    ],
    exhaust: true,
  },
  star_apogee: {
    name: "远日点",
    cost: 2,
    target: "enemy",
    icon: "⊙︎",
    effects: [
      {
        kind: "damage",
        amount: 12,
      },
      {
        kind: "draw",
        amount: 2,
        target: "self",
      },
    ],
  },
  star_telescope: {
    name: "深空透镜",
    cost: 1,
    target: "self",
    icon: "◎︎",
    effects: [
      {
        kind: "draw",
        amount: 1,
      },
      {
        kind: "focus",
        amount: 2,
      },
    ],
  },
  star_stasis: {
    name: "星界锚定",
    cost: 2,
    target: "self",
    icon: "◈︎",
    effects: [
      {
        kind: "block",
        amount: 15,
      },
      {
        kind: "echo",
        amount: 8,
      },
    ],
  },
} as const satisfies Record<string, CardDefinition>;
