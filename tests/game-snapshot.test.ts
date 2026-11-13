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

it("牌桌快照保留暂停与计时字段供牌桌统一判断可交互性", () => {
  const room = new Room("snapshot-paused", {
      kind: "expedition",
      humans: 2,
      ai: [],
      team: false,
      training: false,
    }),
    token = room.claim("测试玩家");
  room.claim("离线玩家");
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(token);
  room.seats[1].online = false;
  const snapshot = room.snapshot(token),
    game = toGameSnapshot(snapshot);
  expect(snapshot.paused).toBe(true);
  expect(game.paused).toBe(true);
  expect(game.turnDeadline).toBe(snapshot.turnDeadline);
  expect(game.serverTime).toBe(snapshot.serverTime);
});
