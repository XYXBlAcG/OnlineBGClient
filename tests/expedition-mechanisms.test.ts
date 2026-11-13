import { expect, it } from "vitest";
import { ExpeditionRules } from "../src/domain/expedition/rules";
import {
  cards,
  cardPools,
  commonCards,
  heroContent,
  legacyCardIds,
} from "../src/domain/expedition/content";
import { creatures } from "../src/domain/expedition/world";

it("当前内容包含九个职业、238 张可玩牌和五十四种敌人，卡池不重复", () => {
  expect(heroContent).toHaveLength(9);
  expect(Object.keys(cards)).toHaveLength(240);
  expect(Object.keys(creatures)).toHaveLength(54);
  expect(cardPools.map((pool) => pool.length)).toEqual([
    24, 24, 24, 24, 24, 24, 24, 24, 24,
  ]);
  expect(commonCards).toHaveLength(22);
  expect(new Set([...cardPools.flat(), ...commonCards]).size).toBe(238);
  expect(new Set(Object.values(cards).map((card) => card.name)).size).toBe(240);
  expect(
    cardPools
      .slice(0, 3)
      .map((pool) => pool.filter((id) => legacyCardIds.has(id)).length),
  ).toEqual([18, 18, 18]);
  expect(commonCards.filter((id) => legacyCardIds.has(id))).toHaveLength(12);
});

it("炮台持续输出、过热自伤和冷却使用同一回合执行器", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("machine", [3]);
  state.enemies.forEach((enemy) => (enemy.hp = enemy.maxHp = 1000));
  rules.effects(
    state,
    0,
    [
      { kind: "device", amount: 4 },
      { kind: "heat", amount: 9 },
    ],
    [{ side: "hero", index: 0 }],
  );
  const before = state.enemies.reduce((sum, enemy) => sum + enemy.hp, 0);
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(before - state.enemies.reduce((sum, enemy) => sum + enemy.hp, 0)).toBe(
    4,
  );
  expect(state.heroes[0].turret).toBe(4);
  expect(state.heroes[0].heat).toBe(6);
  rules.effects(
    state,
    0,
    [{ kind: "cool", amount: 4 }],
    [{ side: "hero", index: 0 }],
  );
  expect(state.heroes[0].heat).toBe(2);
});

it("蓄能与回响只在下一轮结算一次，祝福将有限溢出治疗转换为格挡", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("echo", [4]);
  state.enemies.forEach((enemy) => (enemy.hp = enemy.maxHp = 1000));
  rules.effects(
    state,
    0,
    [
      { kind: "focus", amount: 2 },
      { kind: "echo", amount: 7 },
    ],
    [{ side: "hero", index: 0 }],
  );
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.heroes[0].energy).toBe(5);
  expect(state.heroes[0].focus).toBe(0);
  expect(state.heroes[0].echo).toBe(0);
  expect(state.metrics.damage).toBe(7);
  state.heroes[0].hp = state.heroes[0].maxHp;
  state.heroes[0].block = 0;
  rules.effects(
    state,
    0,
    [
      { kind: "blessing", amount: 4 },
      { kind: "heal", amount: 9 },
    ],
    [{ side: "hero", index: 0 }],
  );
  expect(state.heroes[0].block).toBe(4);
  expect(state.heroes[0].blessing).toBe(0);
});

it("最后一位行动者被反伤击倒后自动推进敌方行动，不留下没有可操作玩家的战斗", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("last-actor", [0, 1]);
  state.heroes[0].ready = true;
  state.heroes[1].hp = 1;
  state.heroes[1].block = 0;
  state.heroes[1].hand = [
    { id: "last-strike", card: "strike", upgradeLevel: 0 },
  ];
  state.enemies[0].thorns = 3;
  state.enemies[0].hp = 100;
  const round = state.round;
  state = rules.apply(state, {
    type: "play",
    actor: 1,
    instance: "last-strike",
    target: { side: "enemy", index: 0 },
  });
  expect(state.heroes[1].hp).toBe(0);
  expect(state.round).toBe(round + 1);
  expect(state.heroes[0].ready).toBe(false);
  expect(rules.candidates(state, 0).length).toBeGreaterThan(0);
});

it("敌方反伤逐轮衰减，存在可攻击窗口，不永久封锁多段攻击职业", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("thorns-decay", [0]);
  state.enemies[0].thorns = 3;
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.enemies[0].thorns).toBe(2);
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.enemies[0].thorns).toBe(1);
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.enemies[0].thorns).toBe(0);
});
