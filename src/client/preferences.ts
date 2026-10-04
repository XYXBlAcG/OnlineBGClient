import { z } from "zod";
import { themes } from "./themes";

export const preferencesSchema = z.object({
  theme: z.string().default("system"),
  motion: z.boolean().default(true),
  chatVisible: z.boolean().default(true),
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
