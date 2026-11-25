import { z } from "zod";
import type { DrawingHistory, DrawingHistoryStatus } from "../drawguess/canvas-history";
import { drawFillLimit, drawLayerLimit, drawPointLimit, drawPointSchema, drawOrderSchema, drawStrokeLimit, drawStrokeSchema } from "../drawguess/types";
import type { DrawFill, DrawStroke } from "../drawguess/types";

export const fayuPromptSchema = z.object({
  type: z.literal("draw-prompt"),
  round: z.number().int().min(0).max(999),
  templateId: z.string().trim().min(1).max(12),
  words: z.array(z.string().trim().min(1).max(20)).min(1).max(8),
});

export const fayuGuessSchema = z.object({
  type: z.literal("draw-cloze"),
  round: z.number().int().min(0).max(999),
  drawing: z.number().int().min(0).max(7),
  templateId: z.string().trim().min(1).max(12),
  words: z.array(z.string().trim().min(1).max(20)).min(1).max(8),
});

export const fayuClearSchema = z.object({
  type: z.literal("draw-clear"),
  round: z.number().int().min(0).max(999),
  layer: z.number().int().min(0).max(drawLayerLimit - 1).optional(),
});

export const fayuFinishSchema = z.object({
  type: z.literal("draw-finish"),
  round: z.number().int().min(0).max(999),
});

export const fayuVoteSchema = z.object({
  type: z.literal("draw-vote"),
  round: z.number().int().min(0).max(999),
  drawing: z.number().int().min(0).max(7),
});

export const fayuRestoreSchema = z.object({
  type: z.literal("draw-restore"),
  round: z.number().int().min(0).max(999),
  strokes: z.array(
    drawStrokeSchema.omit({ type: true, round: true, part: true }).extend({
      points: z.array(drawPointSchema).min(1).max(drawPointLimit),
      order: drawOrderSchema,
    }),
  ).max(drawStrokeLimit),
  fills: z.array(
    z.object({
      id: z.string().min(1).max(36),
      layer: z.number().int().min(0).max(drawLayerLimit - 1),
      data: z.string().min(20).max(90000).startsWith("data:image/png;base64,"),
      order: drawOrderSchema,
    }),
  ).max(drawFillLimit),
});

export const fayuFillSchema = z.object({
  type: z.literal("draw-fill"),
  round: z.number().int().min(0).max(999),
  layer: z.number().int().min(0).max(drawLayerLimit - 1),
  data: z.string().min(20).max(90000),
});

export const fayuTransformSchema = z.object({
  type: z.literal("draw-transform"),
  round: z.number().int().min(0).max(999),
  ids: z.array(z.string().min(1).max(36)).min(1).max(drawStrokeLimit),
  dx: z.number().int().min(-1000).max(1000),
  dy: z.number().int().min(-1000).max(1000),
});

export const fayuDeleteSchema = z.object({
  type: z.literal("draw-delete"),
  round: z.number().int().min(0).max(999),
  ids: z.array(z.string().min(1).max(36)).min(1).max(drawStrokeLimit),
});

export const fayuNextSchema = z.object({
  type: z.literal("draw-round"),
  round: z.number().int().min(0).max(999),
});

export const fayuEndSchema = z.object({
  type: z.literal("draw-end"),
  round: z.number().int().min(0).max(999),
});

export type FayuPromptAction = z.infer<typeof fayuPromptSchema>;
export type FayuGuessAction = z.infer<typeof fayuGuessSchema>;
export type FayuNextAction = z.infer<typeof fayuNextSchema>;
export type FayuEndAction = z.infer<typeof fayuEndSchema>;

export type FayuPhase = "prompting" | "drawing" | "guessing" | "results" | "finished";

export interface FayuSentence {
  templateId: string;
  words: string[];
  text: string;
}

export interface FayuChallenge {
  drawing: number;
  templateChoices: string[];
  wordBank: string[];
}

export type FayuFill = DrawFill;

export interface FayuGuess {
  attempts: number;
  correct: boolean;
  templateId: string;
  words: string[];
}

export interface FayuView {
  phase: FayuPhase;
  round: number;
  players: number;
  host: number;
  scores: number[];
  submitted: number[];
  prompts: (FayuSentence | null)[];
  canvases: DrawStroke[][];
  fills: Record<number, FayuFill[]>;
  finished: number[];
  history?: DrawingHistoryStatus;
  challenges: Record<number, FayuChallenge>;
  guesses: Record<number, Record<number, FayuGuess>>;
  votes: Record<number, number>;
}

export interface FayuState {
  kind: "drawguess";
  mode: "fayu";
  drawingHistory?: Record<number, DrawingHistory>;
  view: FayuView;
}

export const fayuLimits = {
  promptMs: 30_000,
  drawingMs: 150_000,
  guessingMs: 90_000,
  maxAttempts: 3,
  maxStrokes: 80,
  maxPoints: 1500,
  maxFills: 2,
  maxPromptLength: 60,
} as const;

export function fayuDuelGuessingComplete(view: FayuView) {
  if (view.phase !== "guessing" || view.players !== 2) return false;
  return [0, 1].every((seat) => {
    const guess = view.guesses[seat]?.[1 - seat];
    return !!guess && (guess.correct || guess.attempts >= fayuLimits.maxAttempts);
  });
}
