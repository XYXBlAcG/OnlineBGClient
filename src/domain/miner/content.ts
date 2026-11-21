import type {
  MinerDynamicId,
  MinerGemFamily,
  MinerGemGrade,
  MinerItemId,
  MinerNodeKind,
  MinerRelicId,
} from "./types";

export const minerGemFamilies: Record<
  MinerGemFamily,
  { name: string; color: string; base: number; effect: string }
> = {
  amber: { name: "琥珀", color: "#e9a52b", base: 30, effect: "纯价值" },
  topaz: { name: "黄玉", color: "#e1c341", base: 40, effect: "下一段挖掘进度 +15" },
  amethyst: { name: "紫晶", color: "#9b72e6", base: 50, effect: "本节点镐力 +1" },
  emerald: { name: "翡翠", color: "#4fbf87", base: 55, effect: "挖出时恢复 1 体力" },
  ruby: { name: "红宝石", color: "#d95164", base: 60, effect: "本节点偷矿成功率 +10%" },
  sapphire: { name: "蓝宝石", color: "#4a82d8", base: 65, effect: "本节点防偷 +10%" },
};

export const minerGemGrades: Record<
  MinerGemGrade,
  { name: string; multiplier: number }
> = {
  chipped: { name: "碎", multiplier: 1 },
  whole: { name: "整", multiplier: 2 },
  pure: { name: "净", multiplier: 3.5 },
};

export interface MinerGemDefinition {
  id: string;
  family: MinerGemFamily;
  grade: MinerGemGrade;
  name: string;
  value: number;
  color: string;
}

export const minerGems: MinerGemDefinition[] = (
  Object.keys(minerGemFamilies) as MinerGemFamily[]
).flatMap((family) =>
  (Object.keys(minerGemGrades) as MinerGemGrade[]).map((grade) => {
    const info = minerGemFamilies[family];
    const gradeInfo = minerGemGrades[grade];
    return {
      id: `${family}-${grade}`,
      family,
      grade,
      name: `${gradeInfo.name}${info.name}`,
      value: Math.round(info.base * gradeInfo.multiplier),
      color: info.color,
    };
  }),
);

export const minerGemById = new Map(minerGems.map((gem) => [gem.id, gem]));
export const minerGemFamiliesOrder = Object.keys(
  minerGemFamilies,
) as MinerGemFamily[];

export interface MinerItemEffect {
  pickBonus?: number;
  capacityBonus?: number;
  stealBonus?: number;
  defenseBonus?: number;
  hazardReduction?: number;
  autoProgress?: number;
  teamQuotaBonus?: number;
  dividend?: number;
  insurance?: boolean;
  rescue?: boolean;
  consumable?: "stamina" | "repair" | "dynamite" | "luck" | "map";
}

export interface MinerItemDefinition {
  id: MinerItemId;
  name: string;
  category: "tool" | "bag" | "steal" | "consumable" | "team";
  mineCost: number;
  description: string;
  effects: MinerItemEffect;
}

export const minerItems: Record<MinerItemId, MinerItemDefinition> = {
  ironPick: {
    id: "ironPick",
    name: "铁镐",
    category: "tool",
    mineCost: 40,
    description: "镐力 +1",
    effects: { pickBonus: 1 },
  },
  steelPick: {
    id: "steelPick",
    name: "精钢镐",
    category: "tool",
    mineCost: 70,
    description: "镐力 +2",
    effects: { pickBonus: 2 },
  },
  diamondPick: {
    id: "diamondPick",
    name: "钻石镐",
    category: "tool",
    mineCost: 100,
    description: "镐力 +3，无视部分硬度",
    effects: { pickBonus: 3, hazardReduction: 0.1 },
  },
  lamp: {
    id: "lamp",
    name: "探矿灯",
    category: "tool",
    mineCost: 50,
    description: "揭示晶洞品级与风险",
    effects: {},
  },
  autoHook: {
    id: "autoHook",
    name: "自动钩爪",
    category: "tool",
    mineCost: 80,
    description: "进入节点时首个矿位 +15 进度",
    effects: { autoProgress: 15 },
  },
  support: {
    id: "support",
    name: "稳固支架",
    category: "tool",
    mineCost: 60,
    description: "落石伤害 -50%",
    effects: { hazardReduction: 0.5 },
  },
  largeBag: {
    id: "largeBag",
    name: "大背包",
    category: "bag",
    mineCost: 40,
    description: "背包容量 +2",
    effects: { capacityBonus: 2 },
  },
  lockbox: {
    id: "lockbox",
    name: "锁箱",
    category: "bag",
    mineCost: 70,
    description: "每节点保护 1 个矿位进度不被偷",
    effects: { defenseBonus: 0.2, insurance: true },
  },
  insurance: {
    id: "insurance",
    name: "保险单",
    category: "bag",
    mineCost: 70,
    description: "第一次被偷时返还 50% 进度",
    effects: { insurance: true },
  },
  rope: {
    id: "rope",
    name: "攀爬绳",
    category: "steal",
    mineCost: 50,
    description: "偷矿成功率 +15%",
    effects: { stealBonus: 0.15 },
  },
  alarm: {
    id: "alarm",
    name: "警铃",
    category: "steal",
    mineCost: 50,
    description: "每节点第一次被偷必定失败",
    effects: { defenseBonus: 0.3, insurance: true },
  },
  guardDog: {
    id: "guardDog",
    name: "护矿犬",
    category: "steal",
    mineCost: 80,
    description: "被偷成功率 -20%",
    effects: { defenseBonus: 0.2 },
  },
  dynamite: {
    id: "dynamite",
    name: "雷管",
    category: "consumable",
    mineCost: 40,
    description: "当前矿位 +50 进度，价值 -20%",
    effects: { consumable: "dynamite" },
  },
  staminaPotion: {
    id: "staminaPotion",
    name: "体力药剂",
    category: "consumable",
    mineCost: 30,
    description: "体力 +2",
    effects: { consumable: "stamina" },
  },
  dividend: {
    id: "dividend",
    name: "分红契约",
    category: "team",
    mineCost: 90,
    description: "队友交矿时你获得 5% 分数",
    effects: { dividend: 0.05 },
  },
  rescueRope: {
    id: "rescueRope",
    name: "救援绳",
    category: "team",
    mineCost: 60,
    description: "给一名队友恢复 2 体力",
    effects: { rescue: true, consumable: "stamina" },
  },
};

export interface MinerRelicEffect {
  stealBonus?: number;
  defenseBonus?: number;
  autoProgress?: number;
  teamQuotaBonus?: number;
  hazardReduction?: number;
  icePick?: boolean;
  failNoExpose?: boolean;
  pairProgress?: number;
  luckyDice?: boolean;
  springBoots?: boolean;
  freeze?: boolean;
  duplicateValue?: number;
}

export interface MinerRelicDefinition {
  id: MinerRelicId;
  name: string;
  tag: "engineer" | "thief" | "leader" | "gambler" | "frost";
  mineCost: number;
  description: string;
  effects: MinerRelicEffect;
}

export const minerRelics: Record<MinerRelicId, MinerRelicDefinition> = {
  frostHeart: {
    id: "frostHeart",
    name: "冰霜之心",
    tag: "frost",
    mineCost: 100,
    description: "每层一次，冻结一名其他玩家 1 个行动",
    effects: { freeze: true },
  },
  magneticHook: {
    id: "magneticHook",
    name: "磁力钩",
    tag: "thief",
    mineCost: 90,
    description: "偷矿成功率 +15%",
    effects: { stealBonus: 0.15 },
  },
  cartRemote: {
    id: "cartRemote",
    name: "矿车遥控器",
    tag: "engineer",
    mineCost: 80,
    description: "每个节点开始自动获得 15 进度",
    effects: { autoProgress: 15 },
  },
  nightCloak: {
    id: "nightCloak",
    name: "夜行斗篷",
    tag: "thief",
    mineCost: 90,
    description: "偷矿失败不会暴露",
    effects: { failNoExpose: true },
  },
  greedyEye: {
    id: "greedyEye",
    name: "贪婪之眼",
    tag: "gambler",
    mineCost: 90,
    description: "高价值矿更多，但自己被偷成功率 +10%",
    effects: { stealBonus: 0.1, defenseBonus: -0.1 },
  },
  teamBadge: {
    id: "teamBadge",
    name: "团队徽章",
    tag: "leader",
    mineCost: 100,
    description: "交矿时团队指标 +5%",
    effects: { teamQuotaBonus: 0.05 },
  },
  medkit: {
    id: "medkit",
    name: "急救箱",
    tag: "leader",
    mineCost: 80,
    description: "每层第一次被偷时返还 50% 进度",
    effects: { defenseBonus: 0.1 },
  },
  springBoots: {
    id: "springBoots",
    name: "弹簧靴",
    tag: "engineer",
    mineCost: 70,
    description: "每层结束时恢复 1 体力",
    effects: { springBoots: true },
  },
  fakeMarker: {
    id: "fakeMarker",
    name: "假矿标",
    tag: "thief",
    mineCost: 70,
    description: "被偷成功率 -15%",
    effects: { defenseBonus: 0.15 },
  },
  icePick: {
    id: "icePick",
    name: "冰镐",
    tag: "frost",
    mineCost: 80,
    description: "对冰冻/高硬度矿位进度 +50%",
    effects: { icePick: true },
  },
  luckyDice: {
    id: "luckyDice",
    name: "幸运骰",
    tag: "gambler",
    mineCost: 70,
    description: "每层一次，重掷一次落石结果",
    effects: { luckyDice: true },
  },
  pairRope: {
    id: "pairRope",
    name: "双人绳索",
    tag: "leader",
    mineCost: 80,
    description: "与队友同节点时，双方挖掘进度 +10%",
    effects: { pairProgress: 0.1 },
  },
};

export interface MinerDynamicDefinition {
  id: MinerDynamicId;
  name: string;
  description: string;
}

export const minerDynamics: Record<MinerDynamicId, MinerDynamicDefinition> = {
  ice: {
    id: "ice",
    name: "冰冻矿层",
    description: "矿位结冰，挖掘进度减半；每回合结束冻结解除",
  },
  minecart: {
    id: "minecart",
    name: "矿车轨道",
    description: "每回合矿车会推进一个随机矿位 15 进度",
  },
  conveyor: {
    id: "conveyor",
    name: "传送带",
    description: "每回合移动矿位，可能把进度带给别人",
  },
  lava: {
    id: "lava",
    name: "岩浆喷口",
    description: "每回合指定座位被岩浆灼伤，损失 1 体力",
  },
  magnetic: {
    id: "magnetic",
    name: "磁力场",
    description: "每两回合交换两个矿位的进度和主人",
  },
  collapse: {
    id: "collapse",
    name: "塌方回响",
    description: "节点回合上限 -1，落石伤害提高",
  },
};

export interface MinerNodeDefinition {
  kind: MinerNodeKind;
  name: string;
  description: string;
  maxRounds: number;
}

export const minerNodeDefinitions: Record<
  MinerNodeKind,
  MinerNodeDefinition
> = {
  entrance: {
    kind: "entrance",
    name: "升降机入口",
    description: "矿工集合，准备下井。",
    maxRounds: 1,
  },
  common: {
    kind: "common",
    name: "普通矿脉",
    description: "稳定的普通矿层。",
    maxRounds: 3,
  },
  rich: {
    kind: "rich",
    name: "富矿脉",
    description: "高价值矿层，落石风险更高。",
    maxRounds: 4,
  },
  crystal: {
    kind: "crystal",
    name: "晶洞",
    description: "稀有宝石与隐藏品级。",
    maxRounds: 3,
  },
  contested: {
    kind: "contested",
    name: "争夺矿点",
    description: "矿位刚好等于人数，偷矿成功率提高。",
    maxRounds: 3,
  },
  hazard: {
    kind: "hazard",
    name: "断层/塌方区",
    description: "每回合落石，收益与风险并存。",
    maxRounds: 3,
  },
  shop: {
    kind: "shop",
    name: "矿脉商店",
    description: "挖开商品箱购买工具与藏品。",
    maxRounds: 3,
  },
  rest: {
    kind: "rest",
    name: "休息站",
    description: "恢复体力或修理工具。",
    maxRounds: 1,
  },
  event: {
    kind: "event",
    name: "赌石事件",
    description: "风险选择，可能获得稀有资源。",
    maxRounds: 1,
  },
  exit: {
    kind: "exit",
    name: "收矿站",
    description: "交矿、结算并升井。",
    maxRounds: 1,
  },
};

export const minerItemPool = Object.keys(minerItems) as MinerItemId[];
export const minerRelicPool = Object.keys(minerRelics) as MinerRelicId[];
export const minerDynamicPool = Object.keys(minerDynamics) as MinerDynamicId[];
export const minerGemPool = minerGems.map((gem) => gem.id);
export const minerGemPoolById = minerGemById;
