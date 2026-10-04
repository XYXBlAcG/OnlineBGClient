import { it, expect } from "vitest";
import { ThemeRegistry, lightTheme } from "../src/client/themes";

it("registers validated theme plugins and rejects duplicated identities or partial palettes", () => {
  const registry = new ThemeRegistry();
  registry.register(lightTheme);
  expect(registry.get("light").tokens.accent).toBe("#256cda");
  expect(() => registry.register(lightTheme)).toThrow("重复");
  expect(() =>
    registry.register({
      ...lightTheme,
      id: "partial",
      tokens: { accent: "#fff" },
    }),
  ).toThrow();
  registry.register({
    ...lightTheme,
    id: "forest",
    label: "森林",
    tokens: { ...lightTheme.tokens, accent: "#21754b" },
  });
  expect(registry.list()).toHaveLength(2);
});

it("restores system theme when a saved plugin is unavailable without discarding preferences", async () => {
  const { loadPreferences } = await import("../src/client/preferences");
  const { vi } = await import("vitest");
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({ theme: "removed", motion: false, favorites: ["uno"] }),
  });
  const saved = loadPreferences();
  expect(saved.theme).toBe("system");
  expect(saved.motion).toBe(false);
  expect(saved.favorites).toEqual(["uno"]);
  vi.unstubAllGlobals();
});
