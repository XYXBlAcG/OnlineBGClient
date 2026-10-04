import { it, expect } from "vitest";
import { HeroGuides } from "../src/domain/hero-guide";
import { UpstreamRuntime } from "../src/upstream/runtime";
it("covers all actual selectable heroes and skills using the rule data", () => {
  const guides = new HeroGuides().all();
  const rows = new UpstreamRuntime().load(8467).V6;
  expect(guides).toHaveLength(rows.length);
  for (const hero of guides) {
    expect(hero.health).toBe(rows[hero.id][3]);
    expect(hero.skills).toHaveLength(rows[hero.id][4].length);
    for (const skill of hero.skills) {
      expect(skill.effect.length).toBeGreaterThan(0);
      expect(skill.trigger).toBeTruthy();
      expect(skill.example).toBeTruthy();
    }
  }
  expect(new HeroGuides().get(8).skills[0].effect).toContain("仅回复一次");
});
