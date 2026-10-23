import { z } from "zod";
import { balance, battlefields } from "./balance";
export const graphwarModes = {
  classic: { name: "经典函数战", radius: 1.3 },
  demolition: { name: "爆破开路", radius: 3.2 },
  sniper: { name: "精准狙击", radius: 0.6 },
} as const;
export const graphwarMaps = {
  islands: "浮岛",
  fortress: "堡垒",
  open: "开阔战场",
} as const;
export const graphwarOptionsSchema = z.object({
  mode: z.enum(["classic", "demolition", "sniper"]).default("classic"),
  map: z.enum(["islands", "fortress", "open"]).default("islands"),
  size: z.enum(["standard", "large"]).default("standard"),
  soldiers: z.number().int().min(1).max(balance.maxSoldiers).default(3),
  preview: z.boolean().default(true),
  turnSeconds: z
    .union([z.literal(0), z.literal(45), z.literal(60), z.literal(90)])
    .default(60),
});
export type GraphwarOptions = z.infer<typeof graphwarOptionsSchema>;
export interface Point {
  x: number;
  y: number;
}
export interface Circle extends Point {
  radius: number;
  permanent?: boolean;
}
export interface Soldier extends Point {
  id: number;
  player: number;
  hp: number;
  guardUntil: number;
}
const largest = battlefields.large;
export const graphwarPointSchema = z.object({
  x: z
    .number()
    .min(-largest.width / 2)
    .max(largest.width / 2),
  y: z
    .number()
    .min(-largest.height / 2)
    .max(largest.height / 2),
});
const unitId = z
  .number()
  .int()
  .min(0)
  .max(balance.maxPlayers * balance.maxSoldiers - 1);
const impactSchema = z.object({
  soldier: unitId,
  point: graphwarPointSchema,
  length: z.number().nonnegative(),
  distance: z.number().nonnegative(),
  penetration: z.number().int().min(0).max(balance.maxPenetrations),
  damage: z.number().int().min(0).max(balance.baseDamage),
  hpAfter: z.number().int().min(0).max(balance.hp),
  guarded: z.boolean(),
  openingProtected: z.boolean(),
  kind: z.enum(["direct", "blast"]),
});
export type Impact = z.infer<typeof impactSchema>;
export const graphwarShotSchema = z.object({
  actor: z
    .number()
    .int()
    .min(0)
    .max(balance.maxPlayers - 1),
  soldier: unitId,
  formula: z.string().min(1).max(256),
  points: z.array(graphwarPointSchema).min(1).max(balance.maxSteps),
  impacts: z
    .array(impactSchema)
    .max(balance.maxPlayers * balance.maxSoldiers)
    .refine(
      (items) => new Set(items.map((h) => h.soldier)).size === items.length,
    ),
  length: z.number().nonnegative(),
  crater: graphwarPointSchema
    .extend({ radius: z.number().positive().max(4) })
    .nullable(),
  reason: z.enum(["terrain", "boundary", "undefined", "limit", "penetration"]),
});
export type Shot = z.infer<typeof graphwarShotSchema>;
export interface GraphwarView {
  solver: 2;
  options: GraphwarOptions;
  sequence: number;
  turn: number;
  currentSoldier: number;
  teams: number[];
  cursors: number[];
  playerTurns: number[];
  soldiers: Soldier[];
  terrain: Circle[];
  craters: Circle[];
  lastShot: Shot | null;
  lastPass: number | null;
  lastAction: "fire" | "move" | "guard" | "pass" | null;
  winner: number | null;
  finished: boolean;
}
export interface GraphwarState {
  kind: "graphwar";
  view: GraphwarView;
}
export const graphwarFireSchema = z.object({
  type: z.literal("graphwar-fire"),
  soldier: unitId.optional(),
  formula: z.string().trim().min(1).max(256),
});
export const graphwarPassSchema = z.object({
  type: z.literal("graphwar-pass"),
});
export const graphwarGuardSchema = z.object({
  type: z.literal("graphwar-guard"),
  soldier: unitId.optional(),
});
export const graphwarMoveSchema = graphwarPointSchema.extend({
  type: z.literal("graphwar-move"),
  soldier: unitId.optional(),
});
export const battlefield = (view: Pick<GraphwarView, "options">) =>
  battlefields[view.options.size];
export const actionLimit = (view: Pick<GraphwarView, "soldiers">) =>
  Math.min(
    balance.maxActions,
    Math.max(
      balance.minActions,
      view.soldiers.length * balance.actionsPerSoldier,
    ),
  );
export const guarded = (
  view: Pick<GraphwarView, "playerTurns">,
  soldier: Soldier,
): boolean =>
  soldier.guardUntil > 0 &&
  soldier.guardUntil >= view.playerTurns[soldier.player];

export function firingView(
  view: GraphwarView,
  actor: number,
  soldier = view.currentSoldier,
): GraphwarView {
  const unit = view.soldiers.find(
    (s) => s.id === soldier && s.player === actor && s.hp > 0,
  );
  if (!unit) throw new Error("请选择自己的存活士兵");
  return soldier === view.currentSoldier
    ? view
    : { ...view, currentSoldier: soldier };
}
export const openingProtected = (view: Pick<GraphwarView, "playerTurns">) =>
  view.playerTurns.some((n) => n === 0);
export const graphwarInitialSchema = z.object({
  teams: z.array(z.number().int().min(0).max(1)).min(2).max(balance.maxPlayers),
  terrain: z
    .array(
      graphwarPointSchema.extend({
        radius: z.number().positive().max(15),
        permanent: z.boolean().optional(),
      }),
    )
    .max(200),
  soldiers: z
    .array(
      graphwarPointSchema.extend({
        id: unitId,
        player: z
          .number()
          .int()
          .min(0)
          .max(balance.maxPlayers - 1),
        hp: z.number().int().min(balance.hp).max(balance.hp),
        guardUntil: z.number().int().min(0).max(0),
      }),
    )
    .min(2)
    .max(balance.maxPlayers * balance.maxSoldiers),
});
export type GraphwarInitial = z.infer<typeof graphwarInitialSchema>;
