import { expect, it } from "vitest";
import {
  arcadeGameKinds,
  createArcade,
  chooseArcade,
  settleArcade,
  advanceArcade,
  rerouteArcade,
  healArcadeCamp,
} from "../src/domain/arcade/campaign";
import { ArcadeSession } from "../src/domain/arcade/session";
import { GameEngine } from "../src/domain/engine";
import { arcadeScenario } from "../src/domain/arcade/scenario";

it("悠闲节奏的路线和玩法不会超时或减少行动预算", () => {
  const run = createArcade("slow", 2, {
    countdown: false,
    actionLimit: false,
    preferred: "pool",
  });
  const session = new ArcadeSession({ id: "practice", run, remainingMs: 0 });
  session.time(45_000);
  expect(session.sample(false, Date.now() + 2_000_000)).toBe(false);
  expect(session.snapshot(false)).toMatchObject({
    deadline: undefined,
    actionsLeft: undefined,
  });
  const mine = chooseArcade(run, 2);
  const state = new GameEngine().create("miner", 2, mine.seed, false, {
    arcadeScenario: arcadeScenario(mine, run.settings),
  });
  expect(state).toMatchObject({ kind: "miner", view: { untimed: true } });
  settleArcade(run, true, "达标", "mine");
  advanceArcade(run, 2);
  expect(run.options.some(({ kind }) => kind === "pool")).toBe(true);
});

it("营地印记可换生命，重抽消耗一次并使旧投票过期", () => {
  const run = createArcade("camp", 2);
  chooseArcade(run, 2);
  settleArcade(run, false, "未达标", "first");
  run.medals = 2;
  healArcadeCamp(run);
  expect([run.lives, run.medals]).toEqual([3, 0]);
  advanceArcade(run, 2);
  const stale = run.options[0].id;
  run.relics.push("reroute");
  run.votes[0] = stale;
  rerouteArcade(run, 2);
  expect(run.votes).toEqual({});
  expect(run.options.every(({ id }) => id !== stale)).toBe(true);
  expect(() => rerouteArcade(run, 2)).toThrow();
});

it("平铺游戏目录覆盖可以作为单独一节的牌桌", () => {
  expect(arcadeGameKinds).toEqual(
    expect.arrayContaining([
      "pool",
      "tq",
      "ccbs",
      "ktd",
      "dominion",
      "graphwar",
      "scmj",
    ]),
  );
});

it("所有新增牌桌可以作为真实远征关卡开局、生成胜负目标，按报名数补足", async () => {
  const { arcadeContinuingKinds } =
    await import("../src/domain/arcade/campaign");
  const { arcadeOutcome, arcadeSupplement } =
    await import("../src/domain/arcade/scenario");
  const engine = new GameEngine();
  for (const kind of arcadeContinuingKinds) {
    for (const players of [2, 3, 4]) {
      const humans = Array.from({ length: players }, () => ({
        difficulty: null,
      }));
      const seats = [...humans, ...arcadeSupplement(kind, humans)];
      const run = createArcade("coverage", players, {
        countdown: false,
        actionLimit: false,
        preferred: kind,
      });
      chooseArcade(run, players);
      settleArcade(run, true, "达标", "coverage");
      advanceArcade(run, players);
      const challenge = run.options.find((option) => option.kind === kind)!;
      expect(challenge).toBeDefined();
      const state = engine.create(kind, seats.length, challenge.seed, false, {
        arcadeScenario: arcadeScenario(challenge, run.settings),
      });
      expect(engine.actors(state).length).toBeGreaterThan(0);
      expect(
        arcadeOutcome(
          state,
          challenge.target,
          seats.map(({ difficulty }) => !!difficulty),
          false,
        ),
      ).toHaveProperty("won", false);
      if (state.kind === "pool") expect(state.view.options.shotSeconds).toBe(0);
      if (state.kind === "graphwar")
        expect(state.view.options.turnSeconds).toBe(0);
    }
  }
});

it("契约产生双倍失败代价，援护路线让队伍喘口气", () => {
  const run = createArcade("branches", 2);
  for (let round = 0; round < 2; round++) {
    chooseArcade(run, 2);
    settleArcade(run, false, "未达标", `loss-${round}`);
    advanceArcade(run, 2);
  }
  const relief = run.options.find((option) => option.relief)!;
  run.votes[0] = relief.id;
  chooseArcade(run, 2);
  settleArcade(run, false, "未达标", "relief");
  expect(run.lives).toBe(1);

  const hard = createArcade("contract", 2);
  for (let round = 0; round < 2; round++) {
    chooseArcade(hard, 2);
    settleArcade(hard, true, "达标", `win-${round}`);
    advanceArcade(hard, 2);
  }
  hard.votes[0] = hard.options.find((option) => option.contract)!.id;
  chooseArcade(hard, 2);
  settleArcade(hard, false, "未达标", "contract-loss");
  expect(hard.lives).toBe(1);
});

it("前三种不同的达标游戏奖励一枚护符", () => {
  const run = createArcade("stamp", 2);
  for (let stage = 0; stage < 3; stage++) {
    chooseArcade(run, 2);
    settleArcade(run, true, "达标", `win-${stage}`);
    if (stage < 2) advanceArcade(run, 2);
  }
  expect(run.relics).toEqual(["shield"]);
  expect(run.medals).toBe(3);
});

it("函数战关闭行动限制后越过原回合上限，仍可继续对战", async () => {
  const { actionLimit } = await import("../src/domain/graphwar/types");
  const engine = new GameEngine();
  const state = engine.create("graphwar", 2, "uncapped", false, {
    arcadeScenario: { kind: "graphwar", noActionCap: true },
  });
  if (state.kind !== "graphwar") throw Error("游戏类型");
  state.view.sequence = actionLimit(state.view) - 1;
  const after = engine.apply(
    state,
    state.view.turn,
    { type: "graphwar-pass" },
    "next",
  );
  expect(engine.finished(after)).toBe(false);
});
