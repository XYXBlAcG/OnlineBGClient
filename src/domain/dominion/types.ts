import { z } from "zod";
import { dominionCards, kingdomCards, type Card, type CardId } from "./cards";
export const cardSchema = z.enum(
  Object.keys(dominionCards) as [CardId, ...CardId[]],
);
export const dominionOptionsSchema = z
  .object({
    mode: z.enum(["first", "random", "custom"]).default("first"),
    kingdom: z.array(cardSchema).default([]),
  })
  .refine(
    (value) =>
      value.mode !== "custom" ||
      (value.kingdom.length === 10 &&
        new Set(value.kingdom).size === 10 &&
        value.kingdom.every((card) => kingdomCards.includes(card))),
    "自选王国需要十种不同的王国卡",
  );
export type DominionOptions = z.infer<typeof dominionOptionsSchema>;
export const dominionMoveSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("play"), card: cardSchema }),
  z.object({ type: z.literal("buy"), card: cardSchema }),
  z.object({ type: z.literal("treasures") }),
  z.object({ type: z.literal("buy-phase") }),
  z.object({ type: z.literal("end") }),
  z.object({ type: z.literal("choose"), choice: z.string().max(32) }),
]);
export type DominionMove = z.infer<typeof dominionMoveSchema>;
export interface DominionPlayer {
  hand: Card[];
  deck: Card[];
  discard: Card[];
  aside: Card[];
  turns: number;
  inventory?: Partial<Record<CardId, number>>;
}
export type DominionTask =
  | { type: "card"; actor: number; card: CardId }
  | { type: "attack"; actor: number; card: CardId; source: number }
  | { type: "library"; actor: number }
  | { type: "topdeck"; actor: number };
export type PromptKind =
  | "response"
  | "cellar"
  | "chapel"
  | "harbinger"
  | "remodel"
  | "mine"
  | "moneylender"
  | "throne"
  | "vassal"
  | "gain"
  | "moat"
  | "militia"
  | "bureaucrat"
  | "bandit"
  | "poacher"
  | "library"
  | "sentry"
  | "order"
  | "topdeck";
export interface DominionPrompt {
  kind: PromptKind;
  actor: number;
  title: string;
  cards: Card[];
  count?: number;
  limit?: number;
  destination?: "hand" | "discard";
  treasure?: boolean;
  optional?: boolean;
  kept?: Card[];
  attack?: CardId;
}
export interface DominionView {
  kingdom: CardId[];
  supply: Partial<Record<CardId, number>>;
  players: DominionPlayer[];
  trash: CardId[];
  inPlay: CardId[];
  turn: number;
  round: number;
  phase: "action" | "buy" | "finished";
  actions: number;
  buys: number;
  coins: number;
  merchants: number;
  silverPlayed: boolean;
  bought: boolean;
  queue: DominionTask[];
  prompt: DominionPrompt | null;
  events: { type: "gain" | "play"; actor: number; card: CardId }[];
  log: { sequence: number; actor: number; text: string }[];
  sequence: number;
  scores: number[];
  winners: number[];
}
export interface DominionState {
  kind: "dominion";
  view: DominionView;
}
