import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { ExpeditionStrategy } from "../src/domain/expedition/ai";

it("能力较强的远征 AI 通过真实 decide 分支完成完整对局", () => {
  const rules = new ExpeditionAdventure(),
    ai = new ExpeditionStrategy();
  for (const players of [1, 2]) {
    let state = rules.create(players),
      steps = 0;
    while (!rules.finished(state) && steps++ < 1800) {
      const actor = rules.actors(state)[0];
      expect(actor).not.toBeUndefined();
      const decision = ai.decide(
        rules.project(state, actor),
        actor,
        "hard",
        `hard-decide:${players}:${steps}`,
      );
      state = rules.apply(state, actor, decision.chosen);
    }
    expect(rules.finished(state)).toBe(true);
    expect(steps).toBeLessThan(1800);
  }
}, 120000);
