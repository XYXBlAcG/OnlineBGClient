import { z } from "zod";
import type { ExpeditionState, Target } from "./types";
import { heroContent, type CardId } from "./content";
import { chapters } from "./chapters";
import type { RelicId, StoryEventId, PotionId } from "./world";
export const expeditionOptionsSchema = z.object({
  difficulty: z.enum(["story", "standard", "challenge"]).default("standard"),
  ascension: z.number().int().min(0).max(10).default(0),
});
export const expeditionDifficulties = {
  story: { label: "旅途", multiplier: 0.82, legacyMultiplier: 0.85 },
  standard: { label: "标准", multiplier: 1.11, legacyMultiplier: 1.15 },
  challenge: { label: "挑战", multiplier: 1.37, legacyMultiplier: 1.42 },
} as const;
export type ResolvedExpeditionOptions = z.infer<typeof expeditionOptionsSchema>;
export type ExpeditionOptions = {
  difficulty: ResolvedExpeditionOptions["difficulty"];
  ascension?: number;
};
const targetSchema = z.object({
  side: z.enum(["hero", "enemy"]),
  index: z.number().int().min(0).max(3),
});
export const expeditionMoveSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("profession"),
    profession: z
      .number()
      .int()
      .min(0)
      .max(heroContent.length - 1),
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
  z.object({ type: z.literal("reroll") }),
  z.object({
    type: z.literal("advance"),
    choice: z.enum(["vitality", "forge", "supplies"]),
  }),
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
  | "battle"
  | "elite"
  | "boss"
  | "event"
  | "shop"
  | "camp"
  | "treasure"
  | "oracle"
  | "contract"
  | "forge"
  | "secret"
  | "pawnshop"
  | "gamble"
  | "library"
  | "hunt";
export const expeditionMapSchema = z
  .array(
    z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          floor: z
            .number()
            .int()
            .min(0)
            .max(Math.max(...chapters.map((chapter) => chapter.depth)) - 1),
          lane: z
            .number()
            .int()
            .min(0)
            .max(Math.max(...chapters.map((chapter) => chapter.width)) - 1),
          kind: z.enum([
            "battle",
            "elite",
            "boss",
            "event",
            "shop",
            "camp",
            "treasure",
            "oracle",
            "contract",
            "forge",
            "secret",
            "pawnshop",
            "gamble",
            "library",
            "hunt",
          ]),
          route: z
            .enum([
              "vanguard",
              "provision",
              "ritual",
              "abyss",
              "pilgrimage",
              "blackmarket",
              "slayer",
              "forbidden",
            ])
            .optional(),
          next: z
            .array(z.string().max(40))
            .max(Math.max(...chapters.map((chapter) => chapter.width))),
        }),
      )
      .min(1)
      .max(Math.max(...chapters.map((chapter) => chapter.width))),
  )
  .min(12)
  .max(Math.max(...chapters.map((chapter) => chapter.depth)));
export type MapNode = z.infer<typeof expeditionMapSchema>[number][number];
export type ShopItem = { id: string; price: number; sold: boolean } & (
  | { kind: "card"; card: CardId }
  | { kind: "relic"; relic: RelicId }
  | { kind: "potion"; potion: PotionId }
);
export interface ExpeditionRun {
  rulesVersion: 1;
  contentVersion: 1;
  campaignVersion: 1 | 2;
  tuning?: 1 | 2;
  chapter: number;
  history: { chapter: number; path: string[] }[];
  luck: number[];
  rerolls: number[];
  eventRerolls: number;
  runId: string;
  seed: string;
  difficulty: ResolvedExpeditionOptions["difficulty"];
  ascension: number;
  phase:
    | "waystation"
    | "profession"
    | "map"
    | "battle"
    | "reward"
    | "shop"
    | "camp"
    | "event"
    | "recovery"
    | "treasure"
    | "oracle"
    | "contract"
    | "pawnshop"
    | "gamble"
    | "library"
    | "hunt"
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
  lastBallot?: {
    sequence: number;
    phase: ExpeditionRun["votePhase"];
    choice: string;
    label: string;
    votes: Partial<Record<number, string>>;
    options: Record<string, string>;
  };
  tieChoices: string[];
  votePhase:
    | "map"
    | "event"
    | "treasure"
    | "holder"
    | "oracle"
    | "contract"
    | "pawnshop"
    | "gamble"
    | "library"
    | "hunt";
  nodeReady: boolean[];
  shop: ShopItem[][];
  shopRemoved: boolean[];
  offers: CardId[][];
  event: StoryEventId | null;
  treasure: RelicId[];
  selectedRelic: RelicId | null;
  pending: { kind: "upgrade" | "remove"; left: number }[][];
  rewardElite: boolean;
  contract: "brood" | null;
  hunt: boolean;
  compass: number;
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
