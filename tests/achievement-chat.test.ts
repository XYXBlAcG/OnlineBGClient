import { expect, it } from "vitest";
import { commandSchema } from "../src/domain/protocol";
import { Room } from "../src/domain/room";

it("accepts achievement chat commands from room clients", () => {
  expect(
    commandSchema.safeParse({
      type: "achievement-chat",
      token: "token",
      id: "achievement-1",
      achievementId: "uno.pure-color",
    }).success,
  ).toBe(true);
});

it("publishes a deduplicated system chat message for game achievements", () => {
  const room = new Room("achievement-chat", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "normal", name: "" }],
    team: false,
    training: false,
  });
  const token = room.claim("甲");
  room.achievementChat(token, "achievement-1", "uno.pure-color");
  room.achievementChat(token, "achievement-1", "uno.pure-color");
  const messages = room
    .snapshot(token)
    .chat.filter((message) => message.id === "achievement-1");
  expect(messages).toHaveLength(1);
  expect(messages[0]).toMatchObject({
    type: "achievement",
    name: "甲",
    text: "甲 达成了「纯色胜利」成就",
    achievementId: "uno.pure-color",
    title: "纯色胜利",
    rarity: "legendary",
    symbol: "🃏",
    game: "uno",
  });
  expect(messages[0].sender).not.toBe("system");
  expect(() =>
    room.achievementChat(token, "achievement-2", "fxq.three-sixes"),
  ).toThrow("成就不属于当前游戏");
});
