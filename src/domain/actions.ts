import { splendorMoveSchema } from "./splendor-actions";
import { catanMoveSchema } from "./catan-actions";
import { z } from "zod";
const ids = z.array(z.number().int().min(-160).max(160)).max(160);
export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ccbs-action"), move: splendorMoveSchema }),
  z.object({ type: z.literal("ktd-action"), move: catanMoveSchema }),
  z.object({
    type: z.literal("dy-play"),
    card: z.number().int().min(0).max(49),
    pot: z.number().int().min(0).max(2),
  }),
  z.object({ type: z.literal("ddz-claim") }),
  z.object({ type: z.literal("ddz-pass") }),
  z.object({
    type: z.literal("ddz-play"),
    cards: z.array(z.number().int().min(1).max(54)).min(1).max(20),
  }),
  z.object({
    type: z.literal("tq-move"),
    route: z.array(z.number().int().min(0).max(120)).min(2).max(121),
  }),
  z.object({ type: z.literal("fxq-roll") }),
  z.object({
    type: z.literal("fxq-move"),
    plane: z.number().int().min(0).max(15),
  }),
  z.object({ type: z.literal("uno-start") }),
  z.object({ type: z.literal("uno-draw") }),
  z.object({ type: z.literal("uno-report") }),
  z.object({
    type: z.literal("uno-play"),
    card: z.number().int().min(0).max(107),
    color: z.number().int().min(0).max(3),
    jump: z.boolean(),
    saidUno: z.boolean(),
  }),
  z.object({
    type: z.literal("sgs-hero"),
    hero: z.number().int().min(1).max(23),
  }),
  z.object({
    type: z.literal("sgs-choice"),
    cards: ids,
    targets: z.array(z.number().int().min(0).max(7)).max(8),
    button: z.number().int().min(0).max(4),
    option: z.number().int().min(0).max(3),
    skill: z.number().int().min(-1).max(59),
  }),
]);
export type Action = z.infer<typeof actionSchema>;
