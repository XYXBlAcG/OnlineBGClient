import type { NodeKind } from "../expedition/adventure-types";
import type {
  MinerCharacterId,
  MinerItemId,
  MinerMechanicId,
  MinerObjectKind,
} from "./types";

export interface MinerObjectDefinition {
  kind: MinerObjectKind;
  name: string;
  emoji: string;
  value: number;
  weight: number;
  radius: number;
}

export const minerObjects: Record<MinerObjectKind, MinerObjectDefinition> = {
  goldSmall: {
    kind: "goldSmall",
    name: "小金块",
    emoji: "🟡",
    value: 60,
    weight: 1,
    radius: 0.035,
  },
  goldMedium: {
    kind: "goldMedium",
    name: "金块",
    emoji: "🟨",
    value: 140,
    weight: 2,
    radius: 0.045,
  },
  goldLarge: {
    kind: "goldLarge",
    name: "大金块",
    emoji: "🟧",
    value: 320,
    weight: 4,
    radius: 0.06,
  },
  rockSmall: {
    kind: "rockSmall",
    name: "小石头",
    emoji: "🪨",
    value: 25,
    weight: 3,
    radius: 0.04,
  },
  rockLarge: {
    kind: "rockLarge",
    name: "大石头",
    emoji: "🪨",
    value: 50,
    weight: 6,
    radius: 0.065,
  },
  diamond: {
    kind: "diamond",
    name: "钻石",
    emoji: "💎",
    value: 700,
    weight: 1,
    radius: 0.035,
  },
  bag: {
    kind: "bag",
    name: "神秘袋",
    emoji: "🎁",
    value: 180,
    weight: 2,
    radius: 0.045,
  },
  skull: {
    kind: "skull",
    name: "骷髅",
    emoji: "💀",
    value: 15,
    weight: 1,
    radius: 0.035,
  },
  tnt: {
    kind: "tnt",
    name: "TNT",
    emoji: "🧨",
    value: 0,
    weight: 1,
    radius: 0.04,
  },
  critter: {
    kind: "critter",
    name: "矿洞动物",
    emoji: "🦇",
    value: 90,
    weight: 1,
    radius: 0.04,
  },
};

export const minerObjectPool = Object.keys(
  minerObjects,
) as MinerObjectKind[];

export interface MinerItemDefinition {
  id: MinerItemId;
  name: string;
  emoji: string;
  cost: number;
  description: string;
}

export const minerItems: Record<MinerItemId, MinerItemDefinition> = {
  dynamite: {
    id: "dynamite",
    name: "炸药",
    emoji: "🧨",
    cost: 120,
    description: "炸掉当前钩住的物体并快速收钩",
  },
  strength: {
    id: "strength",
    name: "力量药水",
    emoji: "💪",
    cost: 180,
    description: "20 秒内回收速度大幅提升",
  },
  lucky: {
    id: "lucky",
    name: "幸运草",
    emoji: "🍀",
    cost: 200,
    description: "下一次抓取价值 ×1.5",
  },
  rockBook: {
    id: "rockBook",
    name: "岩石收藏书",
    emoji: "📘",
    cost: 280,
    description: "本局石头价值 ×2，可重复购买叠加",
  },
  time: {
    id: "time",
    name: "时间沙漏",
    emoji: "⏳",
    cost: 160,
    description: "当前矿洞时间 +10 秒",
  },
  rope: {
    id: "rope",
    name: "加固绳索",
    emoji: "🪢",
    cost: 220,
    description: "下一次回收不因重量减速",
  },
};

export const minerItemPool = Object.keys(minerItems) as MinerItemId[];

export interface MinerCharacterDefinition {
  id: MinerCharacterId;
  name: string;
  emoji: string;
  special: string;
  description: string;
  charge: number;
}

export const minerCharacters: Record<
  MinerCharacterId,
  MinerCharacterDefinition
> = {
  miner: {
    id: "miner",
    name: "矿工",
    emoji: "⛏️",
    special: "疾速下钩",
    description: "8 秒内摆钩与回收速度提升；抓 6 块金充能。",
    charge: 6,
  },
  merchant: {
    id: "merchant",
    name: "商人",
    emoji: "💼",
    special: "即时到账",
    description: "立刻收回钩上的物体；抓 4 块金充能。",
    charge: 4,
  },
  strongman: {
    id: "strongman",
    name: "大力士",
    emoji: "💪",
    special: "力拔千斤",
    description: "10 秒内重物也快速回收；抓 4 块金充能。",
    charge: 4,
  },
  beastTamer: {
    id: "beastTamer",
    name: "驯兽师",
    emoji: "🦇",
    special: "口哨",
    description: "矿洞动物停止 6 秒；抓 6 块金充能。",
    charge: 6,
  },
};

export interface MinerMechanicDefinition {
  id: MinerMechanicId;
  name: string;
  description: string;
}

export const minerMechanics: Record<
  MinerMechanicId,
  MinerMechanicDefinition
> = {
  blackout: {
    id: "blackout",
    name: "黑屏",
    description: "矿灯熄灭，只能看清钩子附近。",
  },
  fog: {
    id: "fog",
    name: "迷雾",
    description: "雾从矿洞深处涌来，远处物体看不清。",
  },
  sonar: {
    id: "sonar",
    name: "声呐",
    description: "物体在钩子靠近时才显形。",
  },
  flood: {
    id: "flood",
    name: "洪水",
    description: "水位上涨，水面下的物体无法下钩。",
  },
  tide: {
    id: "tide",
    name: "潮汐",
    description: "水位来回涨落，时机决定能抓什么。",
  },
  conveyor: {
    id: "conveyor",
    name: "传送带",
    description: "物体随传送带左右移动。",
  },
  minecart: {
    id: "minecart",
    name: "矿车",
    description: "矿车把物体沿轨道推来推去。",
  },
  zeroGravity: {
    id: "zeroGravity",
    name: "零重力",
    description: "物体缓慢漂浮，位置不断变化。",
  },
  frozenThaw: {
    id: "frozenThaw",
    name: "冰冻解冻",
    description: "部分物体被冻住，第一钩只能破冰。",
  },
  critters: {
    id: "critters",
    name: "矿洞动物",
    description: "蝙蝠和地鼠在矿洞里乱窜。",
  },
};

export const minerMechanicsPool = Object.keys(
  minerMechanics,
) as MinerMechanicId[];

export const minerSceneLabels: Record<NodeKind, string> = {
  battle: "矿洞",
  elite: "富矿洞",
  boss: "秘藏矿洞",
  event: "矿工奇遇",
  shop: "矿工商店",
  camp: "矿工营地",
  treasure: "晶洞",
  oracle: "占卜矿工",
  contract: "矿脉契约",
  forge: "铁匠铺",
  secret: "隐秘矿道",
  pawnshop: "旧货摊",
  gamble: "赌石摊",
  library: "矿工书库",
  hunt: "猎矿场",
  rift: "深渊矿脉",
  recruit: "矿工招募",
  empty: "空矿洞",
};

export function minerSceneFor(kind: NodeKind) {
  if (kind === "shop" || kind === "pawnshop" || kind === "forge")
    return "shop" as const;
  if (kind === "camp") return "camp" as const;
  if (
    kind === "event" ||
    kind === "oracle" ||
    kind === "contract" ||
    kind === "gamble" ||
    kind === "library" ||
    kind === "recruit" ||
    kind === "empty"
  )
    return "event" as const;
  return "mine" as const;
}
