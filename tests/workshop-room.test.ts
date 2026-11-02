import { expect, it } from "vitest";
import {partyEconomy} from "../src/domain/party/model";
import { Room } from "../src/domain/room";
import { featuredWorkshopPacks } from "../src/domain/workshop/featured";
import { Replay } from "../src/domain/replay";
function table() {
  const room = new Room("workshop", {
      kind: "uno",
      humans: 2,
      ai: [],
      team: false,
      training: false,
      plugins: [featuredWorkshopPacks[0]],
      party: { enabled: true },
    }),
    a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  return { room, a, b };
}
it("插件版本整局锁定，未授权玩家不能更改房间插件，购买复用账本并保存自足的回放", () => {
  const { room, a, b } = table();
  expect(() =>
    room.partyAction(b, "plugins", { type: "plugins", packs: [] }),
  ).toThrow("房主");
  room.start(a);
  expect(() =>
    room.partyAction(a, "plugins", { type: "plugins", packs: [] }),
  ).toThrow("锁定");
  const action = {
    type: "buy-plugin" as const,
    pack: featuredWorkshopPacks[0].id,
    effect: "meteor-cats",
    target: 1,
    round: room.snapshot(a).party.round,
  };
  const event = room.partyAction(a, "cat", action);
  expect(event?.visual).toMatchObject({
    emoji: "🐈",
    duration: 12000,
    scope: "room",
  });
  room.partyAction(a, "cat", action);
  expect(room.snapshot(a).party.balances[room.seats[0].id!].coins).toBe(partyEconomy.initial - 12);
  const replay = room.export().replay!;
  expect(replay.party).toHaveLength(1);
  expect(() => new Replay(replay)).not.toThrow();
  const restored = Room.restore(room.export());
  expect(restored.snapshot(a).party.plugins).toEqual([
    featuredWorkshopPacks[0],
  ]);
  room.end(a);
  room.partyAction(a, "unload", { type: "plugins", packs: [] });
  expect(room.snapshot(a).party.plugins).toEqual([]);
});
