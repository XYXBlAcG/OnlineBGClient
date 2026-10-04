import { it, expect } from "vitest";
import { Gateway } from "../src/domain/gateway";
import { Room } from "../src/domain/room";

it("switches through the shared gateway preserving identities, chat, archives and room", () => {
  const gateway = new Gateway();
  const owner = gateway.handle({
    type: "create",
    name: "甲",
    config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
  }).session;
  const guest = gateway.handle({
    type: "join",
    room: owner.room,
    name: "乙",
  }).session;
  const room = gateway.rooms.get(owner.room)!;
  room.chat(guest.token, "hello", "继续玩");
  room.setReady(guest.token, true);
  room.start(owner.token);
  expect(() =>
    gateway.handle({ type: "game", token: owner.token, kind: "ddz" }, owner),
  ).toThrow("结束");
  room.end(owner.token);
  expect(() =>
    gateway.handle({ type: "game", token: guest.token, kind: "ddz" }, guest),
  ).toThrow("房主");
  gateway.handle({ type: "game", token: owner.token, kind: "ddz" }, owner);
  expect(room.snapshot(guest.token)).toMatchObject({
    room: owner.room,
    kind: "ddz",
    state: null,
    actor: 1,
  });
  expect(room.config).toMatchObject({ humans: 3, ai: [], team: false });
  expect(room.snapshot(owner.token).chat[0].text).toBe("继续玩");
  expect(room.snapshot(owner.token).records[0].config.kind).toBe("uno");
  expect(room.seats[1].ready).toBe(false);
  const restored = Room.restore(room.export());
  expect(restored.state).toBeNull();
  expect(restored.snapshot(guest.token).kind).toBe("ddz");
  expect(restored.snapshot(guest.token).records).toHaveLength(1);
  const third = room.claim("丙");
  room.setReady(guest.token, true);
  room.setReady(third, true);
  room.start(owner.token);
  expect(room.state?.kind).toBe("ddz");
});
it("rejects an overcrowded target atomically and keeps AI only in supported games", () => {
  const room = new Room("large", {
    kind: "uno",
    humans: 5,
    ai: [],
    team: false,
    training: false,
  });
  const tokens = Array.from({ length: 5 }, (_, i) => room.claim(String(i)));
  const before = structuredClone(room.export());
  expect(() => room.changeGame(tokens[0], "fxq")).toThrow("人数");
  expect(room.export()).toEqual(before);
  const aiRoom = new Room("ai", {
    kind: "sgs",
    humans: 1,
    ai: [{ name: "云雀", difficulty: "hard" }],
    team: true,
    training: false,
  });
  const owner = aiRoom.claim("甲");
  aiRoom.changeGame(owner, "uno");
  expect(aiRoom.config).toMatchObject({
    team: false,
    humans: 1,
    ai: [{ name: "云雀", difficulty: "hard" }],
  });
  aiRoom.changeGame(owner, "ddz");
  expect(aiRoom.config).toMatchObject({ humans: 3, ai: [] });
});
