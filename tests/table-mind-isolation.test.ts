import { expect, it, vi } from "vitest";
import { RoomTableMinds } from "../src/server/table-mind/rooms";
import {
  TableMind,
  type TableMindRoom,
  type TableMindRunner,
} from "../src/server/table-mind/runtime";
import {
  defaultCompanionConfig,
  defaultAiProviderSettings,
} from "../src/domain/companion";
const makeRoom = (id: string): TableMindRoom => ({
  id,
  hasEnded: false,
  paused: false,
  version: 1,
  playId: "play-1",
  config: {
    companion: {
      ...structuredClone(defaultCompanionConfig),
      policy: {
        ...defaultCompanionConfig.policy,
        enabled: true,
        cooldownMs: 0,
      },
    },
  },
  companionProfile: () => ({
    id: "ai",
    name: "小青",
    avatar: "🤖",
    persona: "简短回复",
    source: { kind: "local" },
  }),
  publicContext: () => ({
    game: "UNO",
    phase: "playing",
    players: ["甲"],
    recentChat: [],
  }),
  drainTableEvents: () => [],
  addCompanionMessage: vi.fn(),
});
const runner = (): TableMindRunner => ({
  configured: true,
  settings: { ...defaultAiProviderSettings, model: "test" },
  configure() {},
  clear() {},
  complete: vi.fn(async () => "收到"),
});
it("keeps model and public memory scoped to individual room instances", async () => {
  const rooms = new RoomTableMinds({}, () => new TableMind(runner()));
  const a = makeRoom("a"),
    b = makeRoom("b");
  a.drainTableEvents = () => [
    {
      id: "a1",
      kind: "chat",
      label: "ROOM_A_MARKER",
      public: true,
      at: 1,
      seq: 1,
      version: 1,
    },
  ];
  await rooms.get(a).tick(a);
  expect(rooms.get(a)).not.toBe(rooms.get(b));
  expect(rooms.get(b).timeline).toEqual([]);
  expect(rooms.get(b).memory.recall()).toEqual([]);
});
it("does not remember private events", async () => {
  const room = makeRoom("a");
  room.drainTableEvents = () => [
    {
      id: "p1",
      kind: "chat",
      label: "PRIVATE",
      public: false,
      at: 1,
      seq: 1,
      version: 1,
    },
  ];
  const mind = new TableMind(runner());
  await mind.tick(room);
  expect(mind.timeline).toEqual([]);
  expect(mind.memory.recall()).toEqual([]);
});
it("discards an old play reply and clears its memory on changing games", async () => {
  const room = makeRoom("a");
  room.drainTableEvents = () => [
    {
      id: "c1",
      kind: "chat",
      label: "@小青 旧局消息",
      public: true,
      at: 1,
      seq: 1,
      version: 1,
    },
  ];
  const r = runner();
  let resolve!: (reply: string) => void;
  r.complete = () =>
    new Promise((done) => {
      resolve = done;
    });
  const mind = new TableMind(r);
  const pending = mind.tick(room);
  Object.assign(room, { playId: "play-2", drainTableEvents: () => [] });
  mind.reconcile(room);
  resolve("旧局结果");
  await pending;
  expect(room.addCompanionMessage).not.toHaveBeenCalled();
  expect(mind.memory.recall()).toEqual([]);
});
