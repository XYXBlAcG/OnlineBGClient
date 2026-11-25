import { beforeEach, expect, it, vi } from "vitest";
import { aiProviderSettingsSchema } from "../src/domain/companion";
const native = vi.hoisted(() => ({
  values: new Map<string, string>(),
  fail: false,
}));
vi.mock("../src/client/platform", () => ({
  capabilities: { secureAiKey: true },
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: async (command: string, args: { scope?: string; key?: string }) => {
    if (command === "ai_key_migrate") return;
    if (command === "ai_key_save") {
      if (native.fail) throw new Error("凭据存储拒绝");
      native.values.set(args.scope!, args.key!);
      return;
    }
    if (command === "ai_key_get") return native.values.get(args.scope!) ?? "";
    if (command === "ai_key_status")
      return { hasKey: native.values.has(args.scope!) };
    if (command === "ai_key_clear") native.values.delete(args.scope!);
  },
}));
import {
  loadAiApiKey,
  migrateAiCredentials,
  saveAiApiKey,
  saveAiProvider,
  clearAiApiKey,
} from "../src/client/ai-config";
const a = aiProviderSettingsSchema.parse({
  format: "openai",
  baseUrl: "https://a.test/v1",
  model: "a",
});
const b = aiProviderSettingsSchema.parse({
  format: "openai",
  baseUrl: "https://b.test/v1",
  model: "b",
});
beforeEach(() => {
  native.values.clear();
  native.fail = false;
});
it("does not reuse a key for another provider origin", async () => {
  await saveAiApiKey("synthetic-a", a);
  expect(await loadAiApiKey(a)).toBe("synthetic-a");
  expect(await loadAiApiKey(b)).toBe("");
  await saveAiApiKey("synthetic-b", b);
  await clearAiApiKey(b);
  expect(await loadAiApiKey(a)).toBe("synthetic-a");
});
it("preserves a legacy credential if secure persistence fails", async () => {
  const legacy = JSON.stringify({ provider: a, apiKey: "synthetic-legacy" });
  const values = new Map([["onlinebg.ai-config", legacy]]);
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  native.fail = true;
  await expect(migrateAiCredentials(store)).rejects.toThrow();
  expect(values.get("onlinebg.ai-config")).toBe(legacy);
  native.fail = false;
  await migrateAiCredentials(store);
  expect(values.has("onlinebg.ai-config")).toBe(false);
  expect(await loadAiApiKey(a)).toBe("synthetic-legacy");
});
it("saving non-secret preferences alone never deletes an unmigrated credential", () => {
  const values = new Map([["onlinebg.ai-config", "legacy"]]);
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  saveAiProvider(a, store);
  expect(values.get("onlinebg.ai-config")).toBe("legacy");
});
