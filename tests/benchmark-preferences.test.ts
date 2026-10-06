import { expect, it, vi } from "vitest";
import { preferencesSchema, loadPreferences } from "../src/client/preferences";
it("hides benchmark tools on new and existing installs until explicitly enabled", () => {
  expect(preferencesSchema.parse({}).benchmarkVisible).toBe(false);
  vi.stubGlobal("localStorage", {
    getItem: () => JSON.stringify({ benchmarkVisible: true }),
  });
  try {
    expect(loadPreferences().benchmarkVisible).toBe(true);
  } finally {
    vi.unstubAllGlobals();
  }
});
