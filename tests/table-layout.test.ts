import { expect, it } from "vitest";
import { preferencesSchema } from "../src/client/preferences";
import {
  auxiliaryIntentSchema,
  auxiliaryViews,
} from "../src/client/native/contract";
import { sidebarBounds } from "../src/client/sidebar-layout";
it("keeps auxiliary sizing bounded by the space reserved for the complete table", () => {
  expect(sidebarBounds(1100)).toEqual({ min: 280, max: 360 });
  expect(sidebarBounds(1440).max).toBe(520);
  expect(sidebarBounds(800).max).toBe(280);
  expect(preferencesSchema.parse({}).chatVisible).toBe(false);
  expect(preferencesSchema.parse({ sidebarWidth: 420 }).sidebarWidth).toBe(420);
  expect(preferencesSchema.safeParse({ sidebarWidth: 900 }).success).toBe(
    false,
  );
});
it("validates native chat and guide intents without creating a second game writer", () => {
  expect(auxiliaryViews).toEqual(expect.arrayContaining(["chat", "guide"]));
  expect(
    auxiliaryIntentSchema.safeParse({
      view: "chat",
      type: "chat-text",
      text: "准备好了",
    }).success,
  ).toBe(true);
  expect(
    auxiliaryIntentSchema.safeParse({
      view: "guide",
      type: "guide-locate",
      index: 2,
    }).success,
  ).toBe(true);
  expect(
    auxiliaryIntentSchema.safeParse({
      view: "guide",
      type: "guide-step",
      index: -1,
    }).success,
  ).toBe(false);
  expect(
    auxiliaryIntentSchema.safeParse({
      view: "guide",
      type: "chat-text",
      text: "测试",
    }).success,
  ).toBe(false);
});
