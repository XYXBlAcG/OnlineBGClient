import { z } from "zod";
export const mahjongOptionsSchema = z.object({
  cap: z.union([z.literal(3), z.literal(4), z.literal(5)]).default(3),
  selfDraw: z.enum(["base", "fan"]).default("base"),
});
export type MahjongOptions = z.infer<typeof mahjongOptionsSchema>;
const tile = z.number().int().min(0).max(107);
export const mahjongMoveSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("exchange"), tiles: z.array(tile).length(3) }),
  z.object({ type: z.literal("lack"), suit: z.number().int().min(0).max(2) }),
  z.object({ type: z.literal("discard"), tile }),
  z.object({
    type: z.literal("respond"),
    choice: z.enum(["pass", "pong", "kong", "win"]),
  }),
  z.object({ type: z.literal("kong"), tile }),
  z.object({ type: z.literal("win") }),
]);
export type MahjongMove = z.infer<typeof mahjongMoveSchema>;
export interface MahjongMeld {
  type: "pong" | "open" | "closed" | "added";
  tiles: number[];
  from: number;
}
export interface MahjongScore {
  fan: number;
  labels: string[];
  value: number;
}
export interface MahjongWin extends MahjongScore {
  player: number;
  from: number;
  tile: number;
}
export interface MahjongPayment {
  from: number;
  to: number;
  amount: number;
  reason: string;
  kind: "win" | "kong" | "penalty" | "refund";
  ref?: number;
}
export interface MahjongEvent {
  type: "draw" | "discard" | "exchange" | "pong" | "kong" | "win";
  actor: number;
  tiles: number[];
  from?: number;
}
export interface MahjongView {
  sequence: number;
  options: MahjongOptions;
  phase: "exchange" | "lack" | "play" | "response" | "finished";
  dealer: number;
  turn: number;
  direction: number;
  hands: number[][];
  wall: number[];
  melds: MahjongMeld[][];
  rivers: number[][];
  lacks: number[];
  exchange: (number[] | null)[];
  exchangeReady: boolean[];
  lackReady: boolean[];
  responses: ("pass" | "pong" | "kong" | "win" | null)[];
  passedFan: number[];
  pending: {
    actor: number;
    tile: number;
    rob: boolean;
    afterKong: boolean;
  } | null;
  wins: MahjongWin[];
  scores: number[];
  payments: MahjongPayment[];
  events: MahjongEvent[];
  lastDraw: { actor: number; tile: number; kong: boolean } | null;
  finishedReason: string;
}
export type MahjongState = { kind: "scmj"; view: MahjongView };
export const tileType = (tile: number) => Math.floor(tile / 4);
export const tileSuit = (tile: number) => Math.floor(tile / 36);
export const suitNames = ["万", "筒", "条"];
export const tileName = (tile: number) =>
  tile < 0
    ? "牌背"
    : `${["一", "二", "三", "四", "五", "六", "七", "八", "九"][tileType(tile) % 9]}${suitNames[tileSuit(tile)]}`;
export function tileCounts(tiles: number[]): number[] {
  const counts = Array<number>(27).fill(0);
  for (const tile of tiles) if (tile >= 0) counts[tileType(tile)]++;
  return counts;
}
