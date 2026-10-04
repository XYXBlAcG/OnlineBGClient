import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { Gateway } from "../src/domain/gateway";

it("assigns monotonic message numbers beyond retention and preserves sender identity across restart", () => {
  const room = new Room("chat", {
    kind: "uno",
    humans: 2,
    ai: [],
    training: false,
    team: false,
  });
  const owner = room.claim("同名"),
    guest = room.claim("同名");
  for (let i = 0; i < 205; i++)
    room.chat(i % 2 ? guest : owner, String(i), "消息");
  expect(room.snapshot(owner).chat).toHaveLength(200);
  expect(room.snapshot(owner).chat.at(-1)).toMatchObject({
    sequence: 205,
    sender: room.seats[0].id,
    type: "text",
  });
  const restored = Room.restore(room.export());
  restored.chat(guest, "next", "恢复");
  expect(restored.snapshot(owner).chat.at(-1)).toMatchObject({
    sequence: 206,
    sender: room.seats[1].id,
  });
});
it("validates and deduplicates transient interactions without mutating game version or archive", () => {
  const gateway = new Gateway();
  const host = gateway.handle({
    type: "create",
    name: "甲",
    config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
  }).session;
  const guest = gateway.handle({
    type: "join",
    room: host.room,
    name: "乙",
  }).session;
  const room = gateway.rooms.get(host.room)!;
  const before = structuredClone(room.export());
  const command = {
    type: "interaction",
    token: host.token,
    id: "one",
    target: 1,
    kind: "egg",
  };
  expect(gateway.handle(command, host).response).toMatchObject({
    type: "interaction",
    event: { from: 0, target: 1, kind: "egg" },
  });
  expect(gateway.handle(command, host).response).toBeUndefined();
  expect(() => gateway.handle({ ...command, id: "two" }, host)).toThrow("稍后");
  expect(() =>
    gateway.handle({ ...command, id: "bad", target: 7 }, host),
  ).toThrow("目标");
  expect(room.version).toBe(before.version);
  expect(room.snapshot(guest.token).chat).toEqual([]);
  expect(Room.restore(room.export()).snapshot(guest.token).state).toBeNull();
});
