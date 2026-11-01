import { z } from "zod";
export const partyPreferencesSchema = z.object({
  autoEnable: z.boolean().default(false),
  quality: z.enum(["auto", "light", "high", "ultra", "text"]).default("auto"),
  fps: z
    .union([
      z.literal(0),
      z.literal(60),
      z.literal(120),
      z.literal(144),
      z.literal(165),
      z.literal(240),
    ])
    .default(0),
});
export type PartyPreferences = z.infer<typeof partyPreferencesSchema>;
export function partyBudget(
  quality: PartyPreferences["quality"],
  mobile: boolean,
) {
  const level = quality === "auto" ? (mobile ? "light" : "high") : quality;
  return level === "text"
    ? { objects: 0, resolution: 1 }
    : level === "light"
      ? { objects: 160, resolution: 1 }
      : level === "ultra"
        ? { objects: 8192, resolution: 2 }
        : { objects: 2048, resolution: 1.5 };
}
