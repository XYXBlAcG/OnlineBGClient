import { z } from "zod";
import { aiProviderSettingsSchema } from "../domain/companion";

export const aiConfigSchema = z.object({
  provider: aiProviderSettingsSchema,
  apiKey: z.string().max(500).default(""),
});
export type AiConfig = z.infer<typeof aiConfigSchema>;

const storageKey = "onlinebg.ai-config";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export type AiConfigStore = Pick<Storage, "getItem" | "setItem">;

export function loadAiConfig(
  store: AiConfigStore | null = storage(),
): AiConfig | null {
  if (!store) return null;
  try {
    const raw = store.getItem(storageKey);
    if (!raw) return null;
    const parsed = aiConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveAiConfig(
  config: AiConfig,
  store: AiConfigStore | null = storage(),
): void {
  store?.setItem(storageKey, JSON.stringify(aiConfigSchema.parse(config)));
}

