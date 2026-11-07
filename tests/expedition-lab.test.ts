import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { ExpeditionStrategy } from "../src/domain/expedition/ai";
import { runExpeditionAutomation } from "../src/domain/expedition/lab";

it("AI 代理能在职业选择后停在指定节点开始前", () => {
  const adventure = new ExpeditionAdventure(() => 0.37);
  const state = adventure.create(1);
  state.view.map[0].forEach((node) => (node.kind = "rift"));
  const result = runExpeditionAutomation({
    adventure,
    state,
    strategy: new ExpeditionStrategy("explorer"),
    breakpoint: { timing: "before", nodeKind: "rift" },
  });
  expect(result.state.view.phase).toBe("map");
  expect(result.paused).toBe(true);
  expect(result.reason).toContain("开始前");
  expect(result.steps).toBeGreaterThan(0);
});

it("AI 代理能在节点完整结算后停止，并保留资源快照", () => {
  const adventure = new ExpeditionAdventure(() => 0.37);
  const state = adventure.create(1);
  state.view.map[0].forEach((node) => (node.kind = "gamble"));
  const result = runExpeditionAutomation({
    adventure,
    state,
    strategy: new ExpeditionStrategy("balanced"),
    breakpoint: { timing: "after", nodeKind: "gamble" },
  });
  expect(result.paused).toBe(true);
  expect(result.reason).toContain("结算后");
  expect(result.state.view.lastNodeResult?.nodeKind).toBe("gamble");
});

it("探索型策略会优先选择未探索支线而不是普通战斗", () => {
  const adventure = new ExpeditionAdventure(() => 0.37),
    strategy = new ExpeditionStrategy("explorer");
  let state = adventure.create(1);
  state = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  state.view.map[0][0].kind = "battle";
  state.view.map[0][1].kind = "rift";
  state.view.votes = {};
  const request = {
    observation: adventure.project(state, 0),
    actor: 0,
    difficulty: "hard" as const,
    seed: "explorer-rift",
    audit: false,
  };
  const scores = strategy
    .score(request, strategy.candidates(request))
    .sort((left, right) => right.score - left.score);
  expect(scores[0].label).toContain("深渊裂隙");
});

it("风险适应策略会在低生命时优先恢复而非继续挑战精英", () => {
  const adventure = new ExpeditionAdventure(() => 0.37),
    strategy = new ExpeditionStrategy("adaptive");
  let state = adventure.create(1);
  state = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  state.view.map[0][0].kind = "camp";
  state.view.map[0][1].kind = "elite";
  state.view.combat.heroes[0].hp = Math.ceil(
    state.view.combat.heroes[0].maxHp * 0.35,
  );
  const request = {
      observation: adventure.project(state, 0),
      actor: 0,
      difficulty: "hard" as const,
      seed: "adaptive-recovery",
      audit: false,
    },
    scored = strategy
      .score(request, strategy.candidates(request))
      .sort((left, right) => right.score - left.score);
  expect(scored[0].label).toContain("营地");
});
