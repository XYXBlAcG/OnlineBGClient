import { z } from "zod";
import type { DrawingHistory, DrawingHistoryStatus } from "./canvas-history";

export const drawModes = ["classic", "fayu"] as const;
export type DrawMode = (typeof drawModes)[number];
export const drawWidth = 1000;
export const drawHeight = 625;
export const drawBatchSize = 64;
export const drawLayerLimit = 5;
export const drawFillLimit = 4;
export const drawStrokeLimit = 180;
export const drawPointLimit = 6000;
export const drawRoundMs = 75_000;
export const drawRevealMs = 8500;
export const drawInks = [
  "ink",
  "blue",
  "red",
  "green",
  "gold",
  "erase",
] as const;
export type DrawInk = (typeof drawInks)[number];

const round = z.number().int().min(0).max(999);
const id = z.string().min(1).max(36);
export const drawPointSchema = z.tuple([
  z.number().int().min(0).max(drawWidth),
  z.number().int().min(0).max(drawHeight),
]);
export type DrawPoint = z.infer<typeof drawPointSchema>;
export const drawStrokeSchema = z.object({
  type: z.literal("draw-stroke"),
  round,
  id,
  part: z.number().int().min(0).max(drawPointLimit),
  ink: z.enum(drawInks),
  points: z.array(drawPointSchema).min(1).max(drawBatchSize),
  tool: z.enum(["brush", "eraser", "line", "rect", "ellipse", "text", "sticker", "select", "fill"]).optional(),
  layer: z.number().int().min(0).max(drawLayerLimit - 1).optional(),
  text: z.string().trim().min(1).max(40).optional(),
  color: z.string().max(20).optional(),
  width: z.number().min(1).max(48).optional(),
  opacity: z.number().min(0.1).max(1).optional(),
});
export const drawUndoSchema = z.object({
  type: z.literal("draw-undo"),
  round,
  id,
});
export const drawHistorySchema = z.object({ type: z.literal("draw-history"), round, direction: z.enum(["undo", "redo"]) });
export const drawGuessSchema = z.object({
  type: z.literal("draw-guess"),
  round,
  text: z.string().trim().min(1).max(40),
});
export const drawNextSchema = z.object({ type: z.literal("draw-next"), round });

export const drawOrderSchema = z.number().int().min(1).max(1_000_000).optional();

export interface DrawStroke {
  id: string;
  ink: DrawInk;
  nextPart: number;
  order?: number;
  points: DrawPoint[];
  tool?: "brush" | "eraser" | "line" | "rect" | "ellipse" | "text" | "sticker" | "select" | "fill";
  layer?: number;
  text?: string;
  color?: string;
  width?: number;
  opacity?: number;
}

export interface DrawFill {
  order?: number;
  id: string;
  layer: number;
  data: string;
}

export interface DrawView {
  phase: "drawing" | "reveal" | "finished";
  artist: number;
  players: number;
  round: number;
  strokes: DrawStroke[];
  fills?: DrawFill[];
  pointsUsed: number;
  history?: DrawingHistoryStatus;
  scores: number[];
  solved: number[];
  guesses: Record<number, { attempts: number; correct: boolean }>;
  hint: string;
  prompt?: string;
}

export interface DrawState {
  kind: "drawguess";
  mode: "classic";
  view: DrawView;
  drawingHistory?: DrawingHistory;
  words?: number[];
  bank?: import("./words").DrawWord[];
}
