import { expect, it, vi } from "vitest";
import { Room } from "../src/domain/room";
import { commandSchema, configSchema } from "../src/domain/protocol";
import { Replay } from "../src/domain/replay";
import { type GraphwarState } from "../src/domain/graphwar/types";

function create() {
  const room = new Room(
    "graph",
    {
      kind: "graphwar",
      humans: 2,
      ai: [],
      team: false,
      training: false,
      graphwar: {
        map: "open",
        mode: "demolition",
        soldiers: 1,
        preview: false,
        turnSeconds: 45,
      },
    },
    "room",
  );
  const tokens = [room.claim("Alice"), room.claim("Bob")];
  room.seats[1].ready = true;
  room.start(tokens[0]);
  return { room, tokens };
}
it("owns options, action deduplication, timeout and replay including authoritative trajectories", () => {
  vi.useFakeTimers();
  try {
    const { room, tokens } = create();
    expect((room.state as GraphwarState).view.options.preview).toBe(false);
    const version = room.version;
    room.act(tokens[0], "shot", version, {
      type: "graphwar-fire",
      formula: "sin(x)",
    });
    room.act(tokens[0], "shot", version, {
      type: "graphwar-fire",
      formula: "sin(x)",
    });
    expect(room.version).toBe(version + 1);
    const v = room.version;
    expect(room.resolveIfDue(Date.now() + 44000)).toBe(false);
    expect(room.resolveIfDue(Date.now() + 45001)).toBe(true);
    expect(room.version).toBe(v + 1);
    room.end(tokens[0]);
    const record = room.snapshot(tokens[0]).replay!;
    expect(
      record.events[0].type === "action" && record.events[0].graphwarShot,
    ).toEqual((new Replay(record).frames()[1] as GraphwarState).view.lastShot);
    expect(new Replay(record).frames().at(-1)).toEqual(room.state);
    const altered = structuredClone(record);
    if (altered.events[0].type === "action")
      altered.events[0].graphwarShot!.actor = 1;
    expect(() => new Replay(altered).frames()).toThrow();
  } finally {
    vi.useRealTimers();
  }
});
it("pauses disconnected turns and restarts their time allowance on reconnection", () => {
  vi.useFakeTimers();
  try {
    const { room, tokens } = create();
    room.disconnect(tokens[1]);
    vi.advanceTimersByTime(90000);
    expect(room.resolveIfDue()).toBe(false);
    room.claim("Bob", tokens[1]);
    expect(room.resolveIfDue()).toBe(false);
    vi.advanceTimersByTime(45001);
    expect(room.resolveIfDue()).toBe(true);
    const state = structuredClone(room.state);
    const restored = Room.restore(room.export());
    expect(restored.state).toEqual(state);
  } finally {
    vi.useRealTimers();
  }
});
it("switches the same room to Graphwar and retains human identities", () => {
  const room = new Room("switch", {
    kind: "uno",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const tokens = [room.claim("Alice"), room.claim("Bob")];
  const members = room.seats.map((s) => s.id!);
  room.changeGame(tokens[0], {
    config: new Room("next", { ...room.config, kind: "graphwar" }).config,
    retain: members,
    members,
    endCurrent: false,
  });
  expect(room.snapshot(tokens[1]).kind).toBe("graphwar");
  room.seats[1].ready = true;
  room.start(tokens[0]);
  expect(room.snapshot(tokens[1]).state?.kind).toBe("graphwar");
});

it("supports twelve members through room, protocol, interaction and replay without widening other games", () => {
  const config = {
    kind: "graphwar" as const,
    humans: 12,
    ai: [],
    team: false,
    training: false,
  };
  const room = new Room("twelve", config, "twelve");
  const tokens = Array.from({ length: 12 }, (_, i) => room.claim(`玩家${i}`));
  for (const seat of room.seats) seat.ready = true;
  room.start(tokens[0]);
  expect(room.snapshot(tokens[11]).state?.kind).toBe("graphwar");
  expect(
    commandSchema.parse({
      type: "seat",
      token: tokens[0],
      index: 11,
      config: { type: "human" },
    }).type,
  ).toBe("seat");
  expect(
    commandSchema.safeParse({
      type: "interaction",
      token: tokens[0],
      id: "egg",
      kind: "egg",
      target: 11,
    }).success,
  ).toBe(true);
  for (let i = 0; i < 12; i++)
    room.act(tokens[i], `pass:${i}`, room.version, { type: "graphwar-pass" });
  room.act(tokens[0], "guard", room.version, { type: "graphwar-guard" });
  room.act(tokens[1], "fire", room.version, {
    type: "graphwar-fire",
    formula: "0",
  });
  room.end(tokens[0]);
  const record = room.snapshot(tokens[0]).replay!;
  expect(record.names).toHaveLength(12);
  expect(new Replay(record).frames().at(-1)).toEqual(room.state);
  expect(() => new Replay({ ...record, rulesVersion: "1" })).toThrow(
    "原记录保留",
  );
  expect(configSchema.safeParse({ ...config, kind: "uno" }).success).toBe(
    false,
  );
});
