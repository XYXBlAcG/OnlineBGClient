import { describe, it, expect } from "vitest";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
import type { Action } from "../src/domain/types";
function create() {
  const room = new Room(
    "exp-room",
    { kind: "expedition", humans: 2, ai: [], team: false, training: false },
    "exp-room-test",
  );
  const a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  room.start(a);
  return { room, a, b };
}
describe("合作远征房间", () => {
  it("同窗口允许两个客户端同版本行动，跨阶段拒绝旧请求，重复请求只执行一次", () => {
    const { room, a, b } = create(),
      version = room.version;
    const choose = (profession: number): Action => ({
      type: "expedition-action",
      move: { type: "profession", profession },
    });
    room.act(a, "a", version, choose(0));
    room.act(b, "b", version, choose(2));
    expect(room.state?.kind === "expedition" && room.state.view.phase).toBe(
      "map",
    );
    expect(() =>
      room.act(a, "stale", version, {
        type: "expedition-action",
        move: { type: "vote", choice: "0-0" },
      }),
    ).toThrow();
    const move = room.snapshot(a).candidates[0].action;
    room.act(a, "vote-a", room.version, move);
    const after = room.version;
    room.act(a, "vote-a", version, move);
    expect(room.version).toBe(after);
    room.act(b, "vote-b", after, move);
    expect(room.state?.kind === "expedition" && room.state.view.phase).toBe(
      "battle",
    );
    const initial = room.version;
    room.act(a, "ready-a", initial, {
      type: "expedition-action",
      move: { type: "ready" },
    });
    room.act(b, "ready-b", initial, {
      type: "expedition-action",
      move: { type: "ready" },
    });
    expect(() =>
      room.act(a, "old-round", initial, {
        type: "expedition-action",
        move: { type: "ready" },
      }),
    ).toThrow();
    expect(Room.restore(room.export()).state).toEqual(room.state);
    expect(
      new Replay(room.export().replay!).frame(
        room.export().replay!.events.length,
      ),
    ).toEqual(room.state);
  });
});
it("离线队友可由房主明确交给 AI 接管，重连后本人收回控制", () => {
  const { room, a, b } = create();
  room.disconnect(b);
  expect(room.paused).toBe(true);
  room.setAutoplay(a, true, 1);
  expect(room.paused).toBe(false);
  expect(room.aiRequest()?.actor).toBe(1);
  room.claim("乙", b);
  room.setAutoplay(b, false);
  expect(room.snapshot(b).seats[1].autoplay).toBe(false);
  expect(() => room.setAutoplay(b, true, 0)).toThrow();
});
it("麻将换三张、定缺和响应沿用规则声明的并行行动窗口", () => {
  const room = new Room(
      "scmj-window",
      { kind: "scmj", humans: 4, ai: [], team: false, training: false },
      "scmj-window",
    ),
    tokens = [0, 1, 2, 3].map((i) => room.claim(`玩家${i}`));
  tokens.forEach((t) => room.setReady(t, true));
  room.start(tokens[0]);
  for (const phase of ["exchange", "lack"]) {
    if (room.state?.kind !== "scmj") throw new Error("game");
    expect(room.state.view.phase).toBe(phase);
    const version = room.version,
      actions = tokens.map((t) => room.snapshot(t).candidates[0].action);
    tokens.forEach((token, i) =>
      room.act(token, `${phase}-${i}`, version, actions[i]),
    );
  }
  expect(room.state?.kind === "scmj" && room.state.view.phase).toBe("play");
});
