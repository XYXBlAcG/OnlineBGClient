import { afterEach, expect, it, vi } from "vitest";
import { Room } from "../src/domain/room";
import { parseChatCommand } from "../src/domain/banner";

const create = () => {
  const room = new Room("party", {
    kind: "uno",
    humans: 3,
    ai: [],
    training: false,
    team: false,
  });
  const host = room.claim("房主"),
    guest = room.claim("甲"),
    other = room.claim("乙");
  return { room, host, guest, other };
};
afterEach(() => vi.useRealTimers());
it("parses bounded text and catalogue effects without interpreting ordinary chat", () => {
  expect(parseChatCommand("你好")).toBeNull();
  expect(parseChatCommand("/title 好牌！")).toEqual({
    kind: "title",
    text: "好牌！",
  });
  expect(parseChatCommand("/effect 🤣")).toMatchObject({
    kind: "effect",
    effect: "laugh",
  });
  expect(() => parseChatCommand("/effect xxx")).toThrow();
  expect(() => parseChatCommand("/title " + "字".repeat(41))).toThrow();
});
it("enforces host and designated stable member ids on the authority, including revocation", () => {
  const { room, host, guest, other } = create();
  expect(() => room.chat(guest, "a", "/title hi")).toThrow("授权");
  expect(() =>
    room.setBannerPolicy(guest, { mode: "all", members: [] }),
  ).toThrow("房主");
  room.setBannerPolicy(host, {
    mode: "selected",
    members: [room.seats[1].id!],
  });
  room.chat(guest, "b", "/effect 🤣");
  expect(room.snapshot(other).chat.at(-1)).toMatchObject({
    type: "banner",
    banner: { effect: "laugh" },
  });
  room.setBannerPolicy(host, { mode: "host", members: [] });
  expect(() => room.chat(guest, "c", "/title hi")).toThrow("授权");
  const restored = Room.restore(room.export());
  expect(restored.snapshot(host).bannerPolicy).toEqual({
    mode: "host",
    members: [],
  });
});
it("deduplicates retries before cooldown and never increments the game version", () => {
  vi.useFakeTimers();
  vi.setSystemTime(20000);
  const { room, host } = create();
  const before = room.version;
  room.chat(host, "one", "/title hello");
  room.chat(host, "one", "/title hello");
  expect(room.snapshot(host).chat).toHaveLength(1);
  expect(() => room.chat(host, "two", "/title hello")).toThrow("稍后");
  vi.advanceTimersByTime(10000);
  room.chat(host, "two", "/title hello");
  expect(room.version).toBe(before);
});
it("stores banner annotations separately so game replay frames stay deterministic", () => {
  const room = new Room("replay", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
  });
  const host = room.claim("我");
  room.start(host);
  room.chat(host, "banner", "/effect 🤡");
  room.end(host);
  const replay = room.snapshot(host).replay!;
  expect(replay.social).toEqual([
    {
      frame: 0,
      name: "我",
      banner: { kind: "effect", effect: "clown", text: "小丑派对" },
    },
  ]);
  expect(replay.events).toEqual([]);
  expect(Room.restore(room.export()).snapshot(host).replay?.social).toEqual(
    replay.social,
  );
});
it("lets guests roll for fun but reserves clear for the host and records fixed results", () => {
  const { room, host, guest } = create();
  room.setReady(guest, true);
  room.setReady(room.seats[2].token!, true);
  room.start(host);
  room.chat(guest, "roll", "/roll 2d6");
  const result = room.snapshot(host).chat.at(-1)!;
  expect(result).toMatchObject({ type: "roll", sides: 6 });
  if (result.type !== "roll") throw new Error("wrong type");
  expect(result.results).toHaveLength(2);
  expect(result.results.every((value) => value >= 1 && value <= 6)).toBe(true);
  room.chat(guest, "roll", "/roll 2d6");
  expect(room.snapshot(host).chat).toHaveLength(1);
  expect(() => room.chat(guest, "clear", "/clearbanner")).toThrow("房主");
  room.chat(host, "clear", "/clearbanner");
  room.end(host);
  const replay = room.snapshot(host).replay!;
  expect(
    replay.social?.some(
      (event) => "message" in event && event.message.type === "roll",
    ),
  ).toBe(true);
  expect(Room.restore(room.export()).snapshot(host).chat[0]).toEqual(result);
});

it("preserves explicit banner colors through authority snapshots and room restore", () => {
  const { room, host, guest } = create();
  room.chat(host, "colored", "/title --color #6633ff 好牌");
  expect(room.snapshot(guest).chat.at(-1)).toMatchObject({
    type: "banner",
    banner: { color: "#6633ff", text: "好牌" },
  });
  expect(Room.restore(room.export()).snapshot(host).chat.at(-1)).toMatchObject({
    banner: { color: "#6633ff" },
  });
});
