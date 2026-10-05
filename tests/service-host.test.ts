import { expect, it } from "vitest";
import { Gateway } from "../src/domain/gateway";
import { Room } from "../src/domain/room";

it("hosts without a player seat and lets the first phone manage a complete room", () => {
  const gateway = new Gateway();
  const created = gateway.handle({
    type: "create",
    hostOnly: true,
    name: "服务电脑",
    config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
  });
  const room = gateway.rooms.get(created.session.room)!;
  expect(room.snapshot(created.session.token)).toMatchObject({
    actor: -1,
    canManage: true,
    state: null,
    host: { name: "服务电脑" },
  });
  expect(room.seats.every((seat) => !seat.token)).toBe(true);
  const first = gateway.handle({ type: "join", room: room.id, name: "手机甲" });
  const second = gateway.handle({
    type: "join",
    room: room.id,
    name: "手机乙",
  });
  expect(room.snapshot(first.session.token).canManage).toBe(true);
  expect(room.snapshot(second.session.token).canManage).toBe(false);
  room.setReady(second.session.token, true);
  room.start(first.session.token);
  expect(room.snapshot(created.session.token).state).toBeNull();
  expect(room.snapshot(created.session.token).playing).toBe(true);
  expect(() =>
    room.act(created.session.token, "bad", room.version, { type: "uno-start" }),
  ).toThrow();
  room.disconnect(created.session.token);
  expect(room.paused).toBe(false);
  room.disconnect(second.session.token);
  expect(room.paused).toBe(true);
  room.claim("", second.session.token);
  const restored = Room.restore(room.export());
  restored.claim("", first.session.token);
  restored.claim("", second.session.token);
  expect(restored.paused).toBe(false);
  expect(restored.snapshot(created.session.token).actor).toBe(-1);
  room.chat(created.session.token, "chat", "服务运行中");
  expect(room.snapshot(first.session.token).chat.at(-1)?.name).toBe("服务电脑");
  room.end(first.session.token);
  const members = room.seats.map((seat) => seat.id!);
  room.changeGame(created.session.token, {
    config: { ...room.config, kind: "ktd", humans: 2 },
    retain: members,
    members,
    endCurrent: false,
  });
  expect(room.seats).toHaveLength(2);
  expect(room.snapshot(first.session.token).canManage).toBe(true);
});

it("reuses game projections for chat but recomputes after actions and disconnects", () => {
  const room = new Room("cache", {
    kind: "uno",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const first = room.claim("甲"),
    second = room.claim("乙");
  room.setReady(second, true);
  room.start(first);
  const before = room.snapshot(first);
  room.chat(second, "one", "招呼");
  const chatted = room.snapshot(first);
  expect(chatted.state).toBe(before.state);
  expect(chatted.candidates).toBe(before.candidates);
  room.act(first, "start", room.version, { type: "uno-start" });
  expect(room.snapshot(first).state).not.toBe(before.state);
  room.disconnect(second);
  expect(room.snapshot(first).candidates).toEqual([]);
});
