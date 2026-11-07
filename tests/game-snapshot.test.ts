import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { toGameSnapshot } from "../src/client/game-snapshot";

it("牌桌快照保留当前席位的合法候选动作", () => {
  const room = new Room("snapshot-candidates", {
      kind: "expedition",
      humans: 1,
      ai: [],
      team: false,
      training: false,
    }),
    token = room.claim("测试玩家");
  room.seats[0].ready = true;
  room.start(token);
  const snapshot = room.snapshot(token),
    game = toGameSnapshot(snapshot);
  expect(snapshot.candidates.length).toBeGreaterThan(0);
  expect(game.candidates).toBe(snapshot.candidates);
});
