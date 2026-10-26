import {
  cards,
  effectsText,
  type Effect,
  type EnemyDefinition,
  type CardId,
} from "./content";
export interface RelicDefinition {
  name: string;
  icon: string;
  trigger: "start" | "round" | "card" | "kill" | "victory";
  effects: Effect[];
  every?: number;
  cardType?: "attack" | "skill";
}
export const relics = {
  ember: {
    name: "余烬徽章",
    icon: "☀",
    trigger: "start",
    effects: [{ kind: "strength", amount: 1 }],
  },
  shell: {
    name: "铁壳护符",
    icon: "⬡",
    trigger: "start",
    effects: [{ kind: "block", amount: 8 }],
  },
  lens: {
    name: "鹰眼镜",
    icon: "◎",
    trigger: "start",
    effects: [{ kind: "draw", amount: 1 }],
  },
  battery: {
    name: "蓄能晶体",
    icon: "ϟ",
    trigger: "start",
    effects: [{ kind: "energy", amount: 1 }],
  },
  needle: {
    name: "荆棘针",
    icon: "♠",
    trigger: "start",
    effects: [{ kind: "thorns", amount: 2 }],
  },
  salve: {
    name: "长青药罐",
    icon: "✚",
    trigger: "start",
    effects: [{ kind: "regen", amount: 2 }],
  },
  buckler: {
    name: "旧圆盾",
    icon: "◈",
    trigger: "round",
    effects: [{ kind: "block", amount: 3 }],
  },
  clock: {
    name: "铜制时钟",
    icon: "◷",
    trigger: "round",
    every: 3,
    effects: [{ kind: "energy", amount: 1 }],
  },
  quill: {
    name: "灵感羽笔",
    icon: "✎",
    trigger: "round",
    every: 2,
    effects: [{ kind: "draw", amount: 1 }],
  },
  bandage: {
    name: "旅行绷带",
    icon: "✚",
    trigger: "victory",
    effects: [{ kind: "heal", amount: 4 }],
  },
  trophy: {
    name: "猎人奖章",
    icon: "♜",
    trigger: "kill",
    effects: [{ kind: "block", amount: 3 }],
  },
  tooth: {
    name: "狼牙",
    icon: "⋀",
    trigger: "kill",
    effects: [{ kind: "heal", amount: 2 }],
  },
  stone: {
    name: "稳心石",
    icon: "◆",
    trigger: "start",
    effects: [{ kind: "dexterity", amount: 1 }],
  },
  pennant: {
    name: "协作锦旗",
    icon: "⚑",
    trigger: "start",
    effects: [{ kind: "block", amount: 3, target: "party" }],
  },
  charm: {
    name: "护命符",
    icon: "✦",
    trigger: "round",
    every: 4,
    effects: [{ kind: "heal", amount: 3 }],
  },
  whetstone: {
    name: "磨刀石",
    icon: "◇",
    trigger: "card",
    every: 3,
    cardType: "attack",
    effects: [{ kind: "block", amount: 4 }],
  },
  tome: {
    name: "旧战术书",
    icon: "▤",
    trigger: "card",
    every: 3,
    cardType: "skill",
    effects: [{ kind: "draw", amount: 1 }],
  },
  prism: {
    name: "共鸣棱镜",
    icon: "⬢",
    trigger: "victory",
    effects: [{ kind: "heal", amount: 2, target: "party" }],
  },
} as const satisfies Record<string, RelicDefinition>;
export type RelicId = keyof typeof relics;
export const potions = {
  tonic: {
    name: "生命药水",
    target: "ally",
    effects: [{ kind: "heal", amount: 16 }],
  },
  iron: {
    name: "铁壁药水",
    target: "ally",
    effects: [{ kind: "block", amount: 16 }],
  },
  fire: {
    name: "火焰药水",
    target: "enemy",
    effects: [{ kind: "damage", amount: 18 }],
  },
  poison: {
    name: "毒液药水",
    target: "enemy",
    effects: [{ kind: "poison", amount: 9 }],
  },
  strength: {
    name: "力量药水",
    target: "ally",
    effects: [{ kind: "strength", amount: 3 }],
  },
  energy: {
    name: "活力药水",
    target: "self",
    effects: [{ kind: "energy", amount: 2 }],
  },
  cleanse: {
    name: "净化药水",
    target: "ally",
    effects: [
      { kind: "cleanse", amount: 1 },
      { kind: "block", amount: 5 },
    ],
  },
  insight: {
    name: "洞察药水",
    target: "self",
    effects: [{ kind: "draw", amount: 3 }],
  },
} as const satisfies Record<
  string,
  { name: string; target: "ally" | "enemy" | "self"; effects: Effect[] }
>;
export type PotionId = keyof typeof potions;
interface Creature extends EnemyDefinition {
  rank: "normal" | "elite" | "boss";
}
export const creatures = {
  sentinel: {
    name: "铁壳守卫",
    hp: 28,
    icon: "sentinel",
    rank: "normal",
    pattern: [
      { kind: "attack", amount: 6, target: 0 },
      { kind: "block", amount: 7, target: 0 },
      { kind: "attack", amount: 4, hits: 2, target: 0 },
    ],
  },
  beast: {
    name: "裂爪兽",
    hp: 24,
    icon: "beast",
    rank: "normal",
    pattern: [
      { kind: "attack", amount: 5, target: 0 },
      { kind: "attack", amount: 8, target: 0 },
    ],
  },
  crystal: {
    name: "晶簇哨兵",
    hp: 30,
    icon: "crystal",
    rank: "normal",
    pattern: [
      { kind: "block", amount: 6, target: 0 },
      { kind: "attack", amount: 4, hits: 2, target: 0 },
    ],
  },
  stalker: {
    name: "针尾猎手",
    hp: 25,
    icon: "beast",
    rank: "normal",
    pattern: [
      { kind: "attack", amount: 7, target: 0 },
      { kind: "strength", amount: 2, target: 0 },
      { kind: "attack", amount: 4, hits: 2, target: 0 },
    ],
  },
  drone: {
    name: "回声晶核",
    hp: 20,
    icon: "crystal",
    rank: "normal",
    pattern: [
      { kind: "attack", amount: 4, target: "all" },
      { kind: "block", amount: 6, target: 0 },
    ],
  },
  knight: {
    name: "失落骑士",
    hp: 36,
    icon: "sentinel",
    rank: "normal",
    pattern: [
      { kind: "attack", amount: 9, target: 0 },
      { kind: "block", amount: 10, target: 0 },
    ],
  },
  moth: {
    name: "灰烬飞蛾",
    hp: 18,
    icon: "beast",
    rank: "normal",
    pattern: [
      { kind: "strength", amount: 1, target: 0 },
      { kind: "attack", amount: 3, hits: 3, target: 0 },
    ],
  },
  watcher: {
    name: "窥视之眼",
    hp: 26,
    icon: "crystal",
    rank: "normal",
    pattern: [
      { kind: "attack", amount: 5, target: 0 },
      { kind: "attack", amount: 4, target: "all" },
      { kind: "block", amount: 8, target: 0 },
    ],
  },
  giant: {
    name: "岩甲巨人",
    hp: 72,
    icon: "warden",
    rank: "elite",
    pattern: [
      { kind: "block", amount: 14, target: 0 },
      { kind: "attack", amount: 15, target: 0 },
      { kind: "strength", amount: 3, target: 0 },
    ],
  },
  matriarch: {
    name: "群巢之母",
    hp: 62,
    icon: "beast",
    rank: "elite",
    pattern: [
      { kind: "attack", amount: 6, target: "all" },
      { kind: "attack", amount: 5, hits: 3, target: 0 },
      { kind: "strength", amount: 2, target: 0 },
    ],
  },
  obelisk: {
    name: "共鸣方碑",
    hp: 68,
    icon: "crystal",
    rank: "elite",
    pattern: [
      { kind: "attack", amount: 8, target: "all" },
      { kind: "block", amount: 12, target: 0 },
      { kind: "attack", amount: 12, target: 0 },
    ],
  },
  warden: {
    name: "遗迹守门者",
    hp: 150,
    icon: "warden",
    rank: "boss",
    pattern: [
      { kind: "attack", amount: 9, target: "all" },
      { kind: "strength", amount: 3, target: 0 },
      { kind: "attack", amount: 9, hits: 2, target: 0 },
      { kind: "block", amount: 18, target: 0 },
    ],
  },
  oracle: {
    name: "裂隙先知",
    hp: 135,
    icon: "crystal",
    rank: "boss",
    pattern: [
      { kind: "strength", amount: 2, target: 0 },
      { kind: "attack", amount: 6, hits: 2, target: "all" },
      { kind: "block", amount: 14, target: 0 },
      { kind: "attack", amount: 16, target: 0 },
    ],
  },
} as const satisfies Record<string, Creature>;
export type CreatureId = keyof typeof creatures;
export type EventEffect =
  | {
      kind: "gold" | "hurt" | "heal" | "maxHp" | "upgrade" | "remove";
      amount: number;
    }
  | { kind: "relic" }
  | { kind: "potion" }
  | { kind: "card"; card: CardId };
interface StoryEvent {
  name: string;
  text: string;
  choices: { name: string; effects: EventEffect[] }[];
}
export const storyEvents = {
  spring: {
    name: "发光的泉水",
    text: "泉水中浮现出三道影子。",
    choices: [
      { name: "饮下泉水", effects: [{ kind: "heal", amount: 10 }] },
      { name: "收集晶砂", effects: [{ kind: "gold", amount: 35 }] },
    ],
  },
  forge: {
    name: "无人铁匠铺",
    text: "熔炉仍燃烧着。",
    choices: [
      {
        name: "支付 30 金币锻造",
        effects: [
          { kind: "gold", amount: -30 },
          { kind: "upgrade", amount: 1 },
        ],
      },
      { name: "带走材料", effects: [{ kind: "gold", amount: 12 }] },
    ],
  },
  altar: {
    name: "献祭祭坛",
    text: "石像伸出一只手。",
    choices: [
      {
        name: "献出 8 生命换取遗物",
        effects: [{ kind: "hurt", amount: 8 }, { kind: "relic" }],
      },
      { name: "整理行装", effects: [{ kind: "remove", amount: 1 }] },
    ],
  },
  caravan: {
    name: "受困商旅",
    text: "旅人请你们帮助搬开碎石。",
    choices: [
      {
        name: "共同出力",
        effects: [
          { kind: "hurt", amount: 4 },
          { kind: "gold", amount: 45 },
        ],
      },
      {
        name: "交换药剂",
        effects: [{ kind: "gold", amount: -15 }, { kind: "potion" }],
      },
    ],
  },
  library: {
    name: "回声书库",
    text: "书页记载着已经消失的技艺。",
    choices: [
      { name: "研习战术", effects: [{ kind: "card", card: "resolve" }] },
      { name: "忘却旧招", effects: [{ kind: "remove", amount: 1 }] },
    ],
  },
  nest: {
    name: "空置的巢穴",
    text: "巢中有一枚温热的晶卵。",
    choices: [
      {
        name: "带走晶卵",
        effects: [{ kind: "relic" }, { kind: "hurt", amount: 6 }],
      },
      { name: "采集药草", effects: [{ kind: "heal", amount: 7 }] },
    ],
  },
  mirror: {
    name: "裂纹之镜",
    text: "镜中的你显得更加强壮。",
    choices: [
      {
        name: "接受镜像之力",
        effects: [
          { kind: "maxHp", amount: 5 },
          { kind: "hurt", amount: 5 },
        ],
      },
      { name: "打碎镜面", effects: [{ kind: "gold", amount: 25 }] },
    ],
  },
  campfire: {
    name: "迷途的篝火",
    text: "火光暂时驱散了雾气。",
    choices: [
      { name: "围坐休息", effects: [{ kind: "heal", amount: 12 }] },
      { name: "淬炼武器", effects: [{ kind: "upgrade", amount: 1 }] },
    ],
  },
  gardener: {
    name: "石中花园",
    text: "枝叶从石缝中缓缓生长。",
    choices: [
      {
        name: "培育药苗",
        effects: [{ kind: "potion" }, { kind: "heal", amount: 3 }],
      },
      { name: "放下沉重行装", effects: [{ kind: "remove", amount: 1 }] },
    ],
  },
  vault: {
    name: "封存宝库",
    text: "门后的机关需要生命热量。",
    choices: [
      {
        name: "激活宝库",
        effects: [
          { kind: "hurt", amount: 10 },
          { kind: "gold", amount: 70 },
        ],
      },
      { name: "拾取遗失物", effects: [{ kind: "gold", amount: 15 }] },
    ],
  },
} as const satisfies Record<string, StoryEvent>;
export type StoryEventId = keyof typeof storyEvents;

export function relicText(id: RelicId): string {
  const relic: RelicDefinition = relics[id];
  const trigger = {
    start: "每场战斗开始",
    round: "每轮开始",
    card: "出牌时",
    kill: "击败敌人后",
    victory: "战斗胜利后",
  }[relic.trigger];
  return `${trigger}${relic.every ? `，每 ${relic.every} 次触发` : ""}${relic.cardType ? `（仅${relic.cardType === "attack" ? "攻击" : "技能"}牌）` : ""}：${effectsText(relic.effects)}`;
}
export function eventText(effects: readonly EventEffect[]): string {
  return effects
    .map((effect) =>
      effect.kind === "card"
        ? `获得${cards[effect.card].name}`
        : effect.kind === "relic"
          ? "获得一件随机遗物"
          : effect.kind === "potion"
            ? "获得一瓶随机药水（最多三瓶）"
            : `${{ gold: "金币", hurt: "失去生命（至少保留 1）", heal: "恢复生命", maxHp: "生命上限", upgrade: "升级卡牌", remove: "移除卡牌" }[effect.kind]} ${effect.amount}`,
    )
    .join("；");
}
