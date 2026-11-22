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
  "critter",
]);
export type MinerObjectKind = z.infer<typeof minerObjectKindSchema>;

export const minerItemIdSchema = z.enum([
  "dynamite",
  "strength",
  "lucky",
  "rockBook",
  "time",
  "rope",
  "freeze",
]);
export type MinerItemId = z.infer<typeof minerItemIdSchema>;

export const minerCharacterIdSchema = z.enum([
  "miner",
  "merchant",
  "strongman",
  "beastTamer",
]);
export type MinerCharacterId = z.infer<typeof minerCharacterIdSchema>;

export const minerPerkIdSchema = z.enum([
  "quickHook",
  "strongRope",
  "goldTouch",
  "deepPockets",
  "timeWarp",
  "blastStart",
  "luckyStart",
  "rockSong",
  "specialist",
  "thickRope",
]);
export type MinerPerkId = z.infer<typeof minerPerkIdSchema>;

export const minerMechanicIdSchema = z.enum([
  "blackout",
  "fog",
  "sonar",
  "flood",
  "tide",
  "conveyor",
  "minecart",
  "zeroGravity",
  "frozenThaw",
  "critters",
  "fallingRocks",
  "fogRollsIn",
  "risingFog",
  "hotspot",
  "phantom",
  "centerWall",
  "magnet",
  "geyser",
  "batSwarm",
  "goldFever",
]);
export type MinerMechanicId = z.infer<typeof minerMechanicIdSchema>;

export const minerMoveSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("character"),
    character: minerCharacterIdSchema,
  }),
  z.object({ type: z.literal("vote"), nodeId: z.string().min(1).max(40) }),
  z.object({
    type: z.literal("drop"),
    angle: z.number().min(-85).max(85),
  }),
  z.object({
    type: z.literal("use-item"),
    itemId: minerItemIdSchema,
  }),
  z.object({ type: z.literal("special") }),
  z.object({ type: z.literal("haul") }),
  z.object({ type: z.literal("buy"), itemId: minerItemIdSchema }),
  z.object({ type: z.literal("spin") }),
  z.object({
    type: z.literal("buy-perk"),
    perkId: minerPerkIdSchema,
  }),
  z.object({ type: z.literal("team-gamble") }),
  z.object({ type: z.literal("ready") }),
  z.object({
    type: z.literal("event"),
    choice: z.enum(["risk", "safe"]),
  }),
]);
export type MinerMove = z.infer<typeof minerMoveSchema>;

export const minerModeSchema = z.enum([
  "quick",
  "ranked",
  "endless",
  "party",
  "daily",
  "bossRush",
  "suddenDeath",
]);
export type MinerMode = z.infer<typeof minerModeSchema>;

export const minerOptionsSchema = z.object({
  mode: minerModeSchema.default("quick"),
  quota: z.number().int().min(100).max(50000).optional(),
  levels: z.number().int().min(3).max(12).default(6),
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
  frozen: boolean;
  phantom: boolean;
}

export interface MinerHook {
  phase: "swing" | "shoot" | "reel";
  angle: number;
  direction: 1 | -1;
  length: number;
  targetId: string | null;
  nextBeatTick: number;
}

export interface MinerPlayerView {
  seat: number;
  character: MinerCharacterId;
  score: number;
  coins: number;
  specialCharge: number;
  specialTicks: number;
  items: Partial<Record<MinerItemId, number>>;
  hook: MinerHook;
  strengthTicks: number;
  ropeNext: boolean;
  lucky: boolean;
  rockBook: boolean;
  luckyStartUsed: boolean;
  lastCatch: string;
}

export interface MinerMineNode {
  id: string;
  sourceKind: NodeKind;
  scene: "mine" | "shop" | "camp" | "event";
  name: string;
  objects: MinerObject[];
  mechanics: MinerMechanicId[];
  durationMs: number;
  timeLeftMs: number;
  waterLevel: number;
  crittersStoppedTicks: number;
  freezeTicks: number;
}

export interface MinerResult {
  won: boolean;
  mode: MinerMode;
  quota: number;
  score: number;
  ranking: { seat: number; score: number; caught: number }[];
  teamScores?: [number, number];
  winningTeam?: 0 | 1;
  lives?: number;
}

export type MinerPhase =
  | "character"
  | "map"
  | "live"
  | "intermission"
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
  characterChoices: Partial<Record<number, MinerCharacterId>>;
  ready: number[];
  shopSpinsUsed: number[];
  teamGambleUsed: boolean;
  perkOffers: MinerPerkId[];
  perkBought: boolean;
  perks: MinerPerkId[];
  players: MinerPlayerView[];
  mode: MinerMode;
  teamQuota: number;
  teamScore: number;
  matchLevels: number;
  levelsPlayed: number;
  teams: number[];
  teamScores: [number, number];
  lives: number;
  levelTarget: number;
  levelScore: number;
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
