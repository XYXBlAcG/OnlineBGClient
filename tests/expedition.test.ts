import { expect, it } from "vitest";
import { ExpeditionRules, incoming } from "../src/domain/expedition/rules";
import { chooseAction, runTrial } from "../src/domain/expedition/strategy";
const rules = new ExpeditionRules();
it("uses seeded starting decks and conserves unique card instances through a full round", () => {
  let state = rules.create("demo-test");
  expect(state).toEqual(rules.create("demo-test"));
  expect(
    state.heroes.map((h) => [h.hand.length, h.deck.length, h.energy]),
  ).toEqual([
    [5, 5, 3],
    [5, 5, 3],
  ]);
  const before = state.heroes
    .flatMap((h) => [
      ...h.hand,
      ...h.deck,
      ...h.discard,
      ...h.played,
      ...h.exhaust,
    ])
    .map((c) => c.id)
    .sort();
  for (const actor of [0, 1])
    state = rules.apply(state, { type: "ready", actor });
  expect(state.round).toBe(2);
  const after = state.heroes
    .flatMap((h) => [
      ...h.hand,
      ...h.deck,
      ...h.discard,
      ...h.played,
      ...h.exhaust,
    ])
    .map((c) => c.id)
    .sort();
  expect(after).toEqual(before);
  expect(state.metrics.healthLost).toBeGreaterThan(0);
});
it("previews the exact confirmed effects and rejects stale or duplicate card use without mutation", () => {
  const state = rules.create("preview");
  const action = rules.candidates(state, 0).find((a) => a.type === "play")!;
  const preview = rules.preview(state, action);
  const next = rules.apply(state, action);
  expect(preview.heroes).toEqual(
    next.heroes.map(({ hp, block, energy }) => ({ hp, block, energy })),
  );
  expect(preview.enemies).toEqual(
    next.enemies.map(({ hp, block }) => ({ hp, block })),
  );
  const unchanged = structuredClone(next);
  expect(() => rules.apply(next, action)).toThrow();
  expect(next).toEqual(unchanged);
});
it("keeps policy choices independent of hidden deck order", () => {
  const state = rules.create("private");
  const changed = structuredClone(state);
  changed.heroes.forEach((h) => h.deck.reverse());
  for (const policy of ["attack", "balanced"] as const)
    expect(chooseAction(state, 0, policy)).toEqual(
      chooseAction(changed, 0, policy),
    );
});
it("completes reproducible trials with actual counters and bounded actions", () => {
  const first = runTrial("trial-1", "balanced");
  expect(first).toEqual(runTrial("trial-1", "balanced"));
  expect(["won", "lost"]).toContain(first.outcome);
  expect(first.actions).toBeLessThan(1500);
  expect(first.damage).toBeGreaterThan(0);
  expect(first.rounds).toBeGreaterThan(0);
});
it("uses exact vulnerable rounding and counts only absorbed block", () => {
  let state = rules.create("numbers");
  state.heroes[0].hand = [
    { id: "protect-test", card: "protect", upgraded: false },
  ];
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "protect-test",
    target: { side: "hero", index: 0 },
  });
  state = rules.apply(state, { type: "ready", actor: 0 });
  state = rules.apply(state, { type: "ready", actor: 1 });
  expect(state.metrics.blocked).toBe(7);
  expect(state.heroes[0].block).toBe(0);
  expect(state.heroes[0].hp).toBe(48);
});
it("accounts for every restored health point including post-battle recovery", () => {
  let state = rules.create("health-ledger");
  state.heroes[1].hp = 0;
  state.metrics.healthLost = 42;
  state.enemies.forEach((e) => (e.hp = 1));
  state.heroes[0].hand = [{ id: "sweep-test", card: "sweep", upgraded: false }];
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "sweep-test",
  });
  expect(state.phase).toBe("reward");
  expect(state.heroes.reduce((sum, h) => sum + h.hp, 0)).toBe(
    90 - state.metrics.healthLost + state.metrics.healed,
  );
});
it("includes retargeted enemy attacks in the surviving ally's forecast", () => {
  const state = rules.create("retarget");
  state.heroes[0].hp = 0;
  expect(incoming(state, 1)).toBe(13);
});
it("全队因回合开始毒伤倒地时结束远征，不停在无人可行动的战斗", () => {
  let state = rules.create("poison-round");
  state.heroes.forEach((h) => {
    h.hp = 1;
    h.poison = 2;
    h.block = 100;
  });
  state.enemies.forEach(
    (e) => (e.intent = { kind: "block", amount: 1, target: 0 }),
  );
  for (const actor of [0, 1])
    state = rules.apply(state, { type: "ready", actor });
  expect(state.phase).toBe("lost");
});
it("反伤同时消灭最后敌人和最后英雄时判负，不复活全队", () => {
  let state = rules.create("mutual-kill", [0]);
  const hero = state.heroes[0];
  hero.hp = 1;
  hero.energy = 3;
  hero.hand = [{ id: "last", card: "strike", upgraded: false }];
  state.enemies = state.enemies.slice(0, 1);
  state.enemies[0].hp = 1;
  state.enemies[0].thorns = 2;
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "last",
    target: { side: "enemy", index: 0 },
  });
  expect(state.phase).toBe("lost");
  expect(state.heroes[0].hp).toBe(0);
});
it("每轮开始的遗物包含第一轮，并在新遭遇重置周期",()=>{
 const initial=rules.create("relic-round",[0],[]);initial.heroes[0].relics=["buckler","clock"];
 const encounter={name:"遗物测试",subtitle:"周期",enemies:[{name:"守卫",hp:100,icon:"sentinel",pattern:[{kind:"block" as const,amount:1,target:0}]}]};
 let state=rules.begin(initial,encounter);expect(state.heroes[0].block).toBe(3);expect(state.heroes[0].energy).toBe(3);
 state=rules.apply(state,{type:"ready",actor:0});state=rules.apply(state,{type:"ready",actor:0});expect(state.round).toBe(3);expect(state.heroes[0].energy).toBe(4);
 state=rules.begin(state,encounter);expect(state.heroes[0].energy).toBe(3);expect(state.heroes[0].block).toBe(3);
});
it("enemy visual events retain the real attacker for non-blocking projectile effects",()=>{
 let state=rules.create("origin",[0]);state=rules.apply(state,{type:"ready",actor:0});
 expect(state.visuals.some(event=>event.kind === "damage"&&event.target.side === "hero"&&event.origin?.side === "enemy")).toBe(true);
});
