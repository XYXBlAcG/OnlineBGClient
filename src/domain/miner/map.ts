import type { MapNode, NodeKind } from "../expedition/adventure-types";
import { generateMap } from "../expedition/map";
import {
  minerMechanics,
  minerMechanicsPool,
  minerObjectPool,
  minerObjects,
  minerSceneFor,
  minerSceneLabels,
} from "./content";
import type {
  MinerMechanicId,
  MinerMineNode,
  MinerObject,
  MinerObjectKind,
  MinerView,
} from "./types";

const pools: Partial<Record<NodeKind, MinerObjectKind[]>> = {
  battle: ["goldSmall", "goldSmall", "goldMedium", "rockSmall", "rockSmall", "bag"],
  elite: ["goldMedium", "goldLarge", "rockLarge", "rockSmall", "diamond", "bag"],
  boss: ["goldLarge", "diamond", "diamond", "bag", "rockLarge", "skull"],
  treasure: ["goldMedium", "goldLarge", "diamond", "bag", "bag"],
  secret: ["diamond", "goldLarge", "bag", "tnt"],
  hunt: ["goldSmall", "goldMedium", "rockSmall", "bag"],
  rift: ["goldLarge", "diamond", "tnt", "skull"],
  event: ["goldSmall", "bag", "skull"],
  gamble: ["goldMedium", "bag", "tnt"],
  library: ["goldSmall", "goldMedium", "rockSmall"],
  recruit: ["goldSmall", "bag"],
  forge: ["goldMedium", "rockLarge", "tnt"],
  contract: ["goldSmall", "rockSmall", "tnt"],
  oracle: ["goldMedium", "diamond"],
  empty: ["goldSmall", "rockSmall"],
};

export function generateMinerMap(seed: string): MapNode[][] {
  return generateMap(seed, 2, 0);
}

export function mapChoices(view: MinerView): MapNode[] {
  if (!view.current) return view.map[0] ?? [];
  const current = view.map.flat().find((node) => node.id === view.current);
  return view.map.flat().filter((node) => current?.next.includes(node.id));
}

export function nodeLabel(kind: NodeKind): string {
  return minerSceneLabels[kind];
}

function objectCount(kind: NodeKind, players: number): number {
  if (kind === "boss") return 12 + players * 2;
  if (kind === "elite" || kind === "rift") return 10 + players * 3;
  return 8 + players * 3;
}

function objectPool(kind: NodeKind): MinerObjectKind[] {
  return pools[kind] ?? minerObjectPool;
}

function createObject(
  id: string,
  kind: MinerObjectKind,
  random: () => number,
): MinerObject {
  const definition = minerObjects[kind];
  return {
    id,
    kind,
    x: 0.08 + random() * 0.84,
    y: 0.18 + random() * 0.72,
    radius: definition.radius,
    value: definition.value,
    weight: definition.weight,
    hookedBy: null,
    removed: false,
    frozen: false,
    phantom: false,
  };
}

function placeObjects(
  nodeKind: NodeKind,
  players: number,
  random: () => number,
): MinerObject[] {
  const pool = objectPool(nodeKind);
  const objects: MinerObject[] = [];
  for (let index = 0; index < objectCount(nodeKind, players); index++) {
    const kind = pool[Math.floor(random() * pool.length)]!;
    let candidate = createObject(`o${index}`, kind, random);
    for (let attempt = 0; attempt < 30; attempt++) {
      const next = createObject(`o${index}`, kind, random);
      const overlaps = objects.some((object) => {
        const dx = object.x - next.x;
        const dy = object.y - next.y;
        return Math.hypot(dx, dy) < object.radius + next.radius + 0.018;
      });
      if (!overlaps) {
        candidate = next;
        break;
      }
    }
    objects.push(candidate);
  }
  return objects;
}

export function createNode(
  node: MapNode,
  players: number,
  random: () => number,
): MinerMineNode {
  const scene = minerSceneFor(node.kind);
  const durationMs =
    node.kind === "boss" || node.kind === "elite" || node.kind === "rift"
      ? 50_000
      : 60_000;
  const objects = scene === "mine" ? placeObjects(node.kind, players, random) : [];
  const mechanics =
    scene === "mine"
      ? (() => {
          const count = node.kind === "battle" ? 1 : random() < 0.5 ? 2 : 1;
          const pool = [...minerMechanicsPool];
          return Array.from({ length: count }, () => {
            const index = Math.floor(random() * pool.length);
            return pool.splice(index, 1)[0]!;
          });
        })()
      : [];
  if (mechanics.includes("frozenThaw"))
    for (const object of objects)
      if (random() < 0.35) object.frozen = true;
  if (mechanics.includes("phantom"))
    for (const object of objects)
      if (random() < 0.18) object.phantom = true;
  if (mechanics.includes("hotspot") && objects.length)
    objects[Math.floor(random() * objects.length)]!.value *= 2;
  if (mechanics.includes("critters") || mechanics.includes("batSwarm")) {
    for (let index = 0; index < 2 + players; index++) {
      const object = createObject(`critter${index}`, "critter", random);
      object.y = 0.2 + random() * 0.45;
      objects.push(object);
    }
  }
  return {
    id: node.id,
    sourceKind: node.kind,
    scene,
    name: nodeLabel(node.kind),
    objects,
    mechanics,
    durationMs: scene === "mine" ? durationMs : 0,
    timeLeftMs: scene === "mine" ? durationMs : 0,
    waterLevel: mechanics.includes("flood") ? 0.55 : mechanics.includes("tide") ? 0.5 : 0,
    crittersStoppedTicks: 0,
    freezeTicks: 0,
  };
}

export function mechanicLabel(id: MinerMechanicId): string {
  return minerMechanics[id].name;
}
