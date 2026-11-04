import type { EncounterMechanicDefinition } from "./content";

export const bossMechanics = {
  trial: {
    id: "trial",
    name: "审判天平",
    summary:
      "戒律碑持续加固首领，裁决碑推进审判。审判满值时全队承伤，击破裁决碑可清空议程。",
    track: { label: "审判", max: 5, initial: 0 },
    phaseThreshold: 0.55,
    phaseName: "失衡法阵",
    phaseSummary: "审判加速，首领改用连续攻击；击破全部律令碑会让首领失衡。",
  },
  fate: {
    id: "fate",
    name: "未来序列",
    summary: "命运随回合和出牌推进。满值时重演上轮行动，净化可以拨回命运。",
    track: { label: "命运", max: 6, initial: 0 },
    phaseThreshold: 0.5,
    phaseName: "加速预言",
    phaseSummary: "命运上限降低为四，重演间隔变得更短。",
  },
  symbiosis: {
    id: "symbiosis",
    name: "双生孢子",
    summary: "每轮向一名英雄散播孢子，孢子在下一轮造成伤害；净化会清除孢子。",
    track: { label: "共生体", max: 2, initial: 2 },
    phaseThreshold: 0.5,
    phaseName: "孤体暴长",
    phaseSummary: "任一身体倒下后，幸存者获得力量并强化孢子。",
  },
  roots: {
    id: "roots",
    name: "根须纠葛",
    summary: "根须连接英雄，未格挡伤害会传导给同伴；净化可以斩断连接。",
    track: { label: "缠绕", max: 2, initial: 0 },
    phaseThreshold: 0.5,
    phaseName: "荆棘根须",
    phaseSummary: "根须开始反伤，并尝试同时束缚更多英雄。",
  },
  furnace: {
    id: "furnace",
    name: "失控熔炉",
    summary:
      "熔炉热量持续上升。击破冷却阀排热；关闭全部冷却阀会让巨像过热失衡。",
    track: { label: "热量", max: 12, initial: 0 },
    phaseThreshold: 0.5,
    phaseName: "核心暴露",
    phaseSummary: "核心失去护甲，但熔炉升温和喷发都更快。",
  },
  tempo: {
    id: "tempo",
    name: "节拍机关",
    summary: "出牌会推动时钟。时钟满格时机师强化自身；完全停手则会修复伤势。",
    track: { label: "节拍", max: 6, initial: 0 },
    phaseThreshold: 0.5,
    phaseName: "倒转钟摆",
    phaseSummary: "节拍上限降低为四，停手治疗也会更强。",
  },
  mirror: {
    id: "mirror",
    name: "镜面回响",
    summary:
      "连续使用同类牌会强化镜面，切换攻击与技能可以打断回响；满值时女王获得护盾与反伤。",
    track: { label: "镜面", max: 4, initial: 0 },
    phaseThreshold: 0.5,
    phaseName: "碎镜领域",
    phaseSummary: "镜面上限降低为三，回响会复制更多护盾。",
  },
  tide: {
    id: "tide",
    name: "月潮涨落",
    summary: "潮位逐轮上涨，满潮时爆发并留下护盾；在高潮前存牌或提前铺盾。",
    track: { label: "月潮", max: 5, initial: 0 },
    phaseThreshold: 0.5,
    phaseName: "倒潮",
    phaseSummary: "潮位周期缩短，满潮爆发同时强化力量。",
  },
  brood: {
    id: "brood",
    name: "孵巢脉冲",
    summary:
      "母体会持续孵化小兵。小兵攻击后留下死亡爆裂，击败母体会让全部所属小兵连锁消散。",
    track: { label: "孵化", max: 3, initial: 0 },
    phaseThreshold: 0.5,
    phaseName: "母巢暴走",
    phaseSummary: "孵化脉冲缩短，存活小兵获得力量。",
  },
  silence: {
    id: "silence",
    name: "无声圣咏",
    summary:
      "颂歌会封住手牌，并在满值时令一名角色下一轮无法出牌；击破封印碑可以延缓圣咏。",
    track: { label: "缄默", max: 4, initial: 0 },
    phaseThreshold: 0.55,
    phaseName: "万籁俱寂",
    phaseSummary: "圣咏加速，封牌数量提高，但首领本体会失去部分格挡。",
  },
  tribute: {
    id: "tribute",
    name: "黄金贡赋",
    summary:
      "暴君持续夺金并囤入赃库。贡赋满值时消耗赃金强化攻击，击败暴君可全额夺回。",
    track: { label: "贡赋", max: 5, initial: 0 },
    phaseThreshold: 0.5,
    phaseName: "熔金王座",
    phaseSummary: "夺金频率提高，暴君会把部分赃金转为力量。",
  },
} as const satisfies Record<string, EncounterMechanicDefinition>;
