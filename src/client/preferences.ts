import { partyPreferencesSchema } from "./party/policy";
import { updatePreferencesSchema } from "./updates/model";
import { bannerColorSchema } from "../domain/banner";
import { voicePreferencesSchema } from "../domain/voice";
import { defaultPhraseGroups, phraseGroupsSchema } from "../domain/phrases";
import { performanceSchema } from "../domain/performance";
import { avatarSchema } from "../domain/avatar";
import { z } from "zod";
import { themes } from "./themes";
import { gameKinds } from "../domain/catalogue";
import { capabilities, type RuntimePlatform } from "./platform";
import { poolRenderers } from "./pool/renderer";

export const preferencesSchema = z.object({
  party: partyPreferencesSchema.default(partyPreferencesSchema.parse({})),
  updates: updatePreferencesSchema.default(updatePreferencesSchema.parse({})),
  network: z
    .object({
      temporary: z.boolean().default(true),
      showLanDebug: z.boolean().default(false),
      proxyFallback: z.boolean().default(true),
      proxyUrl: z.string().default("http://127.0.0.1:7897"),
      service: z.string().default(""),
    })
    .default({
      temporary: true,
      service: "",
      showLanDebug: false,
      proxyFallback: true,
      proxyUrl: "http://127.0.0.1:7897",
    }),
  showQuickStart: z.boolean().default(true),
  showVoiceShortcut: z.boolean().default(true),
  computeDetails: z.boolean().default(false),
  showFps: z.boolean().default(false),
  quickStartOpen: z.boolean().default(true),
  voice: voicePreferencesSchema.default(voicePreferencesSchema.parse({})),
  gameSizes: z
    .record(z.string(), z.number().finite().min(0.5).max(3))
    .default({}),
  uiFontScale: z.number().finite().min(0.9).max(1.2).default(1),
  uiScale: z.number().finite().min(1).max(1.25).default(1),
  theme: z.string().default("system"),
  motion: z.boolean().default(true),
  enhancedGameMotion: z.boolean().default(false),
  lobbySwitchMotion: z.boolean().default(false),
  avatar: avatarSchema.default("😊"),
  phraseGroups: phraseGroupsSchema.default(defaultPhraseGroups),
  chatVisible: z.boolean().default(false),
  sidebarWidth: z.number().int().min(280).max(520).default(320),
  imageQuality: z.enum(["clear", "data"]).default("clear"),
  poolRenderer: z.enum(poolRenderers).default("auto"),
  bannerColor: bannerColorSchema.default("#ffce37"),
  bannerDisplay: z.boolean().default(true),
  soundVolume: z.number().min(0).max(1).default(0.5),
  poolSound: z.boolean().default(true),
  turnSound: z.boolean().default(false),
  messageSound: z.boolean().default(false),
  systemNotifications: z.boolean().default(false),
  achievementStage: z.boolean().default(false),
  shareAchievements: z.boolean().default(true),
  interactions: z.boolean().default(true),
  interactionSound: z.boolean().default(false),
  performance: performanceSchema.default({ mode: "auto", threads: 8 }),
  benchmarkVisible: z.boolean().default(false),
  auditVisible: z.boolean().default(false),
  beginnerGuides: z.partialRecord(z.enum(gameKinds), z.boolean()).default({}),
  bindings: z.record(z.string(), z.string()).default({}),
  favorites: z.array(z.string()).default([]),
  gameStats: z
    .record(
      z.string(),
      z.object({
        plays: z.number().int().min(0).default(0),
        lastPlayed: z.number().int().min(0).default(0),
      }),
    )
    .default({}),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences = preferencesSchema.parse({});
const iosMotionKey = "onlinebg.ios-motion-v2";
export function motionRuntime(): RuntimePlatform {
  if (
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).has("native-table")
  )
    return "ios";
  return capabilities.runtime;
}
export function enableIosMotionDefaults(
  preferences: Preferences,
  runtime: RuntimePlatform = motionRuntime(),
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
): Preferences {
  if (runtime !== "ios" || storage.getItem(iosMotionKey)) return preferences;
  preferences.motion = true;
  preferences.enhancedGameMotion = true;
  preferences.lobbySwitchMotion = true;
  storage.setItem(iosMotionKey, "1");
  storage.setItem("onlinebg.preferences", JSON.stringify(preferences));
  return preferences;
}
export function applyMotionOverride(
  preferences: Preferences,
  search: string = typeof location === "undefined" ? "" : location.search,
): Preferences {
  const value = new URLSearchParams(search).get("motion");
  if (value !== "enhanced" && value !== "basic") return preferences;
  preferences.enhancedGameMotion = value === "enhanced";
  try {
    localStorage.setItem("onlinebg.preferences", JSON.stringify(preferences));
  } catch {}
  return preferences;
}
export function loadPreferences(): Preferences {
  const saved = localStorage.getItem("onlinebg.preferences");
  if (!saved)
    return applyMotionOverride(
      enableIosMotionDefaults(preferencesSchema.parse({})),
    );
  try {
    const raw = JSON.parse(saved) as Record<string, unknown>,
      preferences = preferencesSchema.parse(raw);
    if (
      !Object.keys(preferences.gameStats).length &&
      Array.isArray(raw.recentGames)
    ) {
      const recentGames = raw.recentGames;
      recentGames.forEach((kind, index) => {
        if (typeof kind === "string")
          preferences.gameStats[kind] = {
            plays: Math.max(0, recentGames.length - index),
            lastPlayed: Date.now() - index,
          };
      });
    }
    if (
      preferences.theme !== "system" &&
      !themes.list().some((theme) => theme.id === preferences.theme)
    )
      preferences.theme = "system";
    return applyMotionOverride(enableIosMotionDefaults(preferences));
  } catch {
    return applyMotionOverride(
      enableIosMotionDefaults(preferencesSchema.parse({})),
    );
  }
}
