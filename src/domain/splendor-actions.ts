import { z } from "zod";
const cardId = z.number().int().min(0).max(89);
const position = z.number().int().min(0).max(3);
const gems = z.array(z.number().int().min(0).max(10)).length(6);
export const splendorMoveSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("take"),
    selected: z.array(z.number().int().min(0).max(4)).min(1).max(3),
  }),
  z.object({ kind: z.literal("book"), cardId, pos: position }),
  z.object({ kind: z.literal("deck"), level: z.number().int().min(0).max(2) }),
  z.object({
    kind: z.literal("buy"),
    cardId,
    pos: position,
    booked: z.boolean(),
    payment: z.object({
      spend: z.array(z.number().int().min(0).max(7)).length(5),
      gold: z.number().int().min(0).max(5),
    }),
  }),
  z.object({ kind: z.literal("throw"), gemDelta: gems }),
  z.object({
    kind: z.literal("noble"),
    noblePos: z.number().int().min(0).max(4),
  }),
  z.object({ kind: z.literal("pass") }),
]);
export type SplendorMove = z.infer<typeof splendorMoveSchema>;
export interface SplendorView {
  waitFor: number;
  waitThrowing: boolean;
  waitNoble: boolean;
  bankGem: number[];
  bankCard: number[][];
  bankNoble: number[];
  playerGem: number[][];
  playerCard: number[][];
  playerBooked: number[][];
  playerNoble: number[][];
  publicBooked: number[][];
  lastOp: {
    type: number;
    playerId: number;
    card: number;
    cardPos: number;
    noble: number[];
    noblePos: number[];
    gemDelta: number[];
  };
  initial: { bankCard: number[][]; bankNoble: number[] } | null;
  recordList: unknown[];
  enableCt: number;
  costs: number[];
  pt: number;
  ptOwner: number | null;
  bankLeftCard: number[][];
  bankLeftCardCount: number[];
  playerScore: number[];
  playerCardCount: number[][];
  nobleCandidates: number[];
  winner: number[];
  lastTurn: boolean;
}
