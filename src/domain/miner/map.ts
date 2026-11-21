import {
  minerDynamicPool,
  minerDynamics,
  minerGemFamilies,
  minerGemFamiliesOrder,
  minerGemGrades,
  minerGemPoolById,
  minerItems,
  minerItemPool,
  minerNodeDefinitions,
  minerRelics,
  minerRelicPool,
} from "./content";
import type {
  MinerDeposit,
  MinerDynamicId,
  MinerGem,
  MinerGemFamily,
  MinerGemGrade,
  MinerMapNodeView,
  MinerNodeKind,
  MinerNodeView,
} from "./types";

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pick<T>(values: readonly T[], random: () => number): T {
  return values[Math.floor(random() * values.length)]!;
}

export function generateMinerMap(
  players: number,
  floors: number,
  random: () => number,
): MinerMapNodeView[][] {
  const kinds: MinerNodeKind[] = [
    "common",
    "common",
    "common",
    "rich",
    "crystal",
    "contested",
    "hazard",
    "event",
  ];
  const map: MinerMapNodeView[][] = Array.from(
    { length: floors },
    (_, floor) => {
      const width = floor === 0 || floor === floors - 1 ? 2 : 2 + (random() < 0.35 ? 1 : 0);
      return Array.from({ length: width }, (_, lane) => ({
        id: `f${floor}-${lane}`,
        floor,
        lane,
        kind: pick(kinds, random),
        next: [],
        visited: false,
      }));
    },
  );
  for (let floor = 0; floor < floors; floor += 3) {
    const end = Math.min(floors, floor + 3);
    const serviceFloor = Math.min(
      end - 1,
      floor + 1 + Math.floor(random() * Math.max(1, end - floor - 1)),
    );
    const serviceNodes = map[serviceFloor]!;
    const shopNode = serviceNodes[Math.floor(random() * serviceNodes.length)]!;
    shopNode.kind = "shop";
    const restNode = serviceNodes.find((node) => node.kind !== "shop");
    if (restNode) restNode.kind = "rest";
  }
  if (floors >= 6) {
    const last = floors - 1;
    for (const node of map[last]!) node.kind = "vault";
    map[last - 1]![0]!.kind = "guardian";
    const service = map[last - 2]!;
    service[0]!.kind = "shop";
    if (service[1]) service[1]!.kind = "rest";
  }
  for (let floor = 0; floor < floors - 1; floor++) {
    const row = map[floor]!;
    const next = map[floor + 1]!;
    for (const node of row) {
      const position = (node.lane + 0.5) / row.length;
      node.next = [...next]
        .sort(
          (a, b) =>
            Math.abs((a.lane + 0.5) / next.length - position) -
            Math.abs((b.lane + 0.5) / next.length - position),
        )
        .slice(0, 2)
        .map((target) => target.id);
    }
  }
  return map;
}

function gradeFor(kind: MinerNodeKind, random: () => number): MinerGemGrade {
  const roll = random();
  if (kind === "rich")
    return roll < 0.32 ? "pure" : roll < 0.78 ? "whole" : "chipped";
  if (kind === "crystal")
    return roll < 0.25 ? "pure" : roll < 0.7 ? "whole" : "chipped";
  return roll < 0.08 ? "pure" : roll < 0.42 ? "whole" : "chipped";
}

function familyFor(kind: MinerNodeKind, random: () => number): MinerGemFamily {
  if (kind === "crystal") {
    const rare: MinerGemFamily[] = ["amethyst", "ruby", "sapphire", "emerald"];
    return pick(rare, random);
  }
  if (kind === "rich") {
    const rich: MinerGemFamily[] = ["emerald", "ruby", "sapphire", "topaz"];
    return pick(rich, random);
  }
  return pick(minerGemFamiliesOrder, random);
}

function createGem(kind: MinerNodeKind, random: () => number): MinerGem {
  const family = familyFor(kind, random);
  const grade = gradeFor(kind, random);
  const definition = minerGemPoolById.get(`${family}-${grade}`)!;
  return {
    id: definition.id,
    family,
    grade,
    value: definition.value,
  };
}

function createGemDeposit(
  index: number,
  kind: MinerNodeKind,
  random: () => number,
): MinerDeposit {
  return {
    id: `d${index}`,
    kind: "gem",
    gem: createGem(kind, random),
    required: 100,
    progress: 0,
    owner: null,
    hardness: kind === "rich" ? 2 : kind === "hazard" ? 2 : random() < 0.25 ? 1 : 0,
    hazard: kind === "hazard" ? 0.28 : kind === "rich" ? 0.12 : 0.04,
    frozen: false,
    spoiled: false,
    completed: false,
  };
}

function createItemDeposit(
  index: number,
  random: () => number,
): MinerDeposit {
  const itemId = pick(minerItemPool, random);
  return {
    id: `d${index}`,
    kind: "item",
    item: itemId,
    required: minerItems[itemId].mineCost,
    progress: 0,
    owner: null,
    hardness: 0,
    hazard: 0.02,
    frozen: false,
    spoiled: false,
    completed: false,
  };
}

function createRelicDeposit(
  index: number,
  random: () => number,
): MinerDeposit {
  const relicId = pick(minerRelicPool, random);
  return {
    id: `d${index}`,
    kind: "relic",
    relic: relicId,
    required: minerRelics[relicId].mineCost,
    progress: 0,
    owner: null,
    hardness: 1,
    hazard: 0.05,
    frozen: false,
    spoiled: false,
    completed: false,
  };
}

export function createMinerNode(
  mapNode: MinerMapNodeView,
  players: number,
  random: () => number,
): MinerNodeView {
  const definition = minerNodeDefinitions[mapNode.kind];
  const dynamic: MinerDynamicId[] =
    mapNode.kind === "rest" || mapNode.kind === "event" || random() > 0.38
      ? []
      : [pick(minerDynamicPool, random)];
  let maxRounds = definition.maxRounds;
  if (dynamic.includes("collapse")) maxRounds = Math.max(2, maxRounds - 1);
  const deposits: MinerDeposit[] = [];
  if (mapNode.kind === "guardian") {
    for (let index = 0; index < players + 1; index++) {
      const deposit = createGemDeposit(index, "rich", random);
      deposit.required = 120;
      deposit.hardness = 2;
      deposit.hazard = 0.32;
      deposits.push(deposit);
    }
  } else if (mapNode.kind === "vault") {
    for (let index = 0; index < players + 1; index++) {
      const deposit = createGemDeposit(index, "crystal", random);
      deposit.required = 120;
      deposit.hazard = 0.08;
      deposits.push(deposit);
    }
    deposits.push(createRelicDeposit(players + 1, random));
  } else if (mapNode.kind === "common") {
    for (let index = 0; index < players + 2; index++)
      deposits.push(createGemDeposit(index, mapNode.kind, random));
  } else if (mapNode.kind === "rich" || mapNode.kind === "crystal") {
    const count = 2 + (players > 2 ? 1 : 0) + (random() < 0.4 ? 1 : 0);
    for (let index = 0; index < count; index++)
      deposits.push(createGemDeposit(index, mapNode.kind, random));
  } else if (mapNode.kind === "hazard" || mapNode.kind === "contested") {
    for (let index = 0; index < players; index++)
      deposits.push(createGemDeposit(index, mapNode.kind, random));
  } else if (mapNode.kind === "shop") {
    for (let index = 0; index < 4; index++)
      deposits.push(createItemDeposit(index, random));
    deposits.push(createRelicDeposit(4, random));
    for (let index = 5; index < 7; index++)
      deposits.push(createGemDeposit(index, "common", random));
  }
  if (dynamic.includes("ice")) for (const deposit of deposits) deposit.frozen = true;
  return {
    ...mapNode,
    name: definition.name,
    deposits,
    maxRounds,
    round: 0,
    dynamic,
    hazardColumn: Math.floor(random() * players),
  };
}

export function minerDynamicLabel(id: MinerDynamicId): string {
  return minerDynamics[id].name;
}

export function minerGemLabel(family: MinerGemFamily, grade: MinerGemGrade): string {
  return `${minerGemGrades[grade].name}${minerGemFamilies[family].name}`;
}

export function minerNodeChoices(
  map: MinerMapNodeView[][],
  floor: number,
): MinerMapNodeView[] {
  return map[floor] ?? [];
}

export { shuffled };
