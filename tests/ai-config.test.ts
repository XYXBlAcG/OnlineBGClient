import { describe, expect, it } from "vitest";
import {
  loadAiConfig,
  saveAiConfig,
  type AiConfigStore,
} from "../src/client/ai-config";

const config = {
  provider: {
    format: "openai" as const,
    baseUrl: "https://ai.test/v1",
    model: "test-model",
    temperature: 0.8,
    contextWindow: 8192,
    maxOutputTokens: 160,
    timeoutMs: 20000,
  },
  apiKey: "secret",
};

const memoryStore = (): AiConfigStore => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};

describe("ai config storage", () => {
  it("round-trips provider settings and key", () => {
    const store = memoryStore();
    saveAiConfig(config, store);
    expect(loadAiConfig(store)).toEqual(config);
  });

  it("ignores invalid stored data", () => {
    const store = memoryStore();
    store.setItem("onlinebg.ai-config", "{bad");
    expect(loadAiConfig(store)).toBeNull();
  });
});
