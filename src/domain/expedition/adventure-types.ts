import { z } from "zod";
import type { ExpeditionState, Target } from "./types";
import type { CardId } from "./content";
import type { RelicId, StoryEventId, PotionId } from "./world";
export const expeditionOptionsSchema = z.object({
  difficulty: z.enum(["story", "standard", "challenge"]).default("standard"),
});
export const expeditionDifficulties = {
  story: { label: "旅途", multiplier: 0.78 },
  standard: { label: "标准", multiplier: 1 },
  challenge: { label: "挑战", multiplier: 1.2 },
} as const;
export type ExpeditionOptions = z.infer<typeof expeditionOptionsSchema>;
const targetSchema = z.object({
  side: z.enum(["hero", "enemy"]),
  index: z.number().int().min(0).max(3),
});
export const expeditionMoveSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("profession"),
    profession: z.number().int().min(0).max(2),
  }),
  z.object({ type: z.literal("vote"), choice: z.string().min(1).max(40) }),
  z.object({ type: z.literal("tie"), choice: z.string().min(1).max(40) }),
  z.object({
    type: z.literal("card"),
    instance: z.string().min(1).max(40),
    target: targetSchema.optional(),
  }),
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("unready") }),
  z.object({ type: z.literal("reward"), choice: z.string().max(40) }),
  z.object({ type: z.literal("buy"), item: z.string().max(40) }),
  z.object({ type: z.literal("upgrade"), instance: z.string().max(40) }),
  z.object({ type: z.literal("remove"), instance: z.string().max(40) }),
  z.object({ type: z.literal("rest") }),
  z.object({ type: z.literal("done") }),
  z.object({
    type: z.literal("potion"),
    index: z.number().int().min(0).max(2),
    target: targetSchema.optional(),
  }),
  z.object({
    type: z.literal("discard-potion"),
    index: z.number().int().min(0).max(2),
  }),
  z.object({
    type: z.literal("ping"),
    target: targetSchema,
    kind: z.enum(["attack", "protect"]),
  }),
]);
export type ExpeditionMove = z.infer<typeof expeditionMoveSchema>;
export type NodeKind =
  "battle" | "elite" | "boss" | "event" | "shop" | "camp" | "treasure";
export const expeditionMapSchema = z
  .array(
    z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          floor: z.number().int().min(0).max(11),
          lane: z.number().int().min(0).max(5),
          kind: z.enum([
            "battle",
            "elite",
            "boss",
            "event",
            "shop",
            "camp",
            "treasure",
          ]),
          next: z.array(z.string().max(40)).max(6),
        }),
      )
      .min(1)
      .max(6),
  )
  .length(12);
export type MapNode = z.infer<typeof expeditionMapSchema>[number][number];
export type ShopItem = { id: string; price: number; sold: boolean } & (
  | { kind: "card"; card: CardId }
  | { kind: "relic"; relic: RelicId }
  | { kind: "potion"; potion: PotionId }
);
export interface ExpeditionRun {
  rulesVersion: 1;
  contentVersion: 1;
  runId: string;
  seed: string;
  difficulty: ExpeditionOptions["difficulty"];
  phase:
    | "profession"
    | "map"
    | "battle"
    | "reward"
    | "shop"
    | "camp"
    | "event"
    | "recovery"
    | "treasure"
    | "holder"
    | "tie"
    | "won"
    | "lost";
  combat: ExpeditionState;
  map: MapNode[][];
  floor: number;
  current: string | null;
  path: string[];
  professions: Partial<Record<number, number>>;
  votes: Partial<Record<number, string>>;
  tieChoices: string[];
  votePhase: "map" | "event" | "treasure" | "holder";
  nodeReady: boolean[];
  shop: ShopItem[][];
  shopRemoved: boolean[];
  offers: CardId[][];
  event: StoryEventId | null;
  treasure: RelicId[];
  selectedRelic: RelicId | null;
  pending: { kind: "upgrade" | "remove"; left: number }[][];
  rewardElite: boolean;
  sequence: number;
  marks: {
    actor: number;
    target: Target;
    kind: "attack" | "protect";
    sequence: number;
  }[];
}
export interface ExpeditionGameState {
  kind: "expedition";
  view: ExpeditionRun;
}
