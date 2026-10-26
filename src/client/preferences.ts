import { voicePreferencesSchema } from "../domain/voice";
import { defaultPhraseGroups, phraseGroupsSchema } from "../domain/phrases";
import { performanceSchema } from "../domain/performance";
import { avatarSchema } from "../domain/avatar";
import { z } from "zod";
import { themes } from "./themes";
import { gameKinds } from "../domain/catalogue";

export const preferencesSchema = z.object({
  quickStartOpen: z.boolean().default(true),
  voice: voicePreferencesSchema.default(voicePreferencesSchema.parse({})),
  theme: z.string().default("system"),
  motion: z.boolean().default(true),
  enhancedGameMotion: z.boolean().default(false),
  avatar: avatarSchema.default("😊"),
  phraseGroups: phraseGroupsSchema.default(defaultPhraseGroups),
  chatVisible: z.boolean().default(false),
  sidebarWidth: z.number().int().min(280).max(520).default(320),
  imageQuality: z.enum(["clear", "data"]).default("clear"),
  bannerDisplay: z.boolean().default(true),
  soundVolume: z.number().min(0).max(1).default(0.5),
  turnSound: z.boolean().default(false),
  messageSound: z.boolean().default(false),
  systemNotifications: z.boolean().default(false),
  interactions: z.boolean().default(true),
  interactionSound: z.boolean().default(false),
  performance: performanceSchema.default({ mode: "auto", threads: 8 }),
  benchmarkVisible: z.boolean().default(false),
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
