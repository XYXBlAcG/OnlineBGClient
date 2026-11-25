import { aiProviderScope } from "../domain/ai-provider";
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
const legacyScopeKey = "onlinebg.ai-legacy-key-scope";
const memoryApiKeys = new Map<string, string>();

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export type AiConfigStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

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
}

export async function migrateAiCredentials(
  store: AiConfigStore | null = storage(),
): Promise<void> {
  const legacy = legacyAiConfig(store);
  if (legacy) {
    if (legacy.apiKey.trim()) {
      await saveAiApiKey(legacy.apiKey, legacy.provider);
      if ((await loadAiApiKey(legacy.provider)) !== legacy.apiKey.trim())
        throw new Error("AI 凭据保存验证失败，原配置已保留");
    }
    saveAiProvider(legacy.provider, store);
    store?.removeItem(legacyStorageKey);
  }
  const provider = loadAiProvider(store);
  if (provider && store && capabilities.secureAiKey) {
    const scope = store.getItem(legacyScopeKey) ?? aiProviderScope(provider);
    store.setItem(legacyScopeKey, scope);
    await invoke("ai_key_migrate", { scope });
  }
}

export async function saveAiApiKey(
  key: string,
  provider: AiConfig["provider"],
): Promise<void> {
  const value = key.trim();
  if (!value) return;
  const scope = aiProviderScope(provider);
  if (capabilities.secureAiKey)
    await invoke("ai_key_save", { key: value, scope });
  else memoryApiKeys.set(scope, value);
}

export async function loadAiApiKey(
  provider: AiConfig["provider"] | null = loadAiProvider(),
): Promise<string> {
  if (!provider) return "";
  const scope = aiProviderScope(provider);
  if (!capabilities.secureAiKey) return memoryApiKeys.get(scope) ?? "";
  return invoke<string>("ai_key_get", { scope });
}

export async function hasAiApiKey(
  provider: AiConfig["provider"] | null = loadAiProvider(),
): Promise<boolean> {
  if (!provider) return false;
  const scope = aiProviderScope(provider);
  if (!capabilities.secureAiKey) return memoryApiKeys.has(scope);
  return (await invoke<{ hasKey: boolean }>("ai_key_status", { scope })).hasKey;
}

export async function clearAiApiKey(
  provider: AiConfig["provider"],
): Promise<void> {
  const scope = aiProviderScope(provider);
  if (capabilities.secureAiKey)
    await invoke("ai_key_clear", {
      scope,
      clearLegacy: storage()?.getItem(legacyScopeKey) === scope,
    });
  else memoryApiKeys.delete(scope);
}
