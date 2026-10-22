import { expect, it } from "vitest";
import { avatarSchema } from "../src/domain/avatar";
import { Gateway } from "../src/domain/gateway";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
it("accepts one Han character or one complete emoji grapheme", () => {
  for (const value of ["曹", "龍", "𠀀", "🤓", "👨‍👩‍👧‍👦", "👍🏽", "🇨🇳", "1️⃣", "❤️"])
    expect(avatarSchema.parse(value)).toBe(value);
  for (const value of [
    "",
    "张飞",
    "😎😎",
    "A",
    "1",
    "😎A",
    "<",
    "\u200D",
    "\uFE0F",
  ])
    expect(avatarSchema.safeParse(value).success).toBe(false);
});
it("shares avatars through authenticated rooms, reconnects, game changes and replays", () => {
  const gateway = new Gateway();
  const owner = gateway.handle({
    type: "create",
    name: "甲",
    avatar: "曹",
    config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
  });
  const guest = gateway.handle({
    type: "join",
    room: owner.session.room,
    name: "乙",
    avatar: "👨‍👩‍👧‍👦",
  });
  const room = gateway.rooms.get(owner.session.room)!;
  gateway.handle(
    { type: "avatar", token: guest.session.token, avatar: "🤓" },
    guest.session,
  );
  expect(room.snapshot(owner.session.token).seats.map((s) => s.avatar)).toEqual(
    ["曹", "🤓"],
  );
  expect(() =>
    gateway.handle(
      { type: "avatar", token: owner.session.token, avatar: "😎" },
      guest.session,
    ),
  ).toThrow("身份");
  room.setReady(guest.session.token, true);
  room.start(owner.session.token);
  expect(new Replay(room.export().replay!).record.avatars).toEqual([
    "曹",
    "🤓",
  ]);
  const restored = Room.restore(room.export());
  restored.claim("乙", guest.session.token, "😎");
  expect(restored.snapshot(guest.session.token).seats[1].avatar).toBe("🤓");
  room.changeGame(owner.session.token, {
    config: { ...room.config, kind: "dy" },
    members: room.seats.map((s) => s.id!),
    retain: room.seats.map((s) => s.id!),
    endCurrent: true,
  });
  expect(room.snapshot(owner.session.token).seats[1].avatar).toBe("🤓");
});
