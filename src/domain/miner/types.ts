import { z } from "zod";

export const minerGemFamilySchema = z.enum([
  "amber",
  "topaz",
  "amethyst",
  "emerald",
  "ruby",
  "sapphire",
]);
export type MinerGemFamily = z.infer<typeof minerGemFamilySchema>;

export const minerGemGradeSchema = z.enum(["chipped", "whole", "pure"]);
export type MinerGemGrade = z.infer<typeof minerGemGradeSchema>;

export const minerItemIdSchema = z.enum([
  "ironPick",
  "steelPick",
  "diamondPick",
  "lamp",
  "autoHook",
  "support",
  "largeBag",
  "lockbox",
  "insurance",
  "rope",
  "alarm",
  "guardDog",
  "dynamite",
  "staminaPotion",
  "dividend",
  "rescueRope",
]);
export type MinerItemId = z.infer<typeof minerItemIdSchema>;

export const minerRelicIdSchema = z.enum([
  "frostHeart",
  "magneticHook",
  "cartRemote",
  "nightCloak",
  "greedyEye",
  "teamBadge",
  "medkit",
  "springBoots",
  "fakeMarker",
  "icePick",
  "luckyDice",
  "pairRope",
]);
export type MinerRelicId = z.infer<typeof minerRelicIdSchema>;

export const minerDynamicIdSchema = z.enum([
  "ice",
  "minecart",
  "conveyor",
  "lava",
  "magnetic",
  "collapse",
]);
export type MinerDynamicId = z.infer<typeof minerDynamicIdSchema>;

export const minerNodeKindSchema = z.enum([
  "entrance",
  "common",
  "rich",
  "crystal",
  "contested",
  "hazard",
  "shop",
  "rest",
  "event",
  "exit",
]);
export type MinerNodeKind = z.infer<typeof minerNodeKindSchema>;

export const minerMoveSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("vote"), nodeId: z.string().min(1).max(40) }),
  z.object({
    type: z.literal("mine"),
    depositId: z.string().min(1).max(40),
  }),
  z.object({
    type: z.literal("steal"),
    depositId: z.string().min(1).max(40),
  }),
  z.object({
    type: z.literal("use-item"),
    itemId: minerItemIdSchema,
    target: z.number().int().min(0).max(3).optional(),
  }),
  z.object({
    type: z.literal("use-relic"),
    relicId: minerRelicIdSchema,
    target: z.number().int().min(0).max(3).optional(),
  }),
  z.object({
    type: z.literal("rest"),
    choice: z.enum(["stamina", "repair"]),
  }),
  z.object({
    type: z.literal("event"),
    choice: z.enum(["gamble", "rest", "relic"]),
  }),
  z.object({ type: z.literal("pass") }),
]);
export type MinerMove = z.infer<typeof minerMoveSchema>;

export const minerOptionsSchema = z.object({
  floors: z.number().int().min(6).max(12).default(9),
  quota: z.number().int().min(100).max(50000).optional(),
});
export type MinerOptions = z.infer<typeof minerOptionsSchema>;

export interface MinerGem {
  id: string;
  family: MinerGemFamily;
  grade: MinerGemGrade;
  value: number;
}

export interface MinerDeposit {
  id: string;
  kind: "gem" | "item" | "relic";
  gem?: MinerGem;
  item?: MinerItemId;
  relic?: MinerRelicId;
  required: number;
  progress: number;
  owner: number | null;
  hardness: number;
  hazard: number;
  frozen: boolean;
  spoiled: boolean;
  completed: boolean;
}

export interface MinerPlayerView {
  seat: number;
  stamina: number;
  maxStamina: number;
  pickPower: number;
  capacity: number;
  bag: MinerGem[];
  bagCount: number;
  items: MinerItemId[];
  relics: MinerRelicId[];
  relicUses: Partial<Record<MinerRelicId, number>>;
  status: {
    alert: number;
    wanted: number;
    frozen: number;
    exposed: number;
    luck: number;
    nodeSteal: number;
    nodeGuard: number;
    nodePick: number;
    nextProgress: number;
  };
  worn: boolean;
  score: number;
  delivered: number;
  stolen: number;
  stolenFrom: number;
}

export interface MinerMapNodeView {
  id: string;
  floor: number;
  lane: number;
  kind: MinerNodeKind;
  next: string[];
  visited: boolean;
}

export interface MinerNodeView {
  id: string;
  floor: number;
  lane: number;
  kind: MinerNodeKind;
  name: string;
  deposits: MinerDeposit[];
  maxRounds: number;
  round: number;
  dynamic: MinerDynamicId[];
  hazardColumn: number;
}

export interface MinerLogEntry {
  id: number;
  text: string;
}

export interface MinerResult {
  won: boolean;
  quota: number;
  delivered: number;
  ranking: { seat: number; delivered: number; score: number }[];
}

export type MinerPhase =
  | "map"
  | "mine"
  | "shop"
  | "rest"
  | "event"
  | "bank"
  | "won"
  | "lost";

export interface MinerView {
  phase: MinerPhase;
  floor: number;
  round: number;
  map: MinerMapNodeView[][];
  node: MinerNodeView | null;
  votes: Record<number, string>;
  players: MinerPlayerView[];
  teamQuota: number;
  teamDelivered: number;
  activeActor: number;
  order: number[];
  orderIndex: number;
  log: MinerLogEntry[];
  sequence: number;
  lastAction?: {
    actor: number;
    kind: string;
    depositId?: string;
    text: string;
  };
  result?: MinerResult;
}

export interface MinerGameState {
  kind: "miner";
  view: MinerView;
}
