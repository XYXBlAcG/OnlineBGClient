import { expect, it } from "vitest";
import {
  auxiliaryIntentSchema,
  auxiliaryViews,
} from "../src/client/native/contract";
it("validates auxiliary intents before the main window changes game or settings state", () => {
  expect(auxiliaryViews).toContain("settings");
  expect(
    auxiliaryIntentSchema.safeParse({
      view: "roomsetup",
      type: "setup",
      setup: {
        config: { kind: "tq", humans: 2, ai: [], team: false, training: false },
        retain: [],
        members: [],
        endCurrent: false,
      },
    }).success,
  ).toBe(true);
  expect(
    auxiliaryIntentSchema.parse({
      view: "actions",
      type: "action",
      action: { type: "tq-move", route: [0, 1] },
    }),
  ).toMatchObject({ action: { type: "tq-move", route: [0, 1] } });
  expect(
    auxiliaryIntentSchema.safeParse({
      view: "settings",
      type: "action",
      action: { type: "fake" },
    }).success,
  ).toBe(false);
  expect(
    auxiliaryIntentSchema.safeParse({
      view: "settings",
      type: "preferences",
      preferences: { theme: "dark" },
    }).success,
  ).toBe(true);
});
