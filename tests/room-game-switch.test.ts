import { it, expect } from "vitest";
import { Gateway } from "../src/domain/gateway";
import { Room } from "../src/domain/room";
import {
  configSchema,
  type RoomConfig,
  type RoomSetup,
} from "../src/domain/protocol";
function setup(
  room: Room,
  config: RoomConfig,
  endCurrent = false,
  retain = room.seats.filter((seat) => seat.token).map((seat) => seat.id!),
): RoomSetup {
  return {
    config,
    retain,
    members: room.seats.filter((seat) => seat.token).map((seat) => seat.id!),
    endCurrent,
  };
}
it("switches through the shared gateway preserving identities, chat, archives and room", () => {
  const gateway = new Gateway(),
    owner = gateway.handle({
      type: "create",
      name: "甲",
      config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
    }).session;
  const guest = gateway.handle({
      type: "join",
      room: owner.room,
      name: "乙",
    }).session,
    room = gateway.rooms.get(owner.room)!;
  room.chat(guest.token, "hello", "继续玩");
  room.setReady(guest.token, true);
  room.start(owner.token);
  const next = setup(room, { ...room.config, kind: "ddz", humans: 3, ai: [] });
  expect(() =>
    gateway.handle({ type: "game", token: owner.token, setup: next }, owner),
  ).toThrow("结束");
  room.end(owner.token);
  expect(() =>
    gateway.handle({ type: "game", token: guest.token, setup: next }, guest),
  ).toThrow("房主");
  gateway.handle({ type: "game", token: owner.token, setup: next }, owner);
  expect(room.snapshot(guest.token)).toMatchObject({
    room: owner.room,
    kind: "ddz",
    state: null,
    actor: 1,
  });
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
it("rejects overcrowding atomically and accepts AI only in supported games", () => {
  const room = new Room("large", {
    kind: "uno",
    humans: 5,
    ai: [],
    team: false,
    training: false,
  });
  const tokens = Array.from({ length: 5 }, (_, i) => room.claim(String(i))),
    before = structuredClone(room.export());
  expect(() =>
    room.changeGame(
      tokens[0],
      setup(room, { ...room.config, kind: "fxq", humans: 4 }),
    ),
  ).toThrow("人数");
  expect(room.export()).toEqual(before);
  const aiRoom = new Room("ai", {
      kind: "sgs",
      humans: 1,
      ai: [{ name: "云雀", difficulty: "hard" }],
      team: true,
      training: false,
    }),
    owner = aiRoom.claim("甲");
  aiRoom.changeGame(
    owner,
    setup(aiRoom, { ...aiRoom.config, kind: "uno", team: false }),
  );
  expect(aiRoom.config).toMatchObject({
    team: false,
    humans: 1,
    ai: [{ name: "云雀", difficulty: "hard" }],
  });
  expect(() =>
    configSchema.parse({ ...aiRoom.config, kind: "ddz", humans: 2 }),
  ).toThrow();
  aiRoom.changeGame(
    owner,
    setup(aiRoom, { ...aiRoom.config, kind: "ddz", humans: 3, ai: [] }),
  );
  expect(aiRoom.config).toMatchObject({ humans: 3, ai: [] });
});
it("changes game and roster atomically while keeping the room invitation", () => {
  const room = new Room("roster", {
      kind: "uno",
      humans: 3,
      ai: [],
      team: false,
      training: false,
    }),
    owner = room.claim("甲"),
    guest = room.claim("乙"),
    removed = room.claim("丙");
  room.seats.forEach((s) => (s.ready = true));
  room.start(owner);
  const retain = room.seats.slice(0, 2).map((s) => s.id!),
    config = {
      ...room.config,
      kind: "sgs" as const,
      humans: 3,
      ai: [{ difficulty: "normal" as const, name: "测试AI" }],
    },
    before = structuredClone(room.export());
  expect(() =>
    room.changeGame(owner, setup(room, config, false, retain)),
  ).toThrow("结束");
  expect(room.export()).toEqual(before);
  room.changeGame(owner, setup(room, config, true, retain));
  expect(room.seats).toHaveLength(4);
  expect(room.identity(guest)).toBe(1);
  expect(() => room.identity(removed)).toThrow();
  expect(room.claim("丁")).toBeTypeOf("string");
  expect(room.snapshot(owner).records[0].config.kind).toBe("uno");
  expect(room.snapshot(owner).room).toBe("roster");
  const after = structuredClone(room.export());
  expect(() =>
    room.changeGame(
      owner,
      setup(room, { ...config, kind: "fxq", humans: 1 }, true),
    ),
  ).toThrow();
  expect(room.export()).toEqual(after);
});
