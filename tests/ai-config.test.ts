import { describe, expect, it } from "vitest";
import {
  hasAiApiKey,
  loadAiApiKey,
  loadAiProvider,
  migrateAiCredentials,
  saveAiApiKey,
  saveAiProvider,
  type AiConfigStore,
} from "../src/client/ai-config";
import type { AiProviderSettings } from "../src/domain/companion";

const provider: AiProviderSettings = {
  format: "openai",
  baseUrl: "https://ai.test/v1",
  model: "test-model",
  temperature: 0.8,
  contextWindow: 8192,
  maxOutputTokens: 160,
  timeoutMs: 20000,
};

const memoryStore = (): AiConfigStore & { values: Map<string, string> } => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
};

describe("ai config storage", () => {
  it("stores only non-secret provider settings in localStorage", () => {
    const store = memoryStore();
    saveAiProvider(provider, store);
    expect(loadAiProvider(store)).toEqual(provider);
    expect(JSON.stringify(loadAiProvider(store))).not.toContain("secret");
    expect(store.values.get("onlinebg.ai-provider")).not.toContain("secret");
    expect(store.values.has("onlinebg.ai-config")).toBe(false);
  });

  it("ignores invalid stored provider data", () => {
    const store = memoryStore();
    store.setItem("onlinebg.ai-provider", "{bad");
    expect(loadAiProvider(store)).toBeNull();
  });

  it("migrates legacy plaintext config and removes it", async () => {
    const store = memoryStore();
    store.setItem(
      "onlinebg.ai-config",
      JSON.stringify({ provider, apiKey: "legacy-secret" }),
    );
    await migrateAiCredentials(store);
    expect(loadAiProvider(store)).toEqual(provider);
    expect(store.values.has("onlinebg.ai-config")).toBe(false);
    expect(await hasAiApiKey()).toBe(true);
    expect(await loadAiApiKey()).toBe("legacy-secret");
  });

  it("keeps the key in memory outside desktop", async () => {
    await saveAiApiKey("memory-key");
    expect(await hasAiApiKey()).toBe(true);
    expect(await loadAiApiKey()).toBe("memory-key");
  });
});
