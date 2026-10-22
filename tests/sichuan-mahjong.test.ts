import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { analyzeHand, shanten } from "../src/domain/mahjong/hand";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
const ids = (types: number[]) => {
  const n = Array(27).fill(0);
  return types.map((t) => t * 4 + n[t]++);
};
it("recognizes standard hands, Sichuan dragon pairs and missing suit restrictions", () => {
  const hand = ids([0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 17, 17]);
  expect(analyzeHand(hand, [], 2)?.labels).toContain("平胡");
  expect(analyzeHand(hand, [], 0)).toBeNull();
  expect(shanten(hand, 0)).toBe(-1);
  const pairs = ids([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  expect(analyzeHand(pairs, [], 2)?.labels).toContain("龙七对");
  expect(shanten(pairs, 0)).toBe(-1);
});
it("keeps 108 unique tiles and masks all other concealed information through simultaneous setup", () => {
  const e = new GameEngine();
  let s = e.create("scmj", 4, "setup");
  if (s.kind !== "scmj") throw new Error();
  expect(new Set([...s.view.wall, ...s.view.hands.flat()]).size).toBe(108);
  const before = e.project(s, 1);
  s = e.apply(s, 0, e.candidates(s, 0)[0].action, "x");
  const after = e.project(s, 1);
  if (before.kind !== "scmj" || after.kind !== "scmj") throw new Error();
  expect(after.view.exchange[0]).toEqual(before.view.exchange[0]);
  expect(after.view.hands[0].every((t) => t < 0)).toBe(true);
  expect(after.view.wall.every((t) => t < 0)).toBe(true);
  for (const actor of e.actors(s))
    s = e.apply(s, actor, e.candidates(s, actor)[0].action, "exchange");
  if (s.kind !== "scmj") throw new Error();
  expect(s.view.phase).toBe("lack");
  expect(new Set([...s.view.wall, ...s.view.hands.flat()]).size).toBe(108);
  for (const actor of e.actors(s))
    s = e.apply(
      s,
      actor,
      { type: "scmj-action", move: { type: "lack", suit: actor % 3 } },
      "lack",
    );
  if (s.kind !== "scmj") throw new Error();
  expect(s.view.phase).toBe("play");
  const legal = e
    .candidates(s, 0)
    .filter(
      (c) =>
        c.action.type === "scmj-action" && c.action.move.type === "discard",
    );
  if (s.view.hands[0].some((t) => Math.floor(t / 36) === 0))
    expect(
      legal.every(
        (c) =>
          c.action.type === "scmj-action" &&
          c.action.move.type === "discard" &&
          Math.floor(c.action.move.tile / 36) === 0,
      ),
    ).toBe(true);
});
it("finishes a deterministic legal complete game and replays its zero-sum settlement", () => {
  const room = new Room(
    "sichuan",
    { kind: "scmj", humans: 4, ai: [], team: false, training: false },
    "finish",
  );
  const tokens = [0, 1, 2, 3].map((i) => room.claim(String(i)));
  room.seats.forEach((s) => (s.ready = true));
  room.start(tokens[0]);
  for (let n = 0; n < 650 && !room.engine.finished(room.state!); n++) {
    const actor = room.engine.actors(room.state!)[0],
      moves = room.engine.candidates(room.state!, actor);
    expect(moves.length).toBeGreaterThan(0);
    const move =
      moves.find(
        (c) =>
          c.action.type === "scmj-action" &&
          ["win", "kong"].includes(c.action.move.type),
      ) ||
      moves.find(
        (c) =>
          c.action.type === "scmj-action" &&
          c.action.move.type === "respond" &&
          c.action.move.choice === "win",
      ) ||
      moves[0];
    room.act(tokens[actor], `m-${n}`, room.version, move.action);
  }
  expect(room.engine.finished(room.state!)).toBe(true);
  expect(() => room.setAutoplay(tokens[0], true)).toThrow("当前不能托管");
  if (room.state!.kind !== "scmj") throw new Error();
  expect(room.state!.view.scores.reduce((a, b) => a + b, 0)).toBe(0);
  expect(new Replay(room.snapshot(tokens[0]).replay!).frames().at(-1)).toEqual(
    room.state,
  );
});
import { SichuanRules } from "../src/domain/mahjong/rules";
import { settleDraw } from "../src/domain/mahjong/settlement";
import type { MahjongState } from "../src/domain/mahjong/types";
function arranged(types: number[][]): MahjongState {
  const engine = new GameEngine(),
    state = engine.create("scmj", 4, "arranged") as MahjongState,
    used = Array(27).fill(0),
    hands = types.map((hand) =>
      hand.map((type) => {
        if (used[type] >= 4) throw new Error("fixture duplicates tiles");
        return type * 4 + used[type]++;
      }),
    );
  state.view.hands = hands;
  const known = new Set(hands.flat());
  state.view.wall = Array.from({ length: 108 }, (_, i) => i).filter(
    (i) => !known.has(i),
  );
  state.view.phase = "play";
  state.view.lacks = [2, 2, 2, 2];
  state.view.lackReady.fill(true);
  state.view.exchangeReady.fill(true);
  state.view.lastDraw = { actor: 0, tile: hands[0].at(-1)!, kong: false };
  return state;
}
it("waits for all winning responses and resolves multiple winners independent of arrival order", () => {
  const rule = new SichuanRules(() => 0.5),
    base = arranged([
      [17],
      [0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 17],
      [6, 7, 8, 3, 4, 5, 9, 10, 11, 12, 13, 14, 17],
      [],
    ]);
  const tile = base.view.hands[0][0];
  const pending = rule.apply(base, 0, {
    type: "scmj-action",
    move: { type: "discard", tile },
  });
  const first = rule.apply(pending, 2, {
    type: "scmj-action",
    move: { type: "respond", choice: "win" },
  });
  expect(first.view.wins).toHaveLength(0);
  const second = rule.apply(first, 1, {
    type: "scmj-action",
    move: { type: "respond", choice: "win" },
  });
  expect(second.view.wins.map((w) => w.player)).toEqual([1, 2]);
  expect(second.view.scores.reduce((a, b) => a + b, 0)).toBe(0);
  const reverse = rule.apply(
    rule.apply(pending, 1, {
      type: "scmj-action",
      move: { type: "respond", choice: "win" },
    }),
    2,
    { type: "scmj-action", move: { type: "respond", choice: "win" } },
  );
  expect(second).toEqual(reverse);
});
it("allows robbing an added kong without charging its kong fee or upgrading the original pong", () => {
  const rule = new SichuanRules(() => 0.5),
    state = arranged([
      [0, 1, 1, 2, 2, 4, 5, 6, 7, 13, 14],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 17, 17],
      [],
      [],
    ]);
  const tile = state.view.hands[0][0];
  state.view.hands[0][0] = 3;
  state.view.melds[0] = [{ type: "pong", from: 2, tiles: [0, 1, 2] }];
  state.view.wall = state.view.wall.filter((t) => ![0, 1, 2, 3].includes(t));
  const pending = rule.apply(state, 0, {
    type: "scmj-action",
    move: { type: "kong", tile: 3 },
  });
  expect(pending.view.pending?.rob).toBe(true);
  expect(pending.view.payments).toEqual([]);
  const next = rule.apply(pending, 1, {
    type: "scmj-action",
    move: { type: "respond", choice: "win" },
  });
  expect(next.view.wins[0].labels).toContain("抢杠胡");
  expect(next.view.melds[0][0].type).toBe("pong");
  expect(next.view.payments.every((p) => p.kind !== "kong")).toBe(true);
});
it("rejects invalid phase/copy choices and does not expose concealed kong faces", () => {
  const engine = new GameEngine(),
    state = engine.create("scmj", 4, "invalid") as MahjongState;
  expect(() =>
    engine.apply(
      state,
      0,
      { type: "scmj-action", move: { type: "exchange", tiles: [0, 0, 0] } },
      "x",
    ),
  ).toThrow();
  state.view.melds[1] = [{ type: "closed", from: 1, tiles: [0, 1, 2, 3] }];
  state.view.events = [{ type: "kong", actor: 1, tiles: [0] }];
  const projected = engine.project(state, 0) as MahjongState;
  expect(projected.view.melds[1][0].tiles).toEqual([-1, -1, -1, -1]);
  expect(projected.view.events[0].tiles).toEqual([-1]);
});
it("returns kong fees to their actual payers when the recipient fails to wait at exhaustion", () => {
  const state = arranged([
    [0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 17],
    [18, 19, 20],
    [0, 0, 0, 1, 1, 4, 4, 6, 7, 10, 12, 15, 17],
    [],
  ]);
  state.view.wins = [
    { player: 3, from: 3, tile: 40, fan: 0, labels: ["平胡"], value: 1 },
  ];
  state.view.scores = [-2, 0, 2, 0];
  state.view.payments = [
    { from: 0, to: 2, amount: 2, kind: "kong", reason: "补杠" },
  ];
  settleDraw(state.view);
  expect(state.view.payments).toContainEqual({
    from: 2,
    to: 0,
    amount: 2,
    reason: "未听牌退杠税",
    kind: "refund",
    ref: 0,
  });
  expect(state.view.payments.some((p) => p.reason === "查花猪")).toBe(true);
  expect(state.view.payments.every((p) => p.from !== 3 && p.to !== 3)).toBe(
    true,
  );
  expect(state.view.scores.reduce((a, b) => a + b, 0)).toBe(0);
});
it("accepts simultaneous setup commands from one window but rejects commands from a previous window", () => {
  const room = new Room("parallel", {
    kind: "scmj",
    humans: 4,
    ai: [],
    team: false,
    training: false,
  });
  const tokens = [0, 1, 2, 3].map((i) => room.claim(String(i)));
  room.seats.forEach((s) => (s.ready = true));
  room.start(tokens[0]);
  const version = room.version,
    moves = tokens.map(
      (_, actor) => room.engine.candidates(room.state!, actor)[0].action,
    );
  for (let actor = 0; actor < 4; actor++)
    room.act(tokens[actor], `exchange-${actor}`, version, moves[actor]);
  expect(() =>
    room.act(tokens[0], "old-window", version, {
      type: "scmj-action",
      move: { type: "lack", suit: 0 },
    }),
  ).toThrow();
  const next = room.version;
  for (let actor = 0; actor < 4; actor++)
    room.act(tokens[actor], `lack-${actor}`, next, {
      type: "scmj-action",
      move: { type: "lack", suit: 2 },
    });
  expect(room.state?.kind === "scmj" && room.state.view.phase).toBe("play");
});
it("lets a human explicitly delegate and reclaim only their own seat", () => {
  const room = new Room("auto", {
    kind: "scmj",
    humans: 4,
    ai: [],
    team: false,
    training: false,
  });
  const tokens = [0, 1, 2, 3].map((i) => room.claim(String(i)));
  room.seats.forEach((s) => (s.ready = true));
  room.start(tokens[0]);
  room.setAutoplay(tokens[2], true);
  expect(room.aiRequest()?.actor).toBe(2);
  expect(room.snapshot(tokens[2]).candidates).toEqual([]);
  room.setAutoplay(tokens[2], false);
  expect(room.aiRequest()).toBeNull();
});
it("supports a seat-free local spectator without revealing any AI hand", () => {
  const room = new Room(
    "spectate",
    {
      kind: "scmj",
      humans: 0,
      ai: Array.from({ length: 4 }, () => ({
        difficulty: "normal" as const,
        name: "",
      })),
      team: false,
      training: false,
    },
    "spectate",
  );
  const host = room.createHost("观战");
  room.start(host);
  const snapshot = room.snapshot(host);
  expect(snapshot.actor).toBe(-1);
  expect(snapshot.canManage).toBe(true);
  if (snapshot.state?.kind !== "scmj")
    throw new Error("missing spectator view");
  expect(snapshot.state.view.hands.flat().every((t) => t === -1)).toBe(true);
  expect(snapshot.candidates).toEqual([]);
  expect(room.aiRequest()?.observation.kind).toBe("scmj");
  expect(Room.restore(room.export()).snapshot(host).state).toEqual(
    snapshot.state,
  );
});
import { gameMotionEvents } from "../src/client/game-motion-events";
it("keeps exchange animations private and does not replay events on metadata updates", () => {
  const engine = new GameEngine();
  let state = engine.create("scmj", 4, "motion");
  for (let i = 0; i < 3; i++)
    state = engine.apply(
      state,
      i,
      engine.candidates(state, i)[0].action,
      `exchange-${i}`,
    );
  const before = engine.project(state, 0);
  state = engine.apply(
    state,
    3,
    engine.candidates(state, 3)[0].action,
    "exchange-3",
  );
  const after = engine.project(state, 0);
  const events = gameMotionEvents(before, after, 0);
  expect(events.filter((e) => e.type === "draw" && e.reveal)).toHaveLength(3);
  expect(
    events
      .filter((e) => e.type === "draw" && !e.reveal)
      .every((e) => !("card" in e)),
  ).toBe(true);
  expect(gameMotionEvents(after, structuredClone(after), 0)).toEqual([]);
});
