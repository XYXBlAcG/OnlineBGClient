import { partyScenes, partyGlyphs } from "../party/stage";
import { z } from "zod";
import {
  partyItems,
  partyPatterns,
  type PartyItemId,
} from "../party/catalogue";
const slug = z.string().regex(/^[a-z][a-z0-9.-]{2,63}$/);
const triggerIds = Object.entries(partyItems)
  .filter(([, item]) => item.category === "装扮")
  .map(([id]) => id) as [PartyItemId, ...PartyItemId[]];
export const workshopVisualSchema = z
  .object({
    scope: z.enum(["target", "room", "self"]).default("target"),
    scene: z.enum(partyScenes).optional(),
    particle: z.enum(partyGlyphs).optional(),
    name: z.string().trim().min(1).max(32),
    emoji: z.string().min(1).max(16),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    duration: z.number().int().min(1000).max(30000),
    pattern: z.enum(partyPatterns),
    density: z.number().min(0.5).max(3).default(1),
    scale: z.number().min(0.5).max(3).default(1),
    speed: z.number().min(0.25).max(3).default(1),
  })
  .strict();
export const workshopEffectSchema = workshopVisualSchema
  .extend({
    id: slug,
    description: z.string().max(160),
    price: z.number().int().min(1).max(200),
    tier: z.number().int().min(0).max(4).default(0),
    scope: z.enum(["target", "room", "self"]).default("target"),
    trigger: z
      .union([z.literal("manual"), z.enum(triggerIds)])
      .default("manual"),
    caption: z.string().max(80),
  })
  .strict();
export const workshopPackSchema = z
  .object({
    format: z.literal(1),
    sdk: z.literal(1),
    id: slug,
    version: z
      .string()
      .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
      .max(32),
    name: z.string().min(1).max(40),
    author: z.string().min(1).max(60),
    description: z.string().max(240),
    license: z.string().min(1).max(80),
    effects: z.array(workshopEffectSchema).min(1).max(12),
  })
  .strict()
  .refine(
    (p) => new Set(p.effects.map((e) => e.id)).size === p.effects.length,
    "插件内的特效 ID 不可重复",
  );
export type WorkshopVisual = z.infer<typeof workshopVisualSchema>;
export type WorkshopEffect = z.infer<typeof workshopEffectSchema>;
export type WorkshopPack = z.infer<typeof workshopPackSchema>;
export const roomPluginsSchema = z
  .array(workshopPackSchema)
  .max(8)
  .refine(
    (p) => new Set(p.map((e) => e.id)).size === p.length,
    "插件 ID 不可重复",
  )
  .refine(
    (p) => new TextEncoder().encode(JSON.stringify(p)).length <= 65536,
    "房间插件配方总量超过限制",
  );
export interface WorkshopInstallation {
  pack: WorkshopPack;
  enabled: boolean;
  installedAt: number;
}
export function workshopVersionCompare(a: string, b: string): number {
  const left = a.split(".").map(Number),
    right = b.split(".").map(Number);
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}
