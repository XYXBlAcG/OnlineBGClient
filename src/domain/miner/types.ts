import { z } from "zod";
import type { MapNode, NodeKind } from "../expedition/adventure-types";

export const minerObjectKindSchema = z.enum([
  "goldSmall",
  "goldMedium",
  "goldLarge",
  "rockSmall",
  "rockLarge",
  "diamond",
  "bag",
  "skull",
  "tnt",
]);
export type MinerObjectKind = z.infer<typeof minerObjectKindSchema>;

export const minerItemIdSchema = z.enum([
  "dynamite",
  "strength",
  "lucky",
  "rockBook",
  "time",
  "rope",
]);
export type MinerItemId = z.infer<typeof minerItemIdSchema>;

export const minerMoveSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("vote"), nodeId: z.string().min(1).max(40) }),
  z.object({
    type: z.literal("drop"),
    angle: z.number().min(-85).max(85),
  }),
  z.object({
    type: z.literal("use-item"),
    itemId: minerItemIdSchema,
  }),
  z.object({ type: z.literal("buy"), itemId: minerItemIdSchema }),
  z.object({ type: z.literal("ready") }),
  z.object({
    type: z.literal("event"),
    choice: z.enum(["risk", "safe"]),
  }),
]);
export type MinerMove = z.infer<typeof minerMoveSchema>;

export const minerOptionsSchema = z.object({
  quota: z.number().int().min(100).max(50000).optional(),
});
export type MinerOptions = z.infer<typeof minerOptionsSchema>;

export interface MinerObject {
  id: string;
  kind: MinerObjectKind;
  x: number;
  y: number;
  radius: number;
  value: number;
  weight: number;
  hookedBy: number | null;
  removed: boolean;
}

export interface MinerHook {
  phase: "swing" | "shoot" | "reel";
  angle: number;
  direction: 1 | -1;
  length: number;
  targetId: string | null;
}

export interface MinerPlayerView {
  seat: number;
  score: number;
  coins: number;
  items: Partial<Record<MinerItemId, number>>;
  hook: MinerHook;
  strengthTicks: number;
  ropeNext: boolean;
  lucky: boolean;
  rockBook: boolean;
  lastCatch: string;
}

export interface MinerMineNode {
  id: string;
  sourceKind: NodeKind;
  scene: "mine" | "shop" | "camp" | "event";
  name: string;
  objects: MinerObject[];
  durationMs: number;
  timeLeftMs: number;
}

export interface MinerResult {
  won: boolean;
  quota: number;
  score: number;
  ranking: { seat: number; score: number; caught: number }[];
}

export type MinerPhase =
  | "map"
  | "live"
  | "shop"
  | "camp"
  | "event"
  | "won"
  | "lost";

export interface MinerView {
  phase: MinerPhase;
  map: MapNode[][];
  floor: number;
  current: string | null;
  path: string[];
  node: MinerMineNode | null;
  votes: Partial<Record<number, string>>;
  ready: number[];
  players: MinerPlayerView[];
  teamQuota: number;
  teamScore: number;
  tick: number;
  log: { id: number; text: string }[];
  sequence: number;
  lastAction?: {
    actor: number;
    kind: string;
    text: string;
  };
  result?: MinerResult;
}

export interface MinerGameState {
  kind: "miner";
  view: MinerView;
}
