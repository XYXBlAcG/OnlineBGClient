import {
  advanceArcade,
  chooseArcade,
  settleArcade,
} from "../src/domain/arcade/campaign";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";

afterEach(() => vi.useRealTimers());

describe("多游戏远征", () => {
  it("以同一引擎复现四张起手和45秒矿洞", () => {
    const engine = new GameEngine();
    const uno = engine.create("uno", 3, "uno-short", false, {
      arcadeScenario: { kind: "uno" },
    });
    const miner = engine.create("miner", 3, "mine-short", false, {
      arcadeScenario: {
        kind: "miner",
        durationMs: 45000,
        target: 100,
        boss: false,
      },
    });
    if (uno.kind !== "uno" || miner.kind !== "miner") throw Error("场景类型");
    expect(uno.view.playerCards.map((cards) => cards.length)).toEqual([
      4, 4, 4,
    ]);
    expect(uno.view.isStart).toBe(true);
    expect(engine.project(uno, 1).view).toMatchObject({
      playerCards: [
        [-1, -2, -3, -4],
        uno.view.playerCards[1],
        [-1, -2, -3, -4],
      ],
    });
    expect(miner.view.phase).toBe("live");
    expect(miner.view.node?.timeLeftMs).toBe(45000);
    expect(miner.view.matchLevels).toBe(1);
  });

  it("在同一房间开局投票、保存恢复、补给并切换到 UNO，旧动作失效", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10000);
    let room = new Room(
      "arcade-test",
      {
        kind: "miner",
        humans: 2,
        ai: [],
        team: false,
        training: false,
        arcade: true,
      },
      "arcade-seed",
    );
    const host = room.claim("房主");
    const friend = room.claim("队友");
    room.setReady(friend, true);
    room.start(host);
    const route = room.snapshot(host).arcade!;
    expect(route.phase).toBe("route");
    expect(JSON.stringify(route)).not.toContain(room.export().arcade!.run.seed);
    room.arcadeAction(host, {
      type: "vote",
      run: route.id,
      stage: route.stage,
      option: route.options[0].id,
    });
    expect(room.snapshot(friend).arcade?.votes[0]).toBe(route.options[0].id);
    room.arcadeAction(friend, {
      type: "vote",
      run: route.id,
      stage: route.stage,
      option: route.options[0].id,
    });
    const mine = room.snapshot(host);
    expect(mine.state).toMatchObject({
      kind: "miner",
      view: { phase: "live" },
    });
    const archive = room.export();
    room = Room.restore(archive);
    room.claim("房主", host);
    room.claim("队友", friend);
    for (
      let i = 0;
      i < 1200 && room.snapshot(host).arcade!.phase === "playing";
      i++
    ) {
      vi.advanceTimersByTime(50);
      room.resolveIfDue();
    }
    const result = room.snapshot(host);
    expect(result.arcade?.lives).toBe(2);
    expect(result.arcade?.results).toHaveLength(1);
    expect(result.arcade?.phase).toBe("reward");
    const record = result.records.at(-1)!;
    expect(new Replay(record).frame(0)).toMatchObject({
      kind: "miner",
      view: { phase: "live" },
    });
    room.arcadeAction(friend, {
      type: "ready",
      run: route.id,
      stage: route.stage,
    });
    room.arcadeAction(host, {
      type: "ready",
      run: route.id,
      stage: route.stage,
    });
    const nextRoute = room.snapshot(host).arcade!;
    const next = nextRoute.options[0];
    room.arcadeAction(host, {
      type: "vote",
      run: nextRoute.id,
      stage: nextRoute.stage,
      option: next.id,
    });
    room.arcadeAction(friend, {
      type: "vote",
      run: nextRoute.id,
      stage: nextRoute.stage,
      option: next.id,
    });
    const uno = room.snapshot(host);
    expect(uno.state?.kind).toBe("uno");
    expect(room.snapshot(friend).seats.map(({ name }) => name)).toEqual([
      "房主",
      "队友",
    ]);
    expect(() =>
      room.act(host, "old-action", mine.version, { type: "uno-draw" }),
    ).toThrow("对局已更新");
    expect(() =>
      room.arcadeAction(host, {
        type: "ready",
        run: route.id,
        stage: route.stage,
      }),
    ).toThrow("路线已更新");
    room.disconnect(friend);
    vi.advanceTimersByTime(200000);
    room.resolveIfDue();
    expect(room.snapshot(host).arcade?.phase).toBe("playing");
    room.claim("队友", friend);
    room.resolveIfDue();
    expect(room.snapshot(host).arcade?.phase).toBe("playing");
    vi.advanceTimersByTime(180001);
    room.resolveIfDue();
    expect(room.snapshot(host).arcade?.results).toHaveLength(2);
    expect(
      new Replay(room.snapshot(host).records.at(-1)!).frame(0),
    ).toMatchObject({ kind: "uno", view: { isStart: true } });
  });
});

it("两席斗地主临时补位，重连与结算保持原房间和原席位", () => {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  let room = new Room("arcade-ddz", {
    kind: "miner",
    humans: 2,
    ai: [],
    team: false,
    training: false,
    arcade: true,
  });
  const host = room.claim("房主"),
    friend = room.claim("队友");
  room.setReady(friend, true);
  room.start(host);
  const archive = room.export();
  const run = archive.arcade!.run;
  for (let stage = 0; stage < 2; stage++) {
    chooseArcade(run, 2);
    settleArcade(run, true, "达标", `fixture-${stage}`);
    advanceArcade(run, 2);
  }
  room = Room.restore(archive);
  room.claim("房主", host);
  room.claim("队友", friend);
  const route = room.snapshot(host).arcade!,
    choice = route.options.find(({ kind }) => kind === "ddz")!;
  for (const token of [host, friend])
    room.arcadeAction(token, {
      type: "vote",
      run: route.id,
      stage: route.stage,
      option: choice.id,
    });
  expect(room.snapshot(host).seats.map(({ name }) => name)).toEqual([
    "房主",
    "队友",
    "守关地主",
  ]);
  expect(room.aiRequest()?.actor).toBe(2);
  room = Room.restore(room.export());
  room.claim("房主", host);
  room.claim("队友", friend);
  vi.advanceTimersByTime(181_000);
  room.resolveIfDue();
  const state = room.snapshot(host);
  expect(state.room).toBe("arcade-ddz");
  expect(state.seats.map(({ name }) => name)).toEqual(["房主", "队友"]);
  expect(state.config.ai).toEqual([]);
  expect(new Replay(state.records.at(-1)!).frame(0).kind).toBe("ddz");
});

it("四名真人可挑战三国杀，保留守关 AI 及独立回放直到结算", () => {
  vi.useFakeTimers();
  vi.setSystemTime(20_000);
  let room = new Room(
    "arcade-sgs",
    {
      kind: "miner",
      humans: 4,
      ai: [],
      team: false,
      training: false,
      arcade: true,
    },
    "four-seats",
  );
  const tokens = Array.from({ length: 4 }, (_, i) =>
    room.claim(`玩家${i + 1}`),
  );
  const [host, ...friends] = tokens;
  for (const token of friends) room.setReady(token, true);
  room.start(host);
  const archive = room.export(),
    run = archive.arcade!.run;
  for (let stage = 0; stage < 3; stage++) {
    chooseArcade(run, 4);
    settleArcade(run, true, "达标", `fixture-${stage}`);
    advanceArcade(run, 4);
  }
  room = Room.restore(archive);
  tokens.forEach((token, i) => room.claim(`玩家${i + 1}`, token));
  const route = room.snapshot(host).arcade!,
    choice = route.options.find(({ kind }) => kind === "sgs")!;
  for (const token of tokens)
    room.arcadeAction(token, {
      type: "vote",
      run: route.id,
      stage: route.stage,
      option: choice.id,
    });
  expect(room.snapshot(host).seats).toHaveLength(5);
  expect(room.aiRequest()?.actor).toBe(4);
  room = Room.restore(room.export());
  tokens.forEach((token, i) => room.claim(`玩家${i + 1}`, token));
  vi.advanceTimersByTime(181_000);
  room.resolveIfDue();
  const settled = room.snapshot(host);
  expect(settled.seats).toHaveLength(4);
  expect(settled.arcade?.results.at(-1)?.challenge.kind).toBe("sgs");
  const replay = new Replay(settled.records.at(-1)!);
  expect(replay.frame(0)).toMatchObject({
    kind: "sgs",
    view: { arcadeGuard: 4 },
  });
});

it("房主关闭时限和步数后，选路与台球可以跨过原截止时间，回放保留玩法", () => {
  vi.useFakeTimers();
  vi.setSystemTime(15_000);
  let room = new Room(
    "arcade-pool",
    {
      kind: "miner",
      humans: 2,
      ai: [],
      team: false,
      training: false,
      arcade: true,
      arcadeSettings: {
        countdown: false,
        actionLimit: false,
        preferred: "pool",
      },
    },
    "untimed",
  );
  const host = room.claim("甲"),
    guest = room.claim("乙");
  room.setReady(guest, true);
  room.start(host);
  vi.advanceTimersByTime(200_000);
  expect(room.resolveIfDue()).toBe(false);
  expect(room.snapshot(host).arcade?.phase).toBe("route");
  const archive = room.export();
  const run = archive.arcade!.run;
  chooseArcade(run, 2);
  settleArcade(run, true, "达标", "mine");
  advanceArcade(run, 2);
  room = Room.restore(archive);
  room.claim("甲", host);
  room.claim("乙", guest);
  const route = room.snapshot(host).arcade!;
  const option = route.options.find((option) => option.kind === "pool")!;
  for (const token of [host, guest])
    room.arcadeAction(token, {
      type: "vote",
      stage: route.stage,
      run: route.id,
      option: option.id,
    });
  vi.advanceTimersByTime(600_000);
  expect(room.resolveIfDue()).toBe(false);
  const current = room.snapshot(guest);
  expect(current.arcade).toMatchObject({
    phase: "playing",
    deadline: undefined,
    actionsLeft: undefined,
  });
  expect(current.state).toMatchObject({
    kind: "pool",
    view: { options: { shotSeconds: 0 } },
  });
  expect(() =>
    room.arcadeAction(guest, {
      type: "retreat",
      stage: route.stage,
      run: route.id,
    }),
  ).toThrow();
  room.arcadeAction(host, {
    type: "retreat",
    stage: route.stage,
    run: route.id,
  });
  const ended = room.snapshot(host);
  expect(ended.arcade).toMatchObject({ phase: "reward", lives: 2 });
  expect(new Replay(ended.records.at(-1)!).frame(0)).toMatchObject({
    kind: "pool",
    view: { options: { shotSeconds: 0 } },
  });
});
