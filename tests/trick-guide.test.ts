import { expect, it } from "vitest";
import { CardGuides } from "../src/domain/card-guide";
import { UpstreamRuntime } from "../src/upstream/runtime";
import { cardNames } from "../src/domain/terms";

it("explains every real normal and delayed trick through the original card identity", () => {
  const runtime = new UpstreamRuntime();
  const cards = runtime.load(8280);
  const guides = new CardGuides(runtime);
  const covered = new Set<number>();
  for (let id = 0; id < 160; id++) {
    const type = cards.e3(id);
    const guide = guides.get(id);
    if ([1, 2].includes(cards.mc(type))) {
      expect(guide?.name).toBe(cardNames[type]);
      expect(guide?.effect.length).toBeGreaterThan(15);
      expect(guide?.timing.length).toBeGreaterThan(5);
      expect(guide?.target.length).toBeGreaterThan(5);
      expect(guide?.response.length).toBeGreaterThan(5);
      expect(guide?.example.length).toBeGreaterThan(10);
      covered.add(type);
    } else expect(guide).toBeNull();
  }
  expect([...covered].sort((a, b) => a - b)).toEqual(
    Array.from({ length: 15 }, (_, i) => i + 6),
  );
  expect(guides.get(-1)).toBeNull();
  expect(guides.get(1000)).toBeNull();
});
