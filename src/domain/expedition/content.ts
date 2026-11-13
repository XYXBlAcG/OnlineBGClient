import { expeditionResources, heatRule, resourceEffects } from "./resources";
import { extraCards } from "./extra-cards";
import type { Effect, CardDefinition } from "./card-types";
import type { EncounterModifierId } from "./modifiers";
import type { EnemyTraitId } from "./enemy-traits";
export type { Effect, CardDefinition } from "./card-types";
const baseCards = {
  strike: {
    name: "打击",
    cost: 1,
    target: "enemy",
    icon: "⚔︎",
    effects: [{ kind: "damage", amount: 6 }],
  },
  defend: {
    name: "架盾",
    cost: 1,
    target: "self",
    icon: "◈︎",
    effects: [{ kind: "block", amount: 5 }],
  },
  bash: {
    name: "破甲重击",
    cost: 2,
    target: "enemy",
    icon: "⚒︎",
    effects: [
      { kind: "damage", amount: 9 },
      { kind: "vulnerable", amount: 2 },
    ],
  },
  protect: {
    name: "援护",
    cost: 1,
    target: "ally",
    icon: "⬡︎",
    effects: [{ kind: "block", amount: 9 }],
  },
  shield: {
    name: "盾击",
    cost: 1,
    target: "enemy",
    icon: "⛨︎",
    effects: [
      { kind: "damage", amount: 5 },
      { kind: "block", amount: 4 },
    ],
  },
  quick: {
    name: "疾射",
    cost: 0,
    target: "enemy",
    icon: "➶︎",
    effects: [{ kind: "damage", amount: 3 }],
  },
  mark: {
    name: "猎手印记",
    cost: 1,
    target: "enemy",
    icon: "◎︎",
    effects: [
      { kind: "damage", amount: 4 },
      { kind: "vulnerable", amount: 2 },
    ],
  },
  plan: {
    name: "洞察",
    cost: 1,
    target: "self",
    icon: "✧︎",
    effects: [{ kind: "draw", amount: 2 }],
  },
  sweep: {
    name: "横扫",
    cost: 2,
    target: "all-enemies",
    icon: "✹︎",
    effects: [{ kind: "damage", amount: 8 }],
  },
  fortress: {
    name: "稳固阵线",
    cost: 1,
    target: "ally",
    icon: "⬢︎",
    effects: [
      { kind: "block", amount: 7 },
      { kind: "draw", amount: 1 },
    ],
  },
  power: {
    name: "战意",
    cost: 1,
    target: "self",
    icon: "♜︎",
    effects: [{ kind: "strength", amount: 2 }],
    exhaust: true,
  },
  venom: {
    name: "淬毒箭",
    cost: 1,
    target: "enemy",
    icon: "♠︎",
    effects: [
      { kind: "damage", amount: 2 },
      { kind: "poison", amount: 5 },
    ],
  },
  volley: {
    name: "箭雨",
    cost: 1,
    target: "all-enemies",
    icon: "⋰︎",
    effects: [{ kind: "damage", amount: 5 }],
  },
  rush: {
    name: "追风",
    cost: 0,
    target: "self",
    icon: "ϟ︎",
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
    icon: "✚︎",
    effects: [{ kind: "heal", amount: 7 }],
    exhaust: true,
  },
  focus: {
    name: "凝神",
    cost: 0,
    target: "self",
    icon: "◈︎",
    effects: [{ kind: "draw", amount: 1 }],
    exhaust: true,
  },
  brace: {
    name: "屏息",
    cost: 1,
    target: "self",
    icon: "◈︎",
    effects: [
      { kind: "block", amount: 7 },
      { kind: "cleanse", amount: 1 },
    ],
  },
  aid: {
    name: "递送补给",
    cost: 1,
    target: "ally",
    icon: "◈︎",
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
    icon: "◈︎",
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
    icon: "◈︎",
    effects: [
      { kind: "poison", amount: 3 },
      { kind: "weak", amount: 1 },
    ],
  },
  signal: {
    name: "集结信号",
    cost: 1,
    target: "self",
    icon: "◈︎",
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
    icon: "◈︎",
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
    icon: "◈︎",
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
    icon: "◈︎",
    effects: [{ kind: "block", amount: 16 }],
  },
  guard_spikes: {
    name: "荆棘甲",
    cost: 1,
    target: "self",
    icon: "◈︎",
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
    icon: "◈︎",
    effects: [{ kind: "damage", amount: 3, scale: "block" }],
  },
  guard_rally: {
    name: "号令",
    cost: 1,
    target: "self",
    icon: "◈︎",
    effects: [{ kind: "block", amount: 4, target: "party" }],
  },
  guard_crush: {
    name: "碎甲锤",
    cost: 2,
    target: "enemy",
    icon: "◈︎",
    effects: [
      { kind: "damage", amount: 14 },
      { kind: "weak", amount: 2 },
    ],
  },
  guard_oath: {
    name: "钢铁誓约",
    cost: 2,
    target: "ally",
    icon: "◈︎",
    effects: [{ kind: "block", amount: 17 }],
  },
  guard_endure: {
    name: "忍耐",
    cost: 1,
    target: "self",
    icon: "◈︎",
    effects: [{ kind: "dexterity", amount: 2 }],
    exhaust: true,
  },
  guard_retort: {
    name: "反击架势",
    cost: 1,
    target: "self",
    icon: "◈︎",
    effects: [
      { kind: "block", amount: 5 },
      { kind: "thorns", amount: 2 },
    ],
  },
  guard_uppercut: {
    name: "挑斩",
    cost: 1,
    target: "enemy",
    icon: "◈︎",
    effects: [
      { kind: "damage", amount: 7 },
      { kind: "weak", amount: 1 },
    ],
  },
  guard_fortify: {
    name: "固守",
    cost: 0,
    target: "self",
    icon: "◈︎",
    effects: [{ kind: "block", amount: 4 }],
    exhaust: true,
  },
  guard_banner: {
    name: "不屈战旗",
    cost: 2,
    target: "self",
    icon: "◈︎",
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
    icon: "◈︎",
    effects: [
      { kind: "damage", amount: 16 },
      { kind: "vulnerable", amount: 1 },
    ],
  },
  ranger_storm: {
    name: "暴雨连射",
    cost: 2,
    target: "all-enemies",
    icon: "➶︎",
    effects: [{ kind: "damage", amount: 10 }],
  },
  ranger_rhythm: {
    name: "连击节奏",
    cost: 1,
    target: "enemy",
    icon: "➶︎",
    effects: [{ kind: "damage", amount: 3, scale: "played" }],
  },
  ranger_feint: {
    name: "佯攻",
    cost: 0,
    target: "enemy",
    icon: "➶︎",
    effects: [{ kind: "weak", amount: 1 }],
    exhaust: true,
  },
  ranger_pierce: {
    name: "穿心箭",
    cost: 2,
    target: "enemy",
    icon: "➶︎",
    effects: [{ kind: "damage", amount: 14, scale: "marked" }],
  },
  ranger_step: {
    name: "侧步",
    cost: 1,
    target: "self",
    icon: "➶︎",
    effects: [
      { kind: "block", amount: 5 },
      { kind: "draw", amount: 1 },
    ],
  },
  ranger_sight: {
    name: "鹰眼",
    cost: 1,
    target: "self",
    icon: "➶︎",
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
    icon: "➶︎",
    effects: [
      { kind: "damage", amount: 8 },
      { kind: "vulnerable", amount: 1 },
    ],
  },
  ranger_cache: {
    name: "隐秘箭袋",
    cost: 0,
    target: "self",
    icon: "➶︎",
    effects: [{ kind: "draw", amount: 2 }],
    exhaust: true,
  },
  ranger_smoke: {
    name: "烟幕",
    cost: 1,
    target: "all-enemies",
    icon: "➶︎",
    effects: [{ kind: "weak", amount: 2 }],
  },
  ranger_toxin: {
    name: "毒雾箭",
    cost: 2,
    target: "all-enemies",
    icon: "➶︎",
    effects: [{ kind: "poison", amount: 4 }],
  },
  ranger_haste: {
    name: "疾行",
    cost: 1,
    target: "self",
    icon: "➶︎",
    effects: [{ kind: "energy", amount: 2 }],
    exhaust: true,
  },
  ranger_lure: {
    name: "诱敌",
    cost: 1,
    target: "enemy",
    icon: "➶︎",
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
    icon: "➶︎",
    effects: [
      { kind: "block", amount: 8 },
      { kind: "cleanse", amount: 1 },
    ],
  },
  alchemy_spark: {
    name: "火花",
    cost: 1,
    target: "enemy",
    icon: "✦︎",
    effects: [
      { kind: "damage", amount: 5 },
      { kind: "poison", amount: 2 },
    ],
  },
  alchemy_ward: {
    name: "晶盾",
    cost: 1,
    target: "self",
    icon: "✦︎",
    effects: [{ kind: "block", amount: 6 }],
  },
  alchemy_venom: {
    name: "剧毒试剂",
    cost: 1,
    target: "enemy",
    icon: "✦︎",
    effects: [{ kind: "poison", amount: 6 }],
  },
  alchemy_bloom: {
    name: "催化爆发",
    cost: 2,
    target: "enemy",
    icon: "✦︎",
    effects: [{ kind: "damage", amount: 2, scale: "poison" }],
  },
  alchemy_mend: {
    name: "复原试剂",
    cost: 1,
    target: "ally",
    icon: "✦︎",
    effects: [{ kind: "heal", amount: 5 }],
    exhaust: true,
  },
  alchemy_study: {
    name: "实验笔记",
    cost: 1,
    target: "self",
    icon: "✦︎",
    effects: [{ kind: "draw", amount: 3 }],
  },
  alchemy_fumes: {
    name: "衰弱蒸汽",
    cost: 1,
    target: "all-enemies",
    icon: "✦︎",
    effects: [{ kind: "weak", amount: 2 }],
  },
  alchemy_regrow: {
    name: "再生液",
    cost: 1,
    target: "ally",
    icon: "✦︎",
    effects: [{ kind: "regen", amount: 3 }],
    exhaust: true,
  },
  alchemy_volatile: {
    name: "烈性混合物",
    cost: 2,
    target: "all-enemies",
    icon: "✦︎",
    effects: [
      { kind: "damage", amount: 8 },
      { kind: "poison", amount: 3 },
    ],
  },
  alchemy_filter: {
    name: "净化",
    cost: 0,
    target: "ally",
    icon: "✦︎",
    effects: [{ kind: "cleanse", amount: 1 }],
  },
  alchemy_distill: {
    name: "蒸馏",
    cost: 0,
    target: "self",
    icon: "✦︎",
    effects: [{ kind: "energy", amount: 1 }],
    exhaust: true,
  },
  alchemy_barrier: {
    name: "结晶屏障",
    cost: 2,
    target: "self",
    icon: "✦︎",
    effects: [
      { kind: "block", amount: 13 },
      { kind: "thorns", amount: 2 },
    ],
  },
  alchemy_corrode: {
    name: "蚀甲",
    cost: 1,
    target: "enemy",
    icon: "✦︎",
    effects: [
      { kind: "poison", amount: 3 },
      { kind: "vulnerable", amount: 2 },
    ],
  },
  alchemy_shared: {
    name: "共享药剂",
    cost: 2,
    target: "self",
    icon: "✦︎",
    effects: [{ kind: "heal", amount: 4, target: "party" }],
    exhaust: true,
  },
  alchemy_ignite: {
    name: "引燃",
    cost: 1,
    target: "enemy",
    icon: "✦︎",
    effects: [{ kind: "damage", amount: 8, scale: "marked" }],
  },
  alchemy_growth: {
    name: "生长激素",
    cost: 1,
    target: "ally",
    icon: "✦︎",
    effects: [{ kind: "strength", amount: 2 }],
    exhaust: true,
  },
  alchemy_guard: {
    name: "防护喷雾",
    cost: 1,
    target: "self",
    icon: "✦︎",
    effects: [{ kind: "block", amount: 4, target: "party" }],
  },
  alchemy_renew: {
    name: "灵感迸发",
    cost: 2,
    target: "self",
    icon: "✦︎",
    effects: [
      { kind: "draw", amount: 3 },
      { kind: "energy", amount: 1 },
    ],
    exhaust: true,
  },
} as const satisfies Record<string, CardDefinition>;
export const legacyCardIds = new Set<string>(Object.keys(baseCards));
export const cards = { ...baseCards, ...extraCards };
export type CardId = keyof typeof cards;
export const maxUpgradeLevel = 5;
export interface CardInstance {
  id: string;
  card: CardId;
  upgradeLevel: number;
  expiresRound?: number;
}
export function definition(instance: CardInstance): CardDefinition {
  const base: CardDefinition = cards[instance.card];
  const level = instance.upgradeLevel;
  return {
    ...base,
    name: base.name + (level ? `＋${level}` : ""),
    effects: base.effects.map((effect) => {
      const resource =
        effect.kind in resourceEffects
          ? expeditionResources[
              resourceEffects[effect.kind as keyof typeof resourceEffects]
            ]
          : undefined;
      const gain =
        effect.kind === "cleanse" || effect.kind === "heat"
          ? 0
          : resource
            ? Math.min(level, Math.max(0, resource.maximum - effect.amount))
            : effect.kind === "damage" ||
                effect.kind === "block" ||
                effect.kind === "heal"
              ? 3 * level
              : effect.kind === "energy"
                ? Math.min(level, 1)
                : effect.kind === "draw"
                  ? Math.min(level, 3)
                  : level;
      return { ...effect, amount: effect.amount + gain };
    }),
  };
}
export function canUpgrade(instance: CardInstance): boolean {
  if (instance.upgradeLevel >= maxUpgradeLevel) return false;
  const current = definition(instance);
  const next = definition({
    ...instance,
    upgradeLevel: instance.upgradeLevel + 1,
  });
  return current.effects.some(
    (effect, index) => effect.amount !== next.effects[index].amount,
  );
}
export function effectsText(
  effects: readonly Effect[],
  detailed = true,
): string {
  return effects
    .map((effect) => {
      const n = effect.amount;
      const hitCount = effect.kind === "damage" ? (effect.hits ?? 1) : 1;
      const text = {
        damage: `造成 ${n} 伤害${hitCount > 1 ? `，连续 ${hitCount} 次` : ""}`,
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
        cleanse: "清除中毒、易伤、虚弱、孢子和根须连接",
        heat: `获得 ${n} 热量（上限 ${expeditionResources.heat.maximum}）；${expeditionResources.heat.hint}`,
        cool: `冷却 ${n} 热量`,
        device: `架设炮台 +${n}（上限 ${expeditionResources.turret.maximum}）；每轮行动结束时攻击生命最低的敌人`,
        focus: `蓄能 ${n}（上限 ${expeditionResources.focus.maximum}）；下一轮获得等量额外能量后清空`,
        echo: `积累 ${n} 回响（上限 ${expeditionResources.echo.maximum}）；下一轮开始时攻击生命最低的敌人后清空`,
        blessing: `获得 ${n} 祝福（上限 ${expeditionResources.blessing.maximum}）；每层将 1 点溢出治疗转化为格挡并消耗`,
        dice: `获得 ${n} 骰子（上限 ${expeditionResources.dice.maximum}）`,
      }[effect.kind];
      const compact = {
        heat: `热量 +${n}（≥${heatRule.threshold} 时回合末自伤）`,
        cool: `冷却 ${n} 热量`,
        device: `炮台 +${n}（上限 ${expeditionResources.turret.maximum}，回合末攻击）`,
        focus: `下轮能量 +${n}（上限 ${expeditionResources.focus.maximum}）`,
        echo: `回响 +${n}（下轮攻击后清空）`,
        blessing: `祝福 +${n}（溢出治疗转为格挡）`,
        dice: `骰子 +${n}`,
      };
      const scope =
        effect.target === "party"
          ? "全队："
          : effect.target === "self"
            ? "自身："
            : "";
      return (
        scope +
        (!detailed && effect.kind in compact
          ? compact[effect.kind as keyof typeof compact]
          : text) +
        (effect.scale === "block"
          ? "，追加自身当前格挡等量伤害"
          : effect.scale === "poison"
            ? "，追加目标中毒层数两倍伤害"
            : effect.scale === "played"
              ? "，本回合每张已打出且未消耗的牌（含本牌）追加 2 伤害"
              : effect.scale === "marked"
                ? "，目标易伤时追加 6 伤害"
                : effect.scale === "heat"
                  ? "，追加自身热量两倍伤害"
                  : effect.scale === "turret"
                    ? "，追加炮台数值两倍伤害"
                    : effect.scale === "dice"
                      ? "，追加当前骰子两倍伤害"
                      : "")
      );
    })
    .join("；");
}
export function cardText(instance: CardInstance, detailed = true): string {
  const card = definition(instance);
  if (card.unplayable)
    return card.temporary
      ? "不可打出，本轮行动结束后自动消散。"
      : "不可打出，作为永久诅咒留在牌组中。";
  return (
    `${card.hpCost ? `失去 ${card.hpCost} 生命；` : ""}${card.diceCost ? `消耗 ${card.diceCost} 骰子；` : ""}` +
    effectsText(card.effects, detailed) +
    (card.exhaust && detailed ? "。消耗：本场战斗不再抽到。" : "。")
  );
}
export const heroContent = [
  {
    name: "铁卫",
    title: "守护与破甲",
    description: "以格挡和援护维持队伍阵线，利用破甲与反击打开输出窗口。",
    resourceHint: "适合从防御转入爆发，队伍生存压力高时更稳定。",
    maxHp: 48,
    icon: "⛨︎",
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
    description: "铺设标记，安排抽弃顺序，并用多段攻击收割被标记目标。",
    resourceHint: "需要规划手牌与攻击次数，轻装但爆发窗口明显。",
    maxHp: 42,
    icon: "➶︎",
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
    description: "用毒、再生和净化处理持续战斗，擅长把负面状态转成节奏。",
    resourceHint: "毒与再生需要提前布局，面对高生命敌人时收益更高。",
    maxHp: 44,
    icon: "⚗︎",
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
  {
    name: "机巧师",
    title: "炮台与过热",
    description: "架设炮台并管理热量，在过热前完成蓄能与连续攻击。",
    resourceHint: "炮台会在每轮行动结束后自动攻击，热量过高会反噬自身。",
    maxHp: 43,
    icon: "⚙︎",
    deck: [
      "machine_bolt",
      "machine_bolt",
      "machine_bolt",
      "machine_plate",
      "machine_plate",
      "machine_plate",
      "machine_turret",
      "machine_vent",
      "machine_overload",
      "strike",
    ] as CardId[],
    rewards: [
      "machine_sentry",
      "machine_coolant",
      "machine_salvo",
      "machine_repair",
    ] as CardId[],
  },
  {
    name: "星象师",
    title: "蓄能与延迟回响",
    description: "把能量存到下一轮，通过蓄能和回响制造跨回合爆发。",
    resourceHint: "蓄能与回响会在下一轮转化，当前轮需要为未来保留空间。",
    maxHp: 40,
    icon: "✦︎",
    deck: [
      "star_ray",
      "star_ray",
      "star_ray",
      "star_veil",
      "star_veil",
      "star_veil",
      "star_echo",
      "star_chart",
      "star_eclipse",
      "defend",
    ] as CardId[],
    rewards: [
      "star_comet",
      "star_reserve",
      "star_orbit",
      "star_moon",
    ] as CardId[],
  },
  {
    name: "祈愿师",
    title: "祝福与溢出庇护",
    description: "通过治疗、祝福和光暗转化维持队友，并把溢出治疗变成格挡。",
    resourceHint: "祝福只转化溢出治疗，队伍满血时收益会降低。",
    maxHp: 45,
    icon: "✚︎",
    deck: [
      "prayer_light",
      "prayer_light",
      "prayer_light",
      "prayer_guard",
      "prayer_guard",
      "prayer_guard",
      "prayer_mend",
      "prayer_bless",
      "prayer_beam",
      "defend",
    ] as CardId[],
    rewards: [
      "prayer_grace",
      "prayer_smite",
      "prayer_clean",
      "prayer_renew",
    ] as CardId[],
  },
  {
    name: "渊行者",
    title: "余烬与回响",
    description: "在秘塔深处拾取余烬，以持续回复与回响对抗越来越深的黑暗。",
    resourceHint: "适合无尽模式长线推进，靠回复与回响拖垮强敌。",
    maxHp: 46,
    icon: "☾︎",
    deck: [
      "strike",
      "strike",
      "strike",
      "defend",
      "defend",
      "defend",
      "abyss_strike",
      "abyss_guard",
      "abyss_lantern",
      "abyss_rite",
    ] as CardId[],
    rewards: [
      "abyss_lantern",
      "abyss_veil",
      "abyss_ward",
      "abyss_mend",
    ] as CardId[],
  },
  {
    name: "契刃客",
    title: "生命契约与击杀回收",
    description: "主动支付生命换取高额伤害、力量和击杀后的恢复。",
    resourceHint: "卡牌的生命费用不会直接杀死角色，但低生命时仍需要谨慎。",
    maxHp: 52,
    icon: "⚔︎",
    deck: [
      "covenant_cut",
      "covenant_cut",
      "covenant_cut",
      "covenant_cut",
      "covenant_guard",
      "covenant_guard",
      "covenant_guard",
      "covenant_hunt",
      "covenant_oath",
      "covenant_second",
    ] as CardId[],
    rewards: [
      "covenant_execution",
      "covenant_reap",
      "covenant_moon",
      "covenant_redline",
    ] as CardId[],
  },
  {
    name: "骰术师",
    title: "骰子资源与点数爆发",
    description: "每轮积累骰子，消耗骰子强化攻击与防御，并利用点数资源连携。",
    resourceHint:
      "骰子有上限，部分卡牌没有骰子时不能打出；回合转换会补充骰子。",
    maxHp: 40,
    icon: "⚄︎",
    deck: [
      "dice_shot",
      "dice_shot",
      "dice_shot",
      "dice_shot",
      "dice_guard",
      "dice_guard",
      "dice_guard",
      "dice_prepare",
      "dice_loaded",
      "dice_bank",
    ] as CardId[],
    rewards: [
      "dice_burst",
      "dice_jackpot",
      "dice_even",
      "dice_mirror",
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
  Object.keys(cards).filter((id) => id.startsWith("machine_")) as CardId[],
  Object.keys(cards).filter((id) => id.startsWith("star_")) as CardId[],
  Object.keys(cards).filter((id) => id.startsWith("prayer_")) as CardId[],
  [
    ...Object.keys(cards).filter((id) => id.startsWith("abyss_")),
    "common_patience",
    "common_ration",
    "common_rescue",
    "common_flare",
    "common_canteen",
    "common_sharpen",
    "common_scavenge",
    "common_cover",
    "common_trap",
    "common_lantern",
    "common_second",
    "common_last",
  ] as CardId[],
  Object.keys(cards).filter((id) => id.startsWith("covenant_")) as CardId[],
  Object.keys(cards).filter((id) => id.startsWith("dice_")) as CardId[],
];
export const commonCards = (Object.keys(cards) as CardId[]).filter(
  (id) =>
    !cardPools.some((pool) => pool.includes(id)) &&
    !("unplayable" in cards[id] && cards[id].unplayable),
);
export interface Intent {
  kind:
    | "attack"
    | "block"
    | "strength"
    | "poison"
    | "weak"
    | "heal"
    | "thorns"
    | "seal"
    | "silence"
    | "steal-gold"
    | "steal-relic";
  amount: number;
  target: number | "all";
  hits?: number;
}
export type EncounterMechanicId =
  | "trial"
  | "fate"
  | "symbiosis"
  | "roots"
  | "furnace"
  | "tempo"
  | "mirror"
  | "tide"
  | "brood"
  | "silence"
  | "tribute";
export interface EncounterMechanicDefinition {
  id: EncounterMechanicId;
  name: string;
  summary: string;
  track: {
    label: string;
    max: number;
    initial?: number;
  };
  phaseThreshold: number;
  phaseName: string;
  phaseSummary: string;
}
export interface EnemyDefinition {
  key?: string;
  name: string;
  hp: number;
  icon: string;
  pattern: readonly Intent[];
  phasePattern?: readonly Intent[];
  role?: "boss" | "guard" | "part" | "minion";
  part?: string;
  deathBurst?: number;
  traits?: readonly EnemyTraitId[];
}
export interface SummonRule {
  source: string;
  template: EnemyDefinition;
  first: number;
  every: number;
  max: number;
}
export interface EncounterDefinition {
  name: string;
  subtitle: string;
  enemies: EnemyDefinition[];
  mechanic?: EncounterMechanicDefinition;
  summons?: readonly SummonRule[];
  modifiers?: readonly EncounterModifierId[];
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
