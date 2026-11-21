import type { MapNode, NodeKind } from "../expedition/adventure-types";
import { generateMap } from "../expedition/map";
import {
  minerObjectPool,
  minerObjects,
  minerSceneFor,
  minerSceneLabels,
} from "./content";
import type {
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
  return {
    id: node.id,
    sourceKind: node.kind,
    scene,
    name: nodeLabel(node.kind),
    objects: scene === "mine" ? placeObjects(node.kind, players, random) : [],
    durationMs: scene === "mine" ? durationMs : 0,
    timeLeftMs: scene === "mine" ? durationMs : 0,
  };
}
