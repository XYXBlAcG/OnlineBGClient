import { z } from "zod";

export const POOL_OPPONENT_LEAD_IN = 260;
export const POOL_PLAYBACK_RATE = 1.5;

export const poolModes = ["eight-ball", "nine-ball", "party"] as const;
export type PoolMode = (typeof poolModes)[number];

export const poolOptionsSchema = z.object({
  mode: z.enum(poolModes).default("eight-ball"),
  shotSeconds: z
    .union([z.literal(0), z.literal(45), z.literal(60), z.literal(90)])
    .default(60),
  assist: z.boolean().default(true),
});
export type PoolOptions = z.infer<typeof poolOptionsSchema>;

export const poolRotationSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  w: z.number(),
});
export type PoolRotation = z.infer<typeof poolRotationSchema>;

export const poolBallSchema = z.object({
  id: z.number().int().min(0).max(15),
  x: z.number(),
  y: z.number(),
  z: z.number().nonnegative().optional(),
  pocketed: z.boolean().default(false),
  rotation: poolRotationSchema.optional(),
});
export type PoolBall = z.infer<typeof poolBallSchema>;

export const poolShotInputSchema = z.object({
  aim: z
    .number()
    .min(-Math.PI * 2)
    .max(Math.PI * 2),
  power: z.number().min(0).max(1),
  spin: z
    .object({
      x: z.number().min(-1).max(1),
      y: z.number().min(-1).max(1),
    })
    .default({ x: 0, y: 0 }),
  elevation: z.number().min(0).max(1).optional(),
  cue: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type PoolShotInput = z.infer<typeof poolShotInputSchema>;

export const poolShotActionSchema = z.object({
  type: z.literal("pool-shot"),
  ...poolShotInputSchema.shape,
});
export type PoolShotAction = z.infer<typeof poolShotActionSchema>;
export type PoolAction = PoolShotAction;

export const poolImpactSchema = z.object({
  t: z.number().nonnegative(),
  kind: z.enum(["ball", "rail"]),
  intensity: z.number().min(0).max(1),
});
export type PoolImpact = z.infer<typeof poolImpactSchema>;

export const poolFrameSchema = z.object({
  t: z.number().nonnegative(),
  balls: z
    .array(
      z.object({
        id: z.number().int().min(0).max(15),
        x: z.number(),
        y: z.number(),
        z: z.number().nonnegative().optional(),
        rotation: poolRotationSchema.optional(),
      }),
    )
    .max(16),
});
export type PoolFrame = z.infer<typeof poolFrameSchema>;

export const poolShotSchema = z.object({
  actor: z.number().int().min(0).max(7),
  aim: z.number(),
  power: z.number(),
  spin: z.object({ x: z.number(), y: z.number() }),
  elevation: z.number().min(0).max(1).optional(),
  cueBefore: z.object({ x: z.number(), y: z.number() }),
  frames: z.array(poolFrameSchema).max(2000),
  impacts: z.array(poolImpactSchema).max(400).default([]),
  pocketed: z.array(
    z.object({
      id: z.number().int().min(0).max(15),
      t: z.number().nonnegative(),
    }),
  ),
  firstHit: z.number().int().min(0).max(15).nullable(),
  railAfterContact: z.boolean(),
  cuePocketed: z.boolean(),
  finalBalls: z.array(poolBallSchema).max(16),
});
export type PoolShot = z.infer<typeof poolShotSchema>;

export const poolPhaseSchema = z.enum([
  "break",
  "aim",
  "shooting",
  "ball-in-hand",
  "finished",
]);
export type PoolPhase = z.infer<typeof poolPhaseSchema>;

export interface PoolView {
  mode: PoolMode;
  options: PoolOptions;
  balls: PoolBall[];
  players: number;
  party?: {
    owners: number[][];
    specials: { id: number; kind: "bolt" | "gold" }[];
  };
  turn: number;
  groups: [number | null, number | null];
  openTable: boolean;
  phase: PoolPhase;
  ballInHand: boolean;
  lastShot: PoolShot | null;
  winner: number | null;
  foul: string | null;
  message: string;
  shotNumber: number;
}

export interface PoolState {
  kind: "pool";
  view: PoolView;
}
