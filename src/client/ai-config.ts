import { z } from "zod";
import { invoke } from "@tauri-apps/api/core";
import { aiProviderSettingsSchema } from "../domain/companion";
import { capabilities } from "./platform";

export const aiConfigSchema = z.object({
  provider: aiProviderSettingsSchema,
  apiKey: z.string().max(500).default(""),
});
export type AiConfig = z.infer<typeof aiConfigSchema>;

const providerStorageKey = "onlinebg.ai-provider";
const legacyStorageKey = "onlinebg.ai-config";
let memoryApiKey = "";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export type AiConfigStore = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

function readJson(store: AiConfigStore | null, key: string): unknown {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function legacyAiConfig(store: AiConfigStore | null): AiConfig | null {
  const parsed = aiConfigSchema.safeParse(readJson(store, legacyStorageKey));
  return parsed.success ? parsed.data : null;
}

export function loadAiProvider(
  store: AiConfigStore | null = storage(),
): AiConfig["provider"] | null {
  const parsed = aiProviderSettingsSchema.safeParse(
    readJson(store, providerStorageKey),
  );
  if (parsed.success) return parsed.data;
  const legacy = legacyAiConfig(store);
  if (!legacy) return null;
  store?.setItem(providerStorageKey, JSON.stringify(legacy.provider));
  return legacy.provider;
}

export function saveAiProvider(
  provider: AiConfig["provider"],
  store: AiConfigStore | null = storage(),
): void {
  store?.setItem(
    providerStorageKey,
    JSON.stringify(aiProviderSettingsSchema.parse(provider)),
  );
  store?.removeItem(legacyStorageKey);
}

export async function migrateAiCredentials(
  store: AiConfigStore | null = storage(),
): Promise<void> {
  const legacy = legacyAiConfig(store);
  if (!legacy) return;
  saveAiProvider(legacy.provider, store);
  try {
    if (legacy.apiKey.trim()) await saveAiApiKey(legacy.apiKey);
  } finally {
    store?.removeItem(legacyStorageKey);
  }
}

export async function saveAiApiKey(key: string): Promise<void> {
  const value = key.trim();
  if (!value) return;
  if (capabilities.secureAiKey) await invoke("ai_key_save", { key: value });
  else memoryApiKey = value;
}

export async function loadAiApiKey(): Promise<string> {
  if (!capabilities.secureAiKey) return memoryApiKey;
  return invoke<string>("ai_key_get");
}

export async function hasAiApiKey(): Promise<boolean> {
  if (!capabilities.secureAiKey) return memoryApiKey !== "";
  const status = await invoke<{ hasKey: boolean }>("ai_key_status");
  return status.hasKey;
}

export async function clearAiApiKey(): Promise<void> {
  if (capabilities.secureAiKey) await invoke("ai_key_clear");
  else memoryApiKey = "";
}
