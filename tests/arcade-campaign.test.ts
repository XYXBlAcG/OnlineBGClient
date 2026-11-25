import { describe, expect, it } from "vitest";
import {
  advanceArcade,
  arcadeRewards,
  chooseArcade,
  createArcade,
  settleArcade,
  voteArcade,
  type ArcadeRun,
} from "../src/domain/arcade/campaign";

function play(run: ArcadeRun, won: boolean, playId: string) {
  voteArcade(run, 0, run.options[0].id);
  chooseArcade(run, 2);
  settleArcade(run, won, won ? "达标" : "未达标", playId);
}

function scoutedRun() {
  const run = createArcade("scout-seed", 2);
  play(run, true, "scout-0");
  advanceArcade(run, 2, "scout");
  return run;
}

describe("多游戏远征战役", () => {
  it("零关创建两条可复现的矿工路线", () => {
    const run = createArcade("arcade-seed", 2);
    expect(createArcade("arcade-seed", 2)).toEqual(run);
    expect(run).toMatchObject({
      seed: "arcade-seed",
      phase: "route",
      stage: 0,
      lives: 3,
      relics: [],
      votes: {},
      ready: [],
      current: null,
      results: [],
    });
    expect(run.options).toHaveLength(2);
    expect(run.options.map((option) => option.kind)).toEqual([
      "miner",
      "miner",
    ]);
    expect(run.options.map((option) => option.target)).toEqual([960, 1400]);
    expect(run.options.every((option) => option.durationMs === 45_000)).toBe(
      true,
    );
    expect(run.options.every((option) => !option.boss)).toBe(true);
    expect(new Set(run.options.map((option) => option.id)).size).toBe(2);
    expect(new Set(run.options.map((option) => option.seed)).size).toBe(2);
    expect(createArcade("other-seed", 2).options[0].seed).not.toBe(
      run.options[0].seed,
    );
  });

  it("投票按多数决，平票和空票按路线顺序", () => {
    const run = createArcade("vote-seed", 3);
    const [first, second] = run.options;
    voteArcade(run, 0, second.id);
    voteArcade(run, 1, second.id);
    voteArcade(run, 2, first.id);
    voteArcade(run, 2, second.id);
    expect(run.votes).toEqual({ 0: second.id, 1: second.id, 2: second.id });
    expect(chooseArcade(run, 3)).toEqual(second);
    expect(run.phase).toBe("playing");
    expect(run.stage).toBe(0);
    expect(run.current).toEqual(second);
    expect(() => voteArcade(run, 0, first.id)).toThrow();

    const tied = createArcade("tie-seed", 2);
    voteArcade(tied, 0, tied.options[1].id);
    voteArcade(tied, 1, tied.options[0].id);
    expect(chooseArcade(tied, 2)).toEqual(tied.options[0]);

    const empty = createArcade("empty-seed", 2);
    expect(chooseArcade(empty, 2)).toEqual(empty.options[0]);
  });

  it("拒绝无效投票与非本局座位票", () => {
    const run = createArcade("invalid-seed", 2);
    expect(() => voteArcade(run, -1, run.options[0].id)).toThrow();
    expect(() => voteArcade(run, 0, "missing")).toThrow();
    voteArcade(run, 2, run.options[0].id);
    expect(() => chooseArcade(run, 2)).toThrow();
  });

  it("五关交替游戏，第五关为首领并在结算后结束", () => {
    const run = createArcade("stage-seed", 2);
    for (let stage = 0; stage < 5; stage++) {
      expect(run.stage).toBe(stage);
      expect(run.phase).toBe("route");
      expect(run.options).toHaveLength(stage === 0 || stage === 4 ? 2 : 3);
      expect(run.options.every((option) => option.boss === (stage === 4))).toBe(
        true,
      );
      expect(
        run.options.every(
          (option) => option.kind !== run.results.at(-1)?.challenge.kind,
        ),
      ).toBe(true);
      if (stage === 0) {
        expect(run.options.map((option) => option.target)).toEqual([960, 1400]);
      }
      const chosen = run.options[stage % 2];
      voteArcade(run, stage % 2, chosen.id);
      chooseArcade(run, 2);
      expect(run.current).toEqual(chosen);
      const playId = `stage-${stage}`;
      settleArcade(run, true, "达标", playId);
      expect(run.stage).toBe(stage);
      expect(run.phase).toBe(stage === 4 ? "finished" : "reward");
      expect(run.results.at(-1)).toEqual({
        challenge: chosen,
        won: true,
        detail: "达标",
        playId,
      });
      if (stage < 4) advanceArcade(run, 2);
    }
    expect(run.results).toHaveLength(5);
    expect(() => advanceArcade(run, 2)).toThrow();
  });

  it("失败扣生命，成功才可领遗物，危险路线额外提供护符", () => {
    const run = createArcade("life-seed", 2);
    play(run, false, "loss-0");
    expect(run.lives).toBe(2);
    expect(arcadeRewards(run)).toEqual([]);
    expect(() => advanceArcade(run, 2, "supply")).toThrow();
    advanceArcade(run, 2);

    play(run, true, "win-1");
    expect(arcadeRewards(run)).toEqual([
      "supply",
      "shield",
      "scout",
      "overtime",
      "reroute",
    ]);
    advanceArcade(run, 2, "shield");
    expect(run.relics).toEqual(["shield"]);

    play(run, false, "loss-2");
    expect(run.lives).toBe(2);
    expect(run.relics).toEqual([]);
    advanceArcade(run, 2);

    voteArcade(run, 0, run.options[0].id);
    chooseArcade(run, 2);
    settleArcade(run, true, "达标", "win-3");
    expect(arcadeRewards(run)).toEqual([
      "supply",
      "scout",
      "overtime",
      "reroute",
    ]);
    advanceArcade(run, 2, "supply");
    expect(run.stage).toBe(4);
    expect(run.lives).toBe(3);
  });

  it("探路为下一关增加一条确定路线并在使用后消耗", () => {
    const run = scoutedRun();
    expect(run.stage).toBe(1);
    expect(run.phase).toBe("route");
    expect(run.relics).not.toContain("scout");
    expect(run.options).toHaveLength(4);
    expect(run.options.map((option) => option.kind)).toEqual([
      "uno",
      "fxq",
      "pool",
      "ddz",
    ]);
    expect(new Set(run.options.map((option) => option.id)).size).toBe(4);
    expect(scoutedRun().options).toEqual(run.options);

    const plain = createArcade("scout-seed", 2);
    play(plain, true, "scout-0");
    advanceArcade(plain, 2);
    expect(plain.options).toHaveLength(3);
    expect(run.options.slice(0, 3)).toEqual(plain.options);
    expect(run.options[3].id).not.toBe(run.options[0].id);
    expect(run.options[3].id).not.toBe(run.options[1].id);

    play(run, true, "scout-1");
    advanceArcade(run, 2);
    expect(run.stage).toBe(2);
    expect(run.options).toHaveLength(3);
  });

  it("同一局结算幂等，新结算不能覆盖奖励阶段", () => {
    const run = createArcade("idempotent-seed", 2);
    voteArcade(run, 0, run.options[0].id);
    chooseArcade(run, 2);
    settleArcade(run, false, "未达标", "play-1");
    const settled = structuredClone(run);
    settleArcade(run, false, "重复", "play-1");
    expect(run).toEqual(settled);
    expect(run.results).toHaveLength(1);
    expect(run.lives).toBe(2);
    expect(() => settleArcade(run, true, "越权", "play-2")).toThrow();
    expect(run).toEqual(settled);
  });

  it("非游戏阶段不能结算，非奖励阶段不能推进", () => {
    const run = createArcade("phase-seed", 2);
    expect(() => settleArcade(run, true, "未开始", "play")).toThrow();
    expect(() => advanceArcade(run, 2)).toThrow();
  });
});

it("怀表只延长下一关的时限", () => {
  const run = createArcade("clock-seed", 2);
  play(run, true, "mine");
  const plain = structuredClone(run);
  advanceArcade(run, 2, "overtime");
  advanceArcade(plain, 2);
  expect(run.options.map(({ durationMs }) => durationMs)).toEqual(
    plain.options.map(({ durationMs }) => durationMs + 20_000),
  );
  play(run, true, "next");
  play(plain, true, "next");
  advanceArcade(run, 2);
  advanceArcade(plain, 2);
  expect(run.options).toEqual(plain.options);
});

it("连续达标两关恢复一格生命", () => {
  const run = createArcade("streak", 2);
  play(run, false, "loss");
  advanceArcade(run, 2);
  play(run, true, "win-1");
  expect(run.lives).toBe(2);
  advanceArcade(run, 2);
  play(run, true, "win-2");
  expect(run.lives).toBe(3);
});
