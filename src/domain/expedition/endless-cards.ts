import type { CardDefinition } from "./card-types";

export const endlessCards = {
  deep_pulse: {
    name: "深处脉动",
    cost: 1,
    target: "enemy",
    icon: "◉︎",
    effects: [{ kind: "damage", amount: 7 }],
  },
  pale_beacon: {
    name: "苍白灯塔",
    cost: 1,
    target: "self",
    icon: "☼︎",
    effects: [{ kind: "draw", amount: 2 }],
  },
  corridor_guard: {
    name: "回廊守势",
    cost: 1,
    target: "self",
    icon: "▣︎",
    effects: [
      { kind: "block", amount: 8 },
      { kind: "cleanse", amount: 1 },
    ],
  },
  far_mend: {
    name: "长途补给",
    cost: 1,
    target: "ally",
    icon: "✚︎",
    effects: [{ kind: "heal", amount: 8 }],
  },
  ember_spark: {
    name: "余烬火花",
    cost: 0,
    target: "enemy",
    icon: "✦︎",
    effects: [{ kind: "damage", amount: 4 }],
    exhaust: true,
  },
  endless_thread: {
    name: "无尽丝线",
    cost: 1,
    target: "enemy",
    icon: "≋︎",
    effects: [
      { kind: "poison", amount: 3 },
      { kind: "weak", amount: 1 },
    ],
  },
  tower_verse: {
    name: "塔中诗节",
    cost: 1,
    target: "self",
    icon: "❧︎",
    effects: [
      { kind: "focus", amount: 1 },
      { kind: "draw", amount: 1 },
    ],
  },
  deeper_oath: {
    name: "更深誓约",
    cost: 2,
    target: "self",
    icon: "⚔︎",
    effects: [
      { kind: "strength", amount: 2 },
      { kind: "dexterity", amount: 1 },
    ],
    exhaust: true,
  },
  mirror_echo: {
    name: "镜中回响",
    cost: 1,
    target: "enemy",
    icon: "◌︎",
    effects: [
      { kind: "damage", amount: 3, hits: 2 },
      { kind: "echo", amount: 1 },
    ],
  },
  spire_blessing: {
    name: "塔心祝福",
    cost: 2,
    target: "self",
    icon: "❖︎",
    effects: [
      { kind: "blessing", amount: 1 },
      { kind: "block", amount: 6, target: "party" },
    ],
  },
} as const satisfies Record<string, CardDefinition>;
