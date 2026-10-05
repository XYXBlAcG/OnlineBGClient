import { expect, it } from "vitest";
import { preferencesSchema } from "../src/client/preferences";
import { phraseGroups, phraseGroupsSchema } from "../src/domain/phrases";
import { interactionCatalogue, interactionSchema } from "../src/domain/social";

it("keeps grouped presets and custom ordering in the shared preference contract", () => {
  const first = preferencesSchema.parse({});
  expect(first.phraseGroups.flatMap((group) => group.items)).toContain(
    "你这操作，AI看了都得重启。",
  );
  const groups = [{ name: "我的话", items: ["先等等我", "准备好了"] }];
  const restored = preferencesSchema.parse(
    JSON.parse(
      JSON.stringify({ ...first, phraseGroups: groups, chatWidth: 420 }),
    ),
  );
  expect(phraseGroups("uno", restored.phraseGroups)[0]).toEqual(groups[0]);
  expect(restored.chatWidth).toBe(420);
  expect(
    phraseGroupsSchema.safeParse([{ name: "空", items: [" "] }]).success,
  ).toBe(false);
  expect(preferencesSchema.safeParse({ chatWidth: 9999 }).success).toBe(false);
});
it("validates every effect from one catalogue with a distinct visual style", () => {
  expect(Object.keys(interactionCatalogue).length).toBeGreaterThanOrEqual(19);
  for (const [kind, effect] of Object.entries(interactionCatalogue)) {
    expect(interactionSchema.parse(kind)).toBe(kind);
    expect(effect.name).toBeTruthy();
    expect(effect.particles.length).toBeGreaterThan(0);
    expect(effect.style).toBeTruthy();
  }
  expect(
    new Set(Object.values(interactionCatalogue).map((effect) => effect.style))
      .size,
  ).toBeGreaterThanOrEqual(8);
});
