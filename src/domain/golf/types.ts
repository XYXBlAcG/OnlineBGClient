import { z } from "zod";

export const golfDifficulties = ["standard", "challenge"] as const;
export type GolfDifficulty = (typeof golfDifficulties)[number];

export const golfHoleCount = 5;

export const golfPuttSchema = z.object({
  type: z.literal("golf-putt"),
  hole: z.number().int().min(0).max(golfHoleCount - 1),
  previousStrokes: z.number().int().nonnegative(),
  aim: z.number().min(-Math.PI).max(Math.PI),
  power: z.number().min(0.035).max(1),
});
export const golfNextSchema = z.object({
  type: z.literal("golf-next"),
  hole: golfPuttSchema.shape.hole,
});

export type GolfPutt = z.infer<typeof golfPuttSchema>;
const golfPointSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
const golfRectSchema = golfPointSchema.extend({
  width: z.number().positive(),
  height: z.number().positive(),
});
const golfHillSchema = golfPointSchema.extend({
  radiusX: z.number().min(1.5).max(18),
  radiusY: z.number().min(1.5).max(18),
  elevation: z.number().min(-1.25).max(1.25),
});
export const golfCourseSchema = z.object({
  name: z.string().min(1).max(48),
  par: z.number().int().positive(),
  width: z.number().positive().max(64),
  height: z.number().positive().max(24),
  tee: golfPointSchema,
  cup: golfPointSchema,
  banks: z.array(golfRectSchema).max(32),
  sand: z.array(golfRectSchema).max(32),
  water: z.array(golfRectSchema).max(32),
  line: z.array(golfPointSchema).min(1).max(24),
  branches: z.array(z.array(golfPointSchema).min(2).max(24)).max(2).optional(),
  terrain: z.array(golfHillSchema).min(1).max(14).optional(),
});
export type GolfPoint = z.infer<typeof golfPointSchema>;
export type GolfRect = z.infer<typeof golfRectSchema>;
export type GolfCourse = z.infer<typeof golfCourseSchema>;
export interface GolfShot {
  frames: GolfPoint[];
  position: GolfPoint;
  sunk: boolean;
  water: boolean;
}
export interface GolfPlayer {
  position: GolfPoint;
  strokes: number;
  scores: number[];
  sunk: boolean;
  lastShot: GolfShot | null;
}
export interface GolfState {
  kind: "golf";
  view: {
    hole: number;
    holes: number;
    courses: GolfCourse[];
    players: GolfPlayer[];
    strokeCap: number | null;
    phase: "putting" | "scorecard" | "finished";
  };
}
