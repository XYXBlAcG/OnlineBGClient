import { expect, it } from "vitest";
import {
  advancedEncounter,
  grantSceneShield,
  advanceTeamContract,
} from "../src/domain/expedition/advanced";
import { ExpeditionRules } from "../src/domain/expedition/rules";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { encounters } from "../src/domain/expedition/content";
it("adds a breakable optional shield device and stops grants when destroyed", () => {
  const original = encounters[0];
  expect(advancedEncounter(original, false, 0)).toBe(original);
  const combat = new ExpeditionRules().create(
    "shield",
    [0],
    [advancedEncounter(original, true, 0)],
  );
  grantSceneShield(combat);
  expect(combat.enemies[0].block).toBeGreaterThanOrEqual(3);
  combat.enemies.find((enemy) => enemy.key === "advanced-shield")!.hp = 0;
  const block = combat.enemies[0].block;
  grantSceneShield(combat);
  expect(combat.enemies[0].block).toBe(block);
});
it("grants the contract once for different contributors in one round", () => {
  const run = new ExpeditionAdventure().create(2).view;
  run.combat.phase = "combat";
  run.teamContract = {
    status: "active",
    round: run.combat.round,
    attack: [],
    defend: [],
  };
  const before = structuredClone(run.combat);
  run.combat.metrics.damage++;
  advanceTeamContract(run, before, 0, { type: "card", instance: "test" });
  const beforeDefense = structuredClone(run.combat);
  run.combat.heroes[1].block += 5;
  advanceTeamContract(run, beforeDefense, 1, {
    type: "card",
    instance: "test",
  });
  expect(run.teamContract.status).toBe("completed");
  const block = run.combat.heroes[0].block;
  advanceTeamContract(run, beforeDefense, 1, {
    type: "card",
    instance: "test",
  });
  expect(run.combat.heroes[0].block).toBe(block);
});
it("consumes shared compass once and completes only the acting player camp choice", () => {
  const rules = new ExpeditionAdventure();
  const state = rules.create(2, false, {
    expedition: { difficulty: "standard", advanced: true },
  });
  state.view.phase = "camp";
  state.view.nodeReady = [false, false];
  state.view.compass = 1;
  state.view.combat.heroes[0].hp = 10;
  const gold = state.view.combat.heroes[0].gold;
  const action = {
    type: "expedition-action" as const,
    move: { type: "compass-supply" as const },
  };
  expect(
    rules
      .candidates(state, 0)
      .some(
        (c) =>
          c.action.type === "expedition-action" &&
          c.action.move.type === "compass-supply",
      ),
  ).toBe(true);
  const next = rules.apply(state, 0, action);
  expect(next.view.compass).toBe(0);
  expect(next.view.combat.heroes[0].hp).toBe(22);
  expect(next.view.combat.heroes[0].gold).toBe(gold + 20);
  expect(next.view.nodeReady).toEqual([true, false]);
  expect(() => rules.apply(next, 1, action)).toThrow();
  state.view.advanced = false;
  expect(() => rules.apply(state, 0, action)).toThrow();
});
it("replays and restores authoritative advanced moves deterministically", async () => {
  const { Room } = await import("../src/domain/room");
  const { Replay } = await import("../src/domain/replay");
  const { ReplayTimeline } = await import("../src/domain/replay-timeline");
  const { ExpeditionStrategy } = await import("../src/domain/expedition/ai");
  const room = new Room("adv-replay", {
    kind: "expedition",
    humans: 1,
    ai: [],
    team: false,
    training: false,
    expedition: { difficulty: "standard", advanced: true },
  });
  const token = room.claim("旅人");
  room.setReady(token, true);
  room.start(token);
  const rules = new ExpeditionAdventure(),
    ai = new ExpeditionStrategy();
  for (
    let step = 0;
    step < 60 &&
    room.state?.kind === "expedition" &&
    !rules.finished(room.state);
    step++
  ) {
    const request = {
      observation: rules.project(room.state, 0),
      actor: 0,
      difficulty: "normal" as const,
      seed: `advanced-${step}`,
      audit: false,
    };
    const best = ai
      .score(request, ai.candidates(request))
      .sort((a, b) => b.score - a.score)[0];
    expect(best).toBeDefined();
    room.act(token, `action-${step}`, room.version, best.action);
  }
  const archive = room.export(),
    record = archive.replay!;
  expect(record.expeditionRunId).toBe(
    room.state?.kind === "expedition" ? room.state.view.runId : "",
  );
  expect(new Replay(record).frame(record.events.length)).toEqual(room.state);
  expect(Room.restore(archive).state).toEqual(room.state);
  const timeline = new ReplayTimeline(new Replay(record));
  while (!timeline.step(8)) {}
  expect(timeline.markers.some((marker) => marker.kind === "node")).toBe(true);
  expect(timeline.markers.some((marker) => marker.label === "战斗开始")).toBe(
    true,
  );
});
