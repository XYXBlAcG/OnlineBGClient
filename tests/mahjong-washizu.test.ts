import { describe, expect, it } from "vitest";
import { SichuanRules } from "../src/domain/mahjong/rules";
import { MahjongStrategy } from "../src/domain/mahjong/strategy";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
import { isTransparent, type MahjongMove } from "../src/domain/mahjong/types";

describe("透明立直", () => {
  const rules = new SichuanRules(() => 0.42);
  const create = () =>
    rules.create(4, false, {
      mahjong: { mode: "washizu", cap: 3, selfDraw: "base" },
    });
  it("使用 136 张牌并从庄家出牌开始", () => {
    const { view } = create();
    const tiles = [
      ...view.hands.flat(),
      ...view.wall,
      ...view.riichi!.deadWall,
    ];
    expect(new Set(tiles).size).toBe(136);
    expect(tiles.filter(isTransparent)).toHaveLength(102);
    expect(view.phase).toBe("play");
  });
  it("他家暗牌、牌山与未翻宝牌不会进入观察视图", () => {
    const state = create();
    const projected = rules.project(state, 0).view;
    expect(projected.hands[1]).toEqual([
      ...state.view.hands[1].filter(isTransparent),
      ...state.view.hands[1].filter((t) => !isTransparent(t)).map(() => -1),
    ]);
    expect(projected.wall.every((t) => t === -1)).toBe(true);
    expect(projected.riichi!.deadWall).toEqual([]);
    expect(projected.riichi!.dora).toHaveLength(1);
  });
  it("立直七对可以自摸并结算番符和立直棒", () => {
    const state = create();
    const types = [0, 4, 8, 9, 13, 18, 33];
    const hand = types.flatMap((type) => [type * 4, type * 4 + 1]);
    state.view.hands[0] = hand;
    state.view.lastDraw = { actor: 0, tile: hand.at(-1)!, kong: false };
    state.view.riichi!.ready[0] = true;
    state.view.riichi!.sticks = 1;
    state.view.scores[0] -= 1000;
    const result = rules.apply(state, 0, {
      type: "scmj-action",
      move: { type: "win" },
    });
    expect(result.view.wins[0]).toMatchObject({ player: 0, fu: 25 });
    expect(result.view.wins[0].labels).toContain("七対子");
    expect(result.view.scores.reduce((a, b) => a + b, 0)).toBe(100000);
    expect(result.view.riichi!.ura).toHaveLength(1);
  });
  it("同一种牌的曾弃记录导致振听，暂时振听不会暴露给他家", () => {
    const state = create();
    state.view.phase = "response";
    state.view.responses = ["pass", null, "pass", "pass"];
    state.view.pending = { actor: 0, tile: 133, rob: false, afterKong: false };
    state.view.hands[1] = [0, 4, 8, 9, 13, 18]
      .flatMap((type) => [type * 4, type * 4 + 1])
      .concat(132);
    const ron = () =>
      rules
        .candidates(state, 1)
        .some(
          (candidate) =>
            candidate.action.type === "scmj-action" &&
            candidate.action.move.type === "respond" &&
            candidate.action.move.choice === "win",
        );
    expect(ron()).toBe(true);
    state.view.riichi!.discardedTypes[1].push(33);
    expect(ron()).toBe(false);
    state.view.riichi!.discardedTypes[1].pop();
    state.view.riichi!.furiten[1] = true;
    expect(ron()).toBe(false);
    expect(rules.project(state, 0).view.riichi!.furiten[1]).toBe(false);
  });
  it("吃牌仅限下家，公开副露后由吃家出牌", () => {
    const state = create();
    state.view.phase = "response";
    state.view.responses = ["pass", null, null, "pass"];
    state.view.pending = { actor: 0, tile: 8, rob: false, afterKong: false };
    state.view.rivers[0] = [8];
    state.view.hands[1] = [0, 4, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56];
    state.view.hands[2] = [1, 5, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57];
    const call: MahjongMove = { type: "call", choice: "chi", tiles: [0, 4] };
    expect(
      rules
        .candidates(state, 2)
        .every(
          ({ action }) =>
            action.type !== "scmj-action" ||
            action.move.type !== "call" ||
            action.move.choice !== "chi",
        ),
    ).toBe(true);
    const chosen = rules.apply(state, 1, { type: "scmj-action", move: call });
    const resolved = rules.apply(chosen, 2, {
      type: "scmj-action",
      move: { type: "respond", choice: "pass" },
    });
    expect(resolved.view.turn).toBe(1);
    expect(resolved.view.rivers[0]).toEqual([]);
    expect(resolved.view.melds[1]).toEqual([
      { type: "chi", tiles: [8, 0, 4], from: 0 },
    ]);
  });
  it("房间进行中不会公开牌山种子，完成后可确定性重放", () => {
    const room = new Room("washizu", {
      kind: "scmj",
      humans: 4,
      ai: [],
      team: false,
      training: false,
      mahjong: { mode: "washizu" },
    });
    const tokens = Array.from({ length: 4 }, (_, i) => room.claim(`玩家${i}`));
    room.seats.forEach((seat) => {
      seat.ready = true;
    });
    room.start(tokens[0]);
    const record = room.export().replay!;
    expect(JSON.stringify(room.snapshot(tokens[1]))).not.toContain(record.seed);
    for (
      let step = 0;
      step < 320 && !room.engine.finished(room.state!);
      step++
    ) {
      const actor = room.engine.actors(room.state!)[0];
      const projected = room.snapshot(tokens[actor]);
      const choice = projected.candidates[0];
      expect(choice).toBeDefined();
      room.act(tokens[actor], `move-${step}`, room.version, choice.action);
    }
    const replay = new Replay(room.snapshot(tokens[0]).replay);
    expect(replay.frame(replay.record.events.length)).toEqual(room.state);
  });
  it("困难 AI 仅用投影视图产生合法动作", () => {
    const state = create();
    const strategy = new MahjongStrategy();
    const observed = rules.project(state, 0);
    const result = strategy.decide(observed, 0, "hard", "washizu-ai");
    expect(
      rules
        .candidates(state, 0)
        .some(
          ({ action }) =>
            JSON.stringify(action) === JSON.stringify(result.chosen),
        ),
    ).toBe(true);
  });
  it("合法候选可以推进至单局结束且结算守恒", () => {
    let state = create();
    for (let step = 0; step < 320 && !rules.finished(state); step++) {
      const actor = rules.actors(state)[0];
      const moves = rules.candidates(state, actor);
      const choice =
        moves.find(
          (c) =>
            c.action.type === "scmj-action" &&
            (c.action.move.type === "win" ||
              (c.action.move.type === "respond" &&
                c.action.move.choice === "win")),
        ) ?? moves[0];
      expect(choice).toBeDefined();
      state = rules.apply(state, actor, choice.action);
    }
    expect(rules.finished(state)).toBe(true);
    expect(state.view.scores.reduce((a, b) => a + b, 0)).toBe(100000);
  });
});
