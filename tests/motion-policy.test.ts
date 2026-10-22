import { expect, it } from "vitest";
import { motionPolicy } from "../src/client/motion-policy";
import { preferencesSchema } from "../src/client/preferences";
it("keeps game baseline independent of the interface Boolean", () => {
  for (const motion of [false, true])
    for (const enhancedGameMotion of [false, true]) {
      const preferences = preferencesSchema.parse({
        motion,
        enhancedGameMotion,
      });
      expect(motionPolicy(preferences, false, true)).toEqual({
        ui: motion,
        game: enhancedGameMotion ? "enhanced" : "baseline",
      });
      expect(motionPolicy(preferences, true, true)).toEqual({
        ui: false,
        game: "reduced",
      });
      expect(motionPolicy(preferences, false, false)).toEqual({
        ui: false,
        game: "reduced",
      });
    }
  expect(preferencesSchema.parse({}).enhancedGameMotion).toBe(false);
});
