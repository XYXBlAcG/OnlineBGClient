import { describe, expect, it } from "vitest";
import {
  createArcade,
  chooseArcade,
  settleArcade,
  advanceArcade,
} from "../src/domain/arcade/campaign";
import { GameEngine } from "../src/domain/engine";
import { arcadeOutcome } from "../src/domain/arcade/scenario";

describe("远征扩展关卡", () => {
  it("飞行棋和斗地主使用真实规则的残局；其他游戏保持原始开局", () => {
    const engine = new GameEngine();
    const flight = engine.create("fxq", 2, "flight", false, {
      arcadeScenario: { kind: "fxq" },
    });
    const ddz = engine.create("ddz", 3, "ddz", false, {
      arcadeScenario: { kind: "ddz" },
    });
    if (flight.kind !== "fxq" || ddz.kind !== "ddz") throw new Error("不匹配");
    expect(
      flight.view.planePositionList.filter(
        (position) => position > 0 && position < 57,
      ),
    ).toHaveLength(4);
    expect(engine.candidates(flight, 0)).toContainEqual({
      action: { type: "fxq-roll" },
      label: "掷骰子",
    });
    expect(ddz.view.landlordId).toBe(3);
    expect(
      ddz.view.playerCardLists.slice(1).map((cards) => cards.length),
    ).toEqual([6, 6, 8]);
    expect(engine.candidates(ddz, 2).length).toBeGreaterThan(0);
    expect(engine.project(ddz, 0).view).toMatchObject({
      playerCardLists: [
        [],
        ddz.view.playerCardLists[1],
        [-1, -2, -3, -4, -5, -6],
        [-1, -2, -3, -4, -5, -6, -7, -8],
      ],
    });
  });

  it("飞行棋进度和斗地主农民胜负按短局目标结算", () => {
    const engine = new GameEngine();
    const flight = engine.create("fxq", 2, "flight", false, {
      arcadeScenario: { kind: "fxq" },
    });
    const ddz = engine.create("ddz", 3, "ddz", false, {
      arcadeScenario: { kind: "ddz" },
    });
    if (flight.kind !== "fxq" || ddz.kind !== "ddz") throw new Error("不匹配");
    flight.view.planePositionList[0] = 58;
    flight.view.planePositionList[1] = 58;
    expect(arcadeOutcome(flight, 2, [false, true], false)).toMatchObject({
      won: true,
      reached: true,
    });
    ddz.view.isFinish = true;
    ddz.view.winner = 2;
    expect(arcadeOutcome(ddz, 1, [false, true, true], true).won).toBe(true);
    ddz.view.winner = 3;
    expect(arcadeOutcome(ddz, 1, [false, true, true], true).won).toBe(false);
  });

  it("以种子生成多样的可选路线；四席不发三人残局", () => {
    for (const players of [2, 3, 4]) {
      const run = createArcade("chapter", players);
      const kinds = new Set();
      for (let stage = 0; stage < 5; stage++) {
        const previous = run.results.at(-1)?.challenge.kind;
        expect(run.options.some((option) => option.kind === previous)).toBe(
          false,
        );
        run.options.forEach((option) => kinds.add(option.kind));
        chooseArcade(run, players);
        settleArcade(run, true, "达标", `round-${stage}`);
        if (stage < 4) advanceArcade(run, players);
      }
      expect(kinds.has("fxq")).toBe(true);
      expect(kinds.has("ddz")).toBe(players < 4);
    }
  });
});

it("三国杀短局固定阵营和武将，恢复及响应沿用原引擎", () => {
  const engine = new GameEngine();
  const state = engine.create("sgs", 4, "siege", false, {
    arcadeScenario: { kind: "sgs", guardHealth: 3 },
  });
  if (state.kind !== "sgs") throw Error("游戏类型");
  expect(state.view.stage).toBe(0);
  expect(state.view.hero).toEqual([9, 10, 12, 23]);
  expect(state.view.roles).toEqual([1, 1, 1, 2]);
  expect(state.view.playerBlood[3]).toBe(3);
  const projected = engine.project(state, 0);
  if (projected.kind !== "sgs") throw Error("投影类型");
  expect(projected.view.roles).toEqual([1, 1, 1, 2]);
  expect(projected.view.playerHandCard[3].every((card) => card < 0)).toBe(true);
  state.view.playerBlood[3] = 0;
  expect(
    arcadeOutcome(state, 2, [false, false, false, true], false),
  ).not.toMatchObject({ reached: true });
  state.view.alivePlayerIds = [0, 1, 2];
  expect(
    arcadeOutcome(state, 2, [false, false, false, true], false),
  ).toMatchObject({ won: true, reached: true });
});

it("毒药短局复用爆锅结算，仅以真人平均毒分判定", () => {
  const engine = new GameEngine();
  const state = engine.create("dy", 4, "pot", false, {
    arcadeScenario: { kind: "dy" },
  });
  if (state.kind !== "dy") throw Error("游戏类型");
  expect(state.view.players.map((cards) => cards.length)).toEqual([4, 4, 4, 4]);
  expect(state.view.potValues).toEqual([10, 10, 10]);
  expect(
    new Set([...state.view.pots.flat(), ...state.view.players.flat()]).size,
  ).toBe(22);
  const actor = engine.actors(state)[0];
  const next = engine.apply(
    state,
    actor,
    engine.candidates(state, actor)[0].action,
    "pot-first",
  );
  expect(next.kind).toBe("dy");
  state.view.scores = [1, 3, 40, 40];
  expect(arcadeOutcome(state, 2, [false, false, true, true], false).won).toBe(
    true,
  );
  expect(arcadeOutcome(state, 1, [false, false, true, true], false).won).toBe(
    false,
  );
});

it("三国杀短局经过真实锦囊响应后保留守关目标", () => {
  const engine = new GameEngine();
  const state = engine.create("sgs", 5, "guard-1", false, {
    arcadeScenario: { kind: "sgs", guardHealth: 3 },
  });
  const action = engine
    .candidates(state, 4)
    .find(({ label }) => label.includes("决斗"))!.action;
  const response = engine.apply(state, 4, action, "duel-window");
  expect(engine.needsResolution(response)).toBe(true);
  expect(engine.actors(response).length).toBeGreaterThan(1);
  const actor = engine.actors(response)[0];
  const pass = engine
    .candidates(response, actor)
    .find(({ label }) => /不出|取消|放弃/.test(label));
  const next = pass
    ? engine.apply(response, actor, pass.action, "decline")
    : response;
  const resolved = engine.resolve(next, "pass");
  expect(resolved).toMatchObject({ kind: "sgs", view: { arcadeGuard: 4 } });
  expect(engine.needsResolution(resolved)).toBe(false);
});
