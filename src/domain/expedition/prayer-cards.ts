import type { CardDefinition } from "./card-types";
export const prayerCards = {
  prayer_light: {
    name: "微光打击",
    cost: 1,
    target: "enemy",
    icon: "☀",
    effects: [
      {
        kind: "damage",
        amount: 6,
      },
      {
        kind: "heal",
        amount: 2,
        target: "self",
      },
    ],
  },
  prayer_guard: {
    name: "祈愿护符",
    cost: 1,
    target: "ally",
    icon: "✚",
    effects: [
      {
        kind: "block",
        amount: 6,
      },
      {
        kind: "blessing",
        amount: 3,
      },
    ],
  },
  prayer_mend: {
    name: "治愈祷文",
    cost: 1,
    target: "ally",
    icon: "✚",
    effects: [
      {
        kind: "heal",
        amount: 6,
      },
    ],
  },
  prayer_bless: {
    name: "晨祷",
    cost: 1,
    target: "self",
    icon: "✦",
    effects: [
      {
        kind: "blessing",
        amount: 5,
        target: "party",
      },
      {
        kind: "heal",
        amount: 2,
        target: "party",
      },
    ],
    exhaust: true,
  },
  prayer_smite: {
    name: "惩戒",
    cost: 2,
    target: "enemy",
    icon: "ϟ",
    effects: [
      {
        kind: "damage",
        amount: 14,
      },
      {
        kind: "weak",
        amount: 1,
      },
    ],
  },
  prayer_grace: {
    name: "恩泽",
    cost: 2,
    target: "self",
    icon: "✧",
    effects: [
      {
        kind: "heal",
        amount: 5,
        target: "party",
      },
      {
        kind: "blessing",
        amount: 3,
        target: "party",
      },
    ],
  },
  prayer_clean: {
    name: "净祷",
    cost: 0,
    target: "ally",
    icon: "✚",
    effects: [
      {
        kind: "cleanse",
        amount: 1,
      },
      {
        kind: "block",
        amount: 3,
      },
    ],
    exhaust: true,
  },
  prayer_covenant: {
    name: "庇护誓言",
    cost: 2,
    target: "self",
    icon: "⬡",
    effects: [
      {
        kind: "block",
        amount: 8,
        target: "party",
      },
      {
        kind: "blessing",
        amount: 4,
        target: "party",
      },
    ],
    exhaust: true,
  },
  prayer_briar: {
    name: "荆棘圣印",
    cost: 1,
    target: "ally",
    icon: "♠",
    effects: [
      {
        kind: "thorns",
        amount: 3,
      },
      {
        kind: "heal",
        amount: 3,
      },
    ],
    exhaust: true,
  },
  prayer_renew: {
    name: "复苏之歌",
    cost: 2,
    target: "self",
    icon: "♬",
    effects: [
      {
        kind: "regen",
        amount: 4,
        target: "party",
      },
    ],
    exhaust: true,
  },
  prayer_candle: {
    name: "长明烛",
    cost: 1,
    target: "self",
    icon: "☀",
    effects: [
      {
        kind: "blessing",
        amount: 6,
      },
      {
        kind: "regen",
        amount: 2,
      },
    ],
    exhaust: true,
  },
  prayer_verdict: {
    name: "圣光裁决",
    cost: 3,
    target: "enemy",
    icon: "⚖",
    effects: [
      {
        kind: "damage",
        amount: 22,
      },
      {
        kind: "heal",
        amount: 4,
        target: "party",
      },
    ],
    exhaust: true,
  },
  prayer_refuge: {
    name: "避难所",
    cost: 1,
    target: "ally",
    icon: "⌂",
    effects: [
      {
        kind: "block",
        amount: 10,
      },
    ],
  },
  prayer_mirror: {
    name: "反照护盾",
    cost: 2,
    target: "ally",
    icon: "◈",
    effects: [
      {
        kind: "block",
        amount: 9,
      },
      {
        kind: "thorns",
        amount: 2,
      },
    ],
  },
  prayer_hymn: {
    name: "鼓舞圣歌",
    cost: 1,
    target: "self",
    icon: "♬",
    effects: [
      {
        kind: "strength",
        amount: 1,
        target: "party",
      },
      {
        kind: "heal",
        amount: 2,
        target: "party",
      },
    ],
    exhaust: true,
  },
  prayer_aid: {
    name: "及时援手",
    cost: 0,
    target: "ally",
    icon: "✚",
    effects: [
      {
        kind: "heal",
        amount: 4,
      },
      {
        kind: "blessing",
        amount: 2,
      },
    ],
    exhaust: true,
  },
  prayer_beam: {
    name: "破晓光束",
    cost: 1,
    target: "enemy",
    icon: "↗",
    effects: [
      {
        kind: "damage",
        amount: 8,
      },
      {
        kind: "blessing",
        amount: 2,
        target: "self",
      },
    ],
  },
  prayer_gather: {
    name: "汇聚信念",
    cost: 1,
    target: "self",
    icon: "✦",
    effects: [
      {
        kind: "draw",
        amount: 2,
      },
      {
        kind: "blessing",
        amount: 2,
      },
    ],
  },
  prayer_dusk: {
    name: "暮色谴责",
    cost: 1,
    target: "all-enemies",
    icon: "☾",
    effects: [
      {
        kind: "damage",
        amount: 4,
      },
      {
        kind: "weak",
        amount: 1,
      },
    ],
  },
  prayer_chain: {
    name: "生命连锁",
    cost: 2,
    target: "self",
    icon: "⌁",
    effects: [
      {
        kind: "heal",
        amount: 7,
        target: "party",
      },
      {
        kind: "cleanse",
        amount: 1,
        target: "party",
      },
    ],
    exhaust: true,
  },
  prayer_ward: {
    name: "圣域",
    cost: 3,
    target: "self",
    icon: "⬡",
    effects: [
      {
        kind: "blessing",
        amount: 8,
        target: "party",
      },
      {
        kind: "heal",
        amount: 8,
        target: "party",
      },
    ],
    exhaust: true,
  },
  prayer_faith: {
    name: "坚定信仰",
    cost: 1,
    target: "self",
    icon: "♜",
    effects: [
      {
        kind: "block",
        amount: 5,
      },
      {
        kind: "dexterity",
        amount: 1,
      },
    ],
    exhaust: true,
  },
  prayer_pulse: {
    name: "圣辉脉冲",
    cost: 2,
    target: "all-enemies",
    icon: "✺",
    effects: [
      {
        kind: "damage",
        amount: 9,
      },
      {
        kind: "heal",
        amount: 3,
        target: "party",
      },
    ],
  },
  prayer_shelter: {
    name: "温柔庇护",
    cost: 1,
    target: "ally",
    icon: "☂",
    effects: [
      {
        kind: "blessing",
        amount: 4,
      },
      {
        kind: "heal",
        amount: 4,
      },
    ],
  },
} as const satisfies Record<string, CardDefinition>;
