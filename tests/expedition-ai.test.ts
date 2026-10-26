import { describe, it, expect } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { ExpeditionStrategy } from "../src/domain/expedition/ai";
import type { Difficulty } from "../src/domain/types";
describe("远征策略", () => {
  for (const difficulty of ["easy", "normal", "hard"] as Difficulty[])
    it(`${difficulty} 在完整远征中只提交合法动作并结束`, () => {
      const rules = new ExpeditionAdventure(),
        ai = new ExpeditionStrategy();
      let state = rules.create(2),
        steps = 0;
      while (!rules.finished(state) && steps++ < 1800) {
        const actor = rules.actors(state)[0];
        expect(actor).not.toBeUndefined();
        const view = rules.project(state, actor),
          request = {
            observation: view,
            actor,
            difficulty,
            seed: `test:${steps}`,
            audit: false,
          };
        const ranked = ai
          .score(request, ai.candidates(request))
          .sort((a, b) => b.score - a.score);
        expect(ranked[0].features).toEqual([]);
        state = rules.apply(state, actor, ranked[0].action);
      }
      expect(rules.finished(state)).toBe(true);
      expect(steps).toBeLessThan(1800);
    });
});
