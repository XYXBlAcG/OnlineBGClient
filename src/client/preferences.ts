import { defaultPhraseGroups, phraseGroupsSchema } from "../domain/phrases";
import { performanceSchema } from "../domain/performance";
import { z } from "zod";
import { themes } from "./themes";
import { gameKinds } from "../domain/catalogue";

export const preferencesSchema = z.object({
  theme: z.string().default("system"),
  motion: z.boolean().default(true),
  surfaceSizes: z
    .record(
      z.string(),
      z.object({
        width: z.number().min(80).max(10000).optional(),
        height: z.number().min(80).max(10000).optional(),
      }),
    )
    .default({}),
  chatWidth: z.number().int().min(260).max(520).default(280),
  phraseGroups: phraseGroupsSchema.default(defaultPhraseGroups),
  chatVisible: z.boolean().default(true),
  messageSound: z.boolean().default(false),
  systemNotifications: z.boolean().default(false),
  interactions: z.boolean().default(true),
  interactionSound: z.boolean().default(false),
  performance: performanceSchema.default({ mode: "auto", threads: 8 }),
  auditVisible: z.boolean().default(false),
  beginnerGuides: z.partialRecord(z.enum(gameKinds), z.boolean()).default({}),
  bindings: z.record(z.string(), z.string()).default({}),
  favorites: z.array(z.string()).default([]),
  recentGames: z.array(z.string()).default([]),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences = preferencesSchema.parse({});
export function loadPreferences(): Preferences {
  const saved = localStorage.getItem("onlinebg.preferences");
  if (!saved) return preferencesSchema.parse({});
  try {
    const preferences = preferencesSchema.parse(JSON.parse(saved));
    if (
      preferences.theme !== "system" &&
      !themes.list().some((theme) => theme.id === preferences.theme)
    )
      preferences.theme = "system";
    return preferences;
  } catch {
    return preferencesSchema.parse({});
  }
}
