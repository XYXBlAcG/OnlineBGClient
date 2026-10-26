export type Effect = {
  kind:
    | "damage"
    | "block"
    | "draw"
    | "poison"
    | "vulnerable"
    | "energy"
    | "heal"
    | "strength"
    | "weak"
    | "dexterity"
    | "thorns"
    | "regen"
    | "cleanse";
  amount: number;
  target?: "self" | "selected" | "party";
  scale?: "block" | "poison" | "played" | "marked";
};
export interface CardDefinition {
  name: string;
  cost: number;
  target: "enemy" | "ally" | "self" | "all-enemies";
  icon: string;
  effects: readonly Effect[];
  exhaust?: boolean;
}
export const cards = {
  strike: {
    name: "打击",
    cost: 1,
    target: "enemy",
    icon: "⚔",
    effects: [{ kind: "damage", amount: 6 }],
  },
  defend: {
    name: "架盾",
    cost: 1,
    target: "self",
    icon: "◈",
    effects: [{ kind: "block", amount: 5 }],
  },
  bash: {
    name: "破甲重击",
    cost: 2,
    target: "enemy",
    icon: "⚒",
    effects: [
      { kind: "damage", amount: 9 },
      { kind: "vulnerable", amount: 2 },
    ],
  },
  protect: {
    name: "援护",
    cost: 1,
    target: "ally",
    icon: "⬡",
    effects: [{ kind: "block", amount: 9 }],
  },
  shield: {
    name: "盾击",
    cost: 1,
    target: "enemy",
    icon: "⛨",
    effects: [
      { kind: "damage", amount: 5 },
      { kind: "block", amount: 4 },
    ],
  },
  quick: {
    name: "疾射",
    cost: 0,
    target: "enemy",
    icon: "➶",
    effects: [{ kind: "damage", amount: 3 }],
  },
  mark: {
    name: "猎手印记",
    cost: 1,
    target: "enemy",
    icon: "◎",
    effects: [
      { kind: "damage", amount: 4 },
      { kind: "vulnerable", amount: 2 },
    ],
  },
  plan: {
    name: "洞察",
    cost: 1,
    target: "self",
    icon: "✧",
    effects: [{ kind: "draw", amount: 2 }],
  },
  sweep: {
    name: "横扫",
    cost: 2,
    target: "all-enemies",
    icon: "✹",
    effects: [{ kind: "damage", amount: 8 }],
  },
  fortress: {
    name: "稳固阵线",
    cost: 1,
    target: "ally",
    icon: "⬢",
    effects: [
      { kind: "block", amount: 7 },
      { kind: "draw", amount: 1 },
    ],
  },
  power: {
    name: "战意",
    cost: 1,
    target: "self",
    icon: "♜",
    effects: [{ kind: "strength", amount: 2 }],
    exhaust: true,
  },
  venom: {
    name: "淬毒箭",
    cost: 1,
    target: "enemy",
    icon: "♠",
    effects: [
      { kind: "damage", amount: 2 },
      { kind: "poison", amount: 5 },
    ],
  },
  volley: {
    name: "箭雨",
    cost: 1,
    target: "all-enemies",
    icon: "⋰",
    effects: [{ kind: "damage", amount: 5 }],
  },
  rush: {
    name: "追风",
    cost: 0,
    target: "self",
    icon: "ϟ",
    effects: [
      { kind: "energy", amount: 1 },
      { kind: "draw", amount: 1 },
    ],
    exhaust: true,
  },
  heal: {
    name: "应急包扎",
    cost: 1,
    target: "ally",
    icon: "✚",
    effects: [{ kind: "heal", amount: 7 }],
    exhaust: true,
  },
  focus: {
    name: "凝神",
    cost: 0,
    target: "self",
    icon: "◈",
    effects: [{ kind: "draw", amount: 1 }],
    exhaust: true,
  },
  brace: {
    name: "屏息",
    cost: 1,
    target: "self",
    icon: "◈",
    effects: [
      { kind: "block", amount: 7 },
      { kind: "cleanse", amount: 1 },
    ],
  },
  aid: {
    name: "递送补给",
    cost: 1,
    target: "ally",
    icon: "◈",
    effects: [
      { kind: "block", amount: 4 },
      { kind: "heal", amount: 3 },
    ],
    exhaust: true,
  },
  resolve: {
    name: "决意",
    cost: 2,
    target: "self",
    icon: "◈",
    effects: [
      { kind: "strength", amount: 2 },
      { kind: "dexterity", amount: 1 },
    ],
    exhaust: true,
  },
  flask: {
    name: "腐蚀瓶",
    cost: 1,
    target: "enemy",
    icon: "◈",
    effects: [
      { kind: "poison", amount: 3 },
      { kind: "weak", amount: 1 },
    ],
  },
  signal: {
    name: "集结信号",
    cost: 1,
    target: "self",
    icon: "◈",
    effects: [
      { kind: "block", amount: 3, target: "party" },
      { kind: "draw", amount: 1 },
    ],
    exhaust: true,
  },
  lastlight: {
    name: "最后的火种",
    cost: 2,
    target: "ally",
    icon: "◈",
    effects: [
      { kind: "heal", amount: 12 },
      { kind: "block", amount: 6 },
    ],
    exhaust: true,
  },
  tempo: {
    name: "整备",
    cost: 0,
    target: "self",
    icon: "◈",
    effects: [
      { kind: "block", amount: 2 },
      { kind: "draw", amount: 1 },
    ],
    exhaust: true,
  },
  guard_bulwark: {
    name: "壁垒",
    cost: 2,
    target: "self",
    icon: "◈",
    effects: [{ kind: "block", amount: 16 }],
  },
  guard_spikes: {
    name: "荆棘甲",
    cost: 1,
    target: "self",
    icon: "◈",
    effects: [
      { kind: "thorns", amount: 3 },
      { kind: "block", amount: 3 },
    ],
    exhaust: true,
  },
  guard_charge: {
    name: "蓄盾冲锋",
    cost: 1,
    target: "enemy",
    icon: "◈",
    effects: [{ kind: "damage", amount: 3, scale: "block" }],
  },
  guard_rally: {
    name: "号令",
    cost: 1,
    target: "self",
    icon: "◈",
    effects: [{ kind: "block", amount: 4, target: "party" }],
  },
  guard_crush: {
    name: "碎甲锤",
    cost: 2,
    target: "enemy",
    icon: "◈",
    effects: [
      { kind: "damage", amount: 14 },
      { kind: "weak", amount: 2 },
    ],
  },
  guard_oath: {
    name: "钢铁誓约",
    cost: 2,
    target: "ally",
    icon: "◈",
    effects: [{ kind: "block", amount: 17 }],
  },
  guard_endure: {
    name: "忍耐",
    cost: 1,
    target: "self",
    icon: "◈",
    effects: [{ kind: "dexterity", amount: 2 }],
    exhaust: true,
  },
  guard_retort: {
    name: "反击架势",
    cost: 1,
    target: "self",
    icon: "◈",
    effects: [
      { kind: "block", amount: 5 },
      { kind: "thorns", amount: 2 },
    ],
  },
  guard_uppercut: {
    name: "挑斩",
    cost: 1,
    target: "enemy",
    icon: "◈",
    effects: [
      { kind: "damage", amount: 7 },
      { kind: "weak", amount: 1 },
    ],
  },
  guard_fortify: {
    name: "固守",
    cost: 0,
    target: "self",
    icon: "◈",
    effects: [{ kind: "block", amount: 4 }],
    exhaust: true,
  },
  guard_banner: {
    name: "不屈战旗",
    cost: 2,
    target: "self",
    icon: "◈",
    effects: [
      { kind: "strength", amount: 1, target: "party" },
      { kind: "block", amount: 3, target: "party" },
    ],
    exhaust: true,
  },
  guard_breach: {
    name: "突破",
    cost: 2,
    target: "enemy",
    icon: "◈",
    effects: [
      { kind: "damage", amount: 16 },
      { kind: "vulnerable", amount: 1 },
    ],
  },
  ranger_storm: {
    name: "暴雨连射",
    cost: 2,
    target: "all-enemies",
    icon: "➶",
    effects: [{ kind: "damage", amount: 10 }],
  },
  ranger_rhythm: {
    name: "连击节奏",
    cost: 1,
    target: "enemy",
    icon: "➶",
    effects: [{ kind: "damage", amount: 3, scale: "played" }],
  },
  ranger_feint: {
    name: "佯攻",
    cost: 0,
    target: "enemy",
    icon: "➶",
    effects: [{ kind: "weak", amount: 1 }],
    exhaust: true,
  },
  ranger_pierce: {
    name: "穿心箭",
    cost: 2,
    target: "enemy",
    icon: "➶",
    effects: [{ kind: "damage", amount: 14, scale: "marked" }],
  },
  ranger_step: {
    name: "侧步",
    cost: 1,
    target: "self",
    icon: "➶",
    effects: [
      { kind: "block", amount: 5 },
      { kind: "draw", amount: 1 },
    ],
  },
  ranger_sight: {
    name: "鹰眼",
    cost: 1,
    target: "self",
    icon: "➶",
    effects: [
      { kind: "strength", amount: 2 },
      { kind: "draw", amount: 1 },
    ],
    exhaust: true,
  },
  ranger_barrage: {
    name: "交叉火力",
    cost: 1,
    target: "enemy",
    icon: "➶",
    effects: [
      { kind: "damage", amount: 8 },
      { kind: "vulnerable", amount: 1 },
    ],
  },
  ranger_cache: {
    name: "隐秘箭袋",
    cost: 0,
    target: "self",
    icon: "➶",
    effects: [{ kind: "draw", amount: 2 }],
    exhaust: true,
  },
  ranger_smoke: {
    name: "烟幕",
    cost: 1,
    target: "all-enemies",
    icon: "➶",
    effects: [{ kind: "weak", amount: 2 }],
  },
  ranger_toxin: {
    name: "毒雾箭",
    cost: 2,
    target: "all-enemies",
    icon: "➶",
    effects: [{ kind: "poison", amount: 4 }],
  },
  ranger_haste: {
    name: "疾行",
    cost: 1,
    target: "self",
    icon: "➶",
    effects: [{ kind: "energy", amount: 2 }],
    exhaust: true,
  },
  ranger_lure: {
    name: "诱敌",
    cost: 1,
    target: "enemy",
    icon: "➶",
    effects: [
      { kind: "damage", amount: 3 },
      { kind: "weak", amount: 2 },
      { kind: "vulnerable", amount: 2 },
    ],
  },
  ranger_guard: {
    name: "影步援护",
    cost: 1,
    target: "ally",
    icon: "➶",
    effects: [
      { kind: "block", amount: 8 },
      { kind: "cleanse", amount: 1 },
    ],
  },
  alchemy_spark: {
    name: "火花",
    cost: 1,
    target: "enemy",
    icon: "✦",
    effects: [
      { kind: "damage", amount: 5 },
      { kind: "poison", amount: 2 },
    ],
  },
  alchemy_ward: {
    name: "晶盾",
    cost: 1,
    target: "self",
    icon: "✦",
    effects: [{ kind: "block", amount: 6 }],
  },
  alchemy_venom: {
    name: "剧毒试剂",
    cost: 1,
    target: "enemy",
    icon: "✦",
    effects: [{ kind: "poison", amount: 6 }],
  },
  alchemy_bloom: {
    name: "催化爆发",
    cost: 2,
    target: "enemy",
    icon: "✦",
    effects: [{ kind: "damage", amount: 2, scale: "poison" }],
  },
  alchemy_mend: {
    name: "复原试剂",
    cost: 1,
    target: "ally",
    icon: "✦",
    effects: [{ kind: "heal", amount: 5 }],
    exhaust: true,
  },
  alchemy_study: {
    name: "实验笔记",
    cost: 1,
    target: "self",
    icon: "✦",
    effects: [{ kind: "draw", amount: 3 }],
  },
  alchemy_fumes: {
    name: "衰弱蒸汽",
    cost: 1,
    target: "all-enemies",
    icon: "✦",
    effects: [{ kind: "weak", amount: 2 }],
  },
  alchemy_regrow: {
    name: "再生液",
    cost: 1,
    target: "ally",
    icon: "✦",
    effects: [{ kind: "regen", amount: 3 }],
    exhaust: true,
  },
  alchemy_volatile: {
    name: "烈性混合物",
    cost: 2,
    target: "all-enemies",
    icon: "✦",
    effects: [
      { kind: "damage", amount: 8 },
      { kind: "poison", amount: 3 },
    ],
  },
  alchemy_filter: {
    name: "净化",
    cost: 0,
    target: "ally",
    icon: "✦",
    effects: [{ kind: "cleanse", amount: 1 }],
  },
  alchemy_distill: {
    name: "蒸馏",
    cost: 0,
    target: "self",
    icon: "✦",
    effects: [{ kind: "energy", amount: 1 }],
    exhaust: true,
  },
  alchemy_barrier: {
    name: "结晶屏障",
    cost: 2,
    target: "self",
    icon: "✦",
    effects: [
      { kind: "block", amount: 13 },
      { kind: "thorns", amount: 2 },
    ],
  },
  alchemy_corrode: {
    name: "蚀甲",
    cost: 1,
    target: "enemy",
    icon: "✦",
    effects: [
      { kind: "poison", amount: 3 },
      { kind: "vulnerable", amount: 2 },
    ],
  },
  alchemy_shared: {
    name: "共享药剂",
    cost: 2,
    target: "self",
    icon: "✦",
    effects: [{ kind: "heal", amount: 4, target: "party" }],
    exhaust: true,
  },
  alchemy_ignite: {
    name: "引燃",
    cost: 1,
    target: "enemy",
    icon: "✦",
    effects: [{ kind: "damage", amount: 8, scale: "marked" }],
  },
  alchemy_growth: {
    name: "生长激素",
    cost: 1,
    target: "ally",
    icon: "✦",
    effects: [{ kind: "strength", amount: 2 }],
    exhaust: true,
  },
  alchemy_guard: {
    name: "防护喷雾",
    cost: 1,
    target: "self",
    icon: "✦",
    effects: [{ kind: "block", amount: 4, target: "party" }],
  },
  alchemy_renew: {
    name: "灵感迸发",
    cost: 2,
    target: "self",
    icon: "✦",
    effects: [
      { kind: "draw", amount: 3 },
      { kind: "energy", amount: 1 },
    ],
    exhaust: true,
  },
} as const satisfies Record<string, CardDefinition>;
export type CardId = keyof typeof cards;
export interface CardInstance {
  id: string;
  card: CardId;
  upgraded: boolean;
}
export function definition(instance: CardInstance): CardDefinition {
  const base: CardDefinition = cards[instance.card];
  return {
    ...base,
    name: base.name + (instance.upgraded ? "＋" : ""),
    effects: base.effects.map((effect) => ({
      ...effect,
      amount:
        effect.amount +
        (instance.upgraded && effect.kind !== "cleanse"
          ? effect.kind === "damage" ||
            effect.kind === "block" ||
            effect.kind === "heal"
            ? 3
            : 1
          : 0),
    })),
  };
}
export function effectsText(effects: readonly Effect[]): string {
  return effects
    .map((effect) => {
      const n = effect.amount;
      const text = {
        damage: `造成 ${n} 伤害`,
        block: `获得 ${n} 格挡`,
        draw: `抽 ${n} 张牌`,
        poison: `施加 ${n} 层中毒`,
        vulnerable: `施加 ${n} 回合易伤`,
        energy: `获得 ${n} 能量`,
        heal: `恢复 ${n} 生命`,
        strength: `力量 +${n}`,
        weak: `施加 ${n} 回合虚弱（攻击降低 25%）`,
        dexterity: `敏捷 +${n}（提高格挡）`,
        thorns: `反伤 +${n}`,
        regen: `再生 +${n}（下轮开始恢复生命并衰减一层）`,
        cleanse: "清除中毒、易伤和虚弱",
      }[effect.kind];
      const scope =
        effect.target === "party"
          ? "全队："
          : effect.target === "self"
            ? "自身："
            : "";
      return (
        scope +
        text +
        (effect.scale === "block"
          ? "，追加自身当前格挡等量伤害"
          : effect.scale === "poison"
            ? "，追加目标中毒层数两倍伤害"
            : effect.scale === "played"
              ? "，本回合每张已打出且未消耗的牌（含本牌）追加 2 伤害"
              : effect.scale === "marked"
                ? "，目标易伤时追加 6 伤害"
                : "")
      );
    })
    .join("；");
}
export function cardText(instance: CardInstance): string {
  const card = definition(instance);
  return (
    effectsText(card.effects) +
    (card.exhaust ? "。消耗：本场战斗不再抽到。" : "。")
  );
}
export const heroContent = [
  {
    name: "铁卫",
    title: "守护与破甲",
    maxHp: 48,
    icon: "⛨",
    deck: [
      "strike",
      "strike",
      "strike",
      "strike",
      "defend",
      "defend",
      "defend",
      "bash",
      "protect",
      "shield",
    ] as CardId[],
    rewards: ["sweep", "fortress", "power", "heal"] as CardId[],
  },
  {
    name: "游侠",
    title: "印记与连击",
    maxHp: 42,
    icon: "➶",
    deck: [
      "strike",
      "strike",
      "strike",
      "defend",
      "defend",
      "defend",
      "quick",
      "quick",
      "mark",
      "plan",
    ] as CardId[],
    rewards: ["venom", "volley", "rush", "heal"] as CardId[],
  },
  {
    name: "炼术师",
    title: "腐蚀、再生与协同",
    maxHp: 44,
    icon: "⚗",
    deck: [
      "alchemy_spark",
      "alchemy_spark",
      "alchemy_spark",
      "alchemy_spark",
      "alchemy_ward",
      "alchemy_ward",
      "alchemy_ward",
      "alchemy_venom",
      "alchemy_mend",
      "alchemy_study",
    ] as CardId[],
    rewards: [
      "alchemy_bloom",
      "alchemy_regrow",
      "alchemy_shared",
      "alchemy_corrode",
    ] as CardId[],
  },
];
export const cardPools: CardId[][] = [
  [
    "bash",
    "protect",
    "shield",
    "sweep",
    "fortress",
    "power",
    ...Object.keys(cards).filter((id) => id.startsWith("guard_")),
  ] as CardId[],
  [
    "quick",
    "mark",
    "plan",
    "venom",
    "volley",
    ...Object.keys(cards).filter((id) => id.startsWith("ranger_")),
  ] as CardId[],
  Object.keys(cards).filter((id) => id.startsWith("alchemy_")) as CardId[],
];
export const commonCards = (Object.keys(cards) as CardId[]).filter(
  (id) => !cardPools.some((pool) => pool.includes(id)),
);
export interface Intent {
  kind: "attack" | "block" | "strength";
  amount: number;
  target: number | "all";
  hits?: number;
}
export interface EnemyDefinition {
  name: string;
  hp: number;
  icon: string;
  pattern: readonly Intent[];
}
export interface EncounterDefinition {
  name: string;
  subtitle: string;
  enemies: EnemyDefinition[];
}
export const encounters: EncounterDefinition[] = [
  {
    name: "风蚀哨站",
    subtitle: "第一战 · 破开守卫的阵线",
    enemies: [
      {
        name: "铁壳守卫",
        hp: 32,
        icon: "sentinel",
        pattern: [
          { kind: "attack", amount: 7, target: 0 },
          { kind: "block", amount: 7, target: 0 },
          { kind: "attack", amount: 5, hits: 2, target: 0 },
        ],
      },
      {
        name: "裂爪兽",
        hp: 26,
        icon: "beast",
        pattern: [
          { kind: "attack", amount: 6, target: 1 },
          { kind: "attack", amount: 8, target: 1 },
        ],
      },
    ],
  },
  {
    name: "晶簇回廊",
    subtitle: "第二战 · 用格挡换取进攻窗口",
    enemies: [
      {
        name: "晶簇哨兵",
        hp: 50,
        icon: "crystal",
        pattern: [
          { kind: "block", amount: 9, target: 0 },
          { kind: "attack", amount: 6, hits: 2, target: 0 },
          { kind: "attack", amount: 9, target: "all" },
        ],
      },
      {
        name: "针尾猎手",
        hp: 36,
        icon: "beast",
        pattern: [
          { kind: "attack", amount: 9, target: 1 },
          { kind: "strength", amount: 2, target: 1 },
          { kind: "attack", amount: 5, hits: 2, target: 1 },
        ],
      },
    ],
  },
  {
    name: "守门者之庭",
    subtitle: "最终战 · 击破重甲与蓄势",
    enemies: [
      {
        name: "遗迹守门者",
        hp: 200,
        icon: "warden",
        pattern: [
          { kind: "attack", amount: 11, target: "all" },
          { kind: "strength", amount: 3, target: 0 },
          { kind: "attack", amount: 10, hits: 2, target: 0 },
          { kind: "block", amount: 12, target: 0 },
        ],
      },
      {
        name: "回声晶核",
        hp: 36,
        icon: "crystal",
        pattern: [
          { kind: "attack", amount: 5, target: 1 },
          { kind: "block", amount: 8, target: 0 },
        ],
      },
    ],
  },
];
