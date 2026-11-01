import type { EnemyDefinition } from "./content";
import type { Biome } from "./chapters";
export interface Creature extends EnemyDefinition {
  rank: "normal" | "elite" | "boss";
  biome?: Biome;
}
export const extraCreatures = {
  sporeling: {
    name: "孢子寄生体",
    hp: 23,
    icon: "beast",
    rank: "normal",
    biome: "garden",
    pattern: [
      { kind: "poison", amount: 2, target: 0 },
      { kind: "attack", amount: 5, target: 0 },
    ],
  },
  cultivator: {
    name: "苔衣培育者",
    hp: 27,
    icon: "alchemist",
    rank: "normal",
    biome: "garden",
    pattern: [
      { kind: "heal", amount: 4, target: "all" },
      { kind: "attack", amount: 5, target: 0 },
    ],
  },
  briar: {
    name: "荆棘甲壳",
    hp: 30,
    icon: "sentinel",
    rank: "normal",
    biome: "garden",
    pattern: [
      { kind: "thorns", amount: 2, target: 0 },
      { kind: "attack", amount: 6, target: 0 },
      { kind: "block", amount: 6, target: 0 },
    ],
  },
  creeper: {
    name: "迷雾潜藤",
    hp: 22,
    icon: "beast",
    rank: "normal",
    biome: "garden",
    pattern: [
      { kind: "weak", amount: 1, target: 0 },
      { kind: "attack", amount: 5, hits: 2, target: 0 },
    ],
  },
  pollen: {
    name: "散粉飞蛾",
    hp: 19,
    icon: "beast",
    rank: "normal",
    biome: "garden",
    pattern: [
      { kind: "poison", amount: 1, target: "all" },
      { kind: "attack", amount: 4, target: "all" },
    ],
  },
  orchard: {
    name: "寄生果园",
    hp: 65,
    icon: "warden",
    rank: "elite",
    biome: "garden",
    pattern: [
      { kind: "poison", amount: 3, target: "all" },
      { kind: "heal", amount: 7, target: "all" },
      { kind: "attack", amount: 10, target: 0 },
    ],
  },
  thornlord: {
    name: "刺冠行者",
    hp: 70,
    icon: "sentinel",
    rank: "elite",
    biome: "garden",
    pattern: [
      { kind: "thorns", amount: 3, target: 0 },
      { kind: "block", amount: 9, target: 0 },
      { kind: "attack", amount: 8, hits: 2, target: 0 },
    ],
  },
  mycelium: {
    name: "双生菌后",
    hp: 140,
    icon: "alchemist",
    rank: "boss",
    biome: "garden",
    pattern: [
      { kind: "poison", amount: 2, target: "all" },
      { kind: "heal", amount: 8, target: "all" },
      { kind: "attack", amount: 8, target: "all" },
      { kind: "attack", amount: 7, hits: 2, target: 0 },
    ],
  },
  rootwarden: {
    name: "蔓根守卫",
    hp: 155,
    icon: "warden",
    rank: "boss",
    biome: "garden",
    pattern: [
      { kind: "block", amount: 16, target: 0 },
      { kind: "thorns", amount: 3, target: 0 },
      { kind: "weak", amount: 1, target: "all" },
      { kind: "attack", amount: 12, target: "all" },
    ],
  },
  riveter: {
    name: "铆钉工蜂",
    hp: 25,
    icon: "beast",
    rank: "normal",
    biome: "forge",
    pattern: [
      { kind: "attack", amount: 4, hits: 2, target: 0 },
      { kind: "block", amount: 5, target: 0 },
    ],
  },
  charger: {
    name: "蓄力炮手",
    hp: 29,
    icon: "ranger",
    rank: "normal",
    biome: "forge",
    pattern: [
      { kind: "strength", amount: 2, target: 0 },
      { kind: "block", amount: 4, target: 0 },
      { kind: "attack", amount: 13, target: 0 },
    ],
  },
  repairer: {
    name: "缝铁维修机",
    hp: 24,
    icon: "alchemist",
    rank: "normal",
    biome: "forge",
    pattern: [
      { kind: "heal", amount: 5, target: "all" },
      { kind: "block", amount: 8, target: 0 },
      { kind: "attack", amount: 4, target: 0 },
    ],
  },
  foundryhound: {
    name: "熔渣猎犬",
    hp: 26,
    icon: "beast",
    rank: "normal",
    biome: "forge",
    pattern: [
      { kind: "attack", amount: 8, target: 0 },
      { kind: "weak", amount: 1, target: 0 },
      { kind: "attack", amount: 3, hits: 3, target: 0 },
    ],
  },
  sparkcore: {
    name: "电弧核心",
    hp: 21,
    icon: "crystal",
    rank: "normal",
    biome: "forge",
    pattern: [
      { kind: "attack", amount: 5, target: "all" },
      { kind: "strength", amount: 1, target: 0 },
    ],
  },
  steamknight: {
    name: "蒸汽重骑",
    hp: 78,
    icon: "sentinel",
    rank: "elite",
    biome: "forge",
    pattern: [
      { kind: "block", amount: 15, target: 0 },
      { kind: "strength", amount: 3, target: 0 },
      { kind: "attack", amount: 6, hits: 3, target: 0 },
    ],
  },
  colossus: {
    name: "铸造巨像",
    hp: 160,
    icon: "warden",
    rank: "boss",
    biome: "forge",
    pattern: [
      { kind: "strength", amount: 2, target: 0 },
      { kind: "block", amount: 14, target: 0 },
      { kind: "attack", amount: 7, hits: 3, target: 0 },
      { kind: "attack", amount: 10, target: "all" },
    ],
  },
  clocksmith: {
    name: "守钟机师",
    hp: 145,
    icon: "sentinel",
    rank: "boss",
    biome: "forge",
    pattern: [
      { kind: "attack", amount: 6, target: "all" },
      { kind: "heal", amount: 9, target: "all" },
      { kind: "strength", amount: 2, target: 0 },
      { kind: "attack", amount: 9, hits: 2, target: "all" },
    ],
  },
} as const satisfies Record<string, Creature>;
