import {
  roomPluginsSchema,
  workshopVisualSchema,
  type WorkshopPack,
} from "../workshop/model";
import { z } from "zod";
import { maxRoomSeats } from "../catalogue";
import type { GameState } from "../types";
import { interactionUnitsSchema } from "../social";
import { partyItems, type PartyItemId } from "./catalogue";
import type { PredictionState } from "./predictions";
export const partyEconomy = {
  initial: 100,
  completion: 40,
  winner: 20,
  support: 5,
  award: 10,
  cooldownMs: 2000,
} as const;
export const awardTitles = {
  teammate: "最佳队友",
  comic: "整活大师",
  tactician: "妙手玩家",
} as const;
export const partyPolicySchema = z.object({
  enabled: z.boolean().default(false),
  unlockAll: z.boolean().default(false),
  betSeconds: z
    .union([z.literal(15), z.literal(30), z.literal(60)])
    .default(30),
});
export type PartyPolicy = z.infer<typeof partyPolicySchema>;
const target = z
  .number()
  .int()
  .min(0)
  .max(maxRoomSeats + 24 - 1);
const purchaseTarget = z.union([target, z.literal("table")]);
const itemIds = Object.keys(partyItems) as [PartyItemId, ...PartyItemId[]];
export const partyActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("plugins"), packs: roomPluginsSchema }),
  z.object({
    type: z.literal("buy-plugin"),
    pack: z.string().max(64),
    effect: z.string().max(64),
    target: purchaseTarget,
    round: z.string().max(160),
  }),
  z.object({ type: z.literal("enabled"), enabled: z.boolean() }),
  z.object({ type: z.literal("policy"), policy: partyPolicySchema }),
  z.object({
    type: z.literal("buy"),
    item: z.enum(itemIds),
    target: purchaseTarget,
    round: z.string().optional(),
    voiceReady: z.boolean().optional(),
  }),
  z.object({ type: z.literal("support"), target }),
  z.object({
    type: z.literal("award"),
    target,
    title: z.enum(["teammate", "comic", "tactician"]),
  }),
  z.object({
    type: z.literal("bet"),
    market: z.string().max(160),
    option: z.string().max(100),
    amount: z.number().int().min(0).max(1000000),
  }),
  z.object({
    type: z.literal("minigame"),
    game: z.string().max(160),
    operation: z.enum(["join", "hit", "collect", "say", "contribute", "vote"]),
    value: z.string().max(80).default(""),
  }),
]);
export type PartyAction = z.infer<typeof partyActionSchema>;
export interface PartyContext {
  players: { id: string; name: string; human: boolean }[];
  observers: number[];
  round: string;
  playing: boolean;
  finished: boolean;
  state?: GameState | null;
  winners?: number[];
  outcomes?: {
    id: string;
    title: string;
    options: { id: string; label: string }[];
    result?: string[];
  }[];
}
export interface PartyAccount {
  coins: number;
  earned: number;
  shield: boolean;
  equipment: PartyItemId[];
  auras: PartyItemId[];
  pluginAuras: { pack: string; effect: string }[];
}
export const partyEventSchema = z.object({
  id: z.string().max(400),
  item: z.enum(itemIds),
  from: z.string().max(100),
  target: z.string().max(100),
  time: z.number(),
  createdAt: z.number().optional(),
  duration: z.number().positive().max(3600000),
  seed: z.number(),
  caption: z.string().max(500),
  density: z.number().positive().max(2),
  visual: workshopVisualSchema.optional(),
  plugin: z
    .object({ id: z.string(), version: z.string(), effect: z.string() })
    .optional(),
  audience: z.enum(["player", "table"]).optional(),
  charged: z
    .object({
      member: z.string().max(100),
      amount: z.number().int().nonnegative(),
    })
    .optional(),
  pauses: z
    .array(z.object({ at: z.number(), duration: z.number().nonnegative() }))
    .max(1000)
    .optional(),
  units: interactionUnitsSchema.optional(),
});
export type PartyEvent = z.infer<typeof partyEventSchema>;
export interface PartyReceipt {
  id: string;
  member: string;
  time: number;
  label: string;
  delta: number;
  balance: number;
}
export interface PartyMiniGame {
  id: string;
  item: "coinGrab" | "boss" | "relay" | "wish";
  owner: string;
  closesAt: number;
  status: "open" | "won" | "failed" | "refunded";
  price: number;
  players: Record<string, number>;
  lastHit: Record<string, number>;
  coins: number[];
  lines: { member: string; text: string }[];
  contributions: Record<string, number>;
  votes: Record<string, PartyItemId>;
}
export interface PartyState {
  sequence: number;
  plugins: WorkshopPack[];
  enabled: boolean;
  policy: PartyPolicy;
  balances: Record<string, PartyAccount>;
  round: string;
  settled: boolean;
  support: Record<string, string>;
  awards: Record<string, { target: string; title: keyof typeof awardTitles }>;
  processed: string[];
  lastBuy: Record<string, number>;
  events: PartyEvent[];
  receipts: PartyReceipt[];
  markets: PredictionState[];
  minigames: PartyMiniGame[];
  observedOutcomes: string[];
}
export type PartySnapshot = Omit<
  PartyState,
  "processed" | "lastBuy" | "observedOutcomes"
> & { observers: number[] };
export function observerSeats(
  state: GameState | null,
  players: number,
): number[] {
  if (!state) return [];
  return Array.from({ length: players }, (_, i) => i).filter((i) => {
    switch (state.kind) {
      case "sgs":
        return (
          state.view.stage === 0 &&
          !state.view.alivePlayerIds.includes(i) &&
          !state.view.eventStack.some(
            (e) =>
              e.playerPos === i + 1 ||
              e.damagedPlayerPos === i + 1 ||
              e.targetPlayerPos === i + 1,
          )
        );
      case "scmj":
        return state.view.wins.some((w) => w.player === i);
      case "uno":
        return !!state.view.playerFinish[i];
      case "fxq":
        return state.view.winners.includes(i);
      case "tq":
        return state.view.winnerId.includes(i);
      case "graphwar":
        return !state.view.soldiers.some((s) => s.player === i && s.hp > 0);
      default:
        return false;
    }
  });
}

export function partyAppearance(event: PartyEvent) {
  const appearance = event.visual ?? {
    ...partyItems[event.item],
    scope: partyItems[event.item].category === "场景" ? "room" : "target",
    scale: 1,
    speed: 1,
    density: 1,
  };
  return event.audience === "table"
    ? { ...appearance, scope: "room" }
    : appearance;
}
