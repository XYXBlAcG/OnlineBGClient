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

it("能力较强的 AI 会为低血量营地与未探索环路赋予更高路线价值", () => {
  const rules = new ExpeditionAdventure(),
    ai = new ExpeditionStrategy();
  let state = rules.create(1);
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  state.view.current = state.view.map[0][0].id;
  state.view.floor = 1;
  state.view.path = [state.view.map[0][0].id];
  state.view.votes = {};
  state.view.phase = "map";
  state.view.map[0][0].next = ["hard-ai-camp", "hard-ai-elite"];
  state.view.map[1][0] = {
    ...state.view.map[1][0],
    id: "hard-ai-camp",
    kind: "camp",
    next: [],
  };
  state.view.map[1][1] = {
    ...state.view.map[1][1],
    id: "hard-ai-elite",
    kind: "elite",
    next: [],
  };
  const hero = state.view.combat.heroes[0];
  hero.hp = Math.ceil(hero.maxHp * 0.35);
  const observation = rules.project(state, 0);
  const baseRequest = {
    observation,
    actor: 0,
    seed: "hard-route-profile",
    audit: true,
  };
  const hardCandidates = ai.candidates({ ...baseRequest, difficulty: "hard" }),
    normalCandidates = ai.candidates({
      ...baseRequest,
      difficulty: "normal",
    }),
    findCamp = (candidates: typeof hardCandidates) =>
      candidates.find(
        (candidate) =>
          candidate.action.type === "expedition-action" &&
          candidate.action.move.type === "vote" &&
          candidate.action.move.choice === "hard-ai-camp",
      ),
    hardCamp = hardCandidates.find(
      (candidate) =>
        candidate.action.type === "expedition-action" &&
        candidate.action.move.type === "vote" &&
        candidate.action.move.choice === "hard-ai-camp",
    ),
    normalCamp = normalCandidates.find(
      (candidate) =>
        candidate.action.type === "expedition-action" &&
        candidate.action.move.type === "vote" &&
        candidate.action.move.choice === "hard-ai-camp",
    ),
    hard = ai
      .score(
        { ...baseRequest, difficulty: "hard" },
        hardCamp ? [hardCamp] : [],
      )
      .at(0),
    normal = ai
      .score(
        { ...baseRequest, difficulty: "normal" },
        normalCamp ? [normalCamp] : [],
      )
      .at(0);
  expect(findCamp(hardCandidates)).toBeDefined();
  expect(findCamp(normalCandidates)).toBeDefined();
  expect(hard?.score ?? 0).toBeGreaterThan(normal?.score ?? 0);
});
