import { POOL_PLAYBACK_RATE } from "../src/domain/pool/types";
import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";

it("runs a pool break through the authoritative room and records the shot", () => {
  const room = new Room("pool-room", {
    kind: "pool",
    humans: 2,
    ai: [],
    team: false,
    training: false,
    pool: { mode: "eight-ball", shotSeconds: 60, assist: true },
  });
  const tokens = [room.claim("甲"), room.claim("乙")];
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  room.act(tokens[0], "pool-break", room.version, {
    type: "pool-shot",
    aim: 0,
    power: 0.8,
    spin: { x: 0, y: 0 },
  });
  expect(room.state?.kind).toBe("pool");
  const record = room.export().replay;
  expect(record).not.toBeNull();
  const event = record!.events.find(
    (item) => item.type === "action" && item.action.type === "pool-shot",
  );
  expect(event?.type).toBe("action");
  if (event?.type === "action") expect(event.poolShot).toBeDefined();
  const frames = new Replay(record!).frames();
  expect(frames.at(-1)?.kind).toBe("pool");
});

it("waits for shot playback before accepting another shot or requesting AI", async () => {
  const { vi } = await import("vitest");
  const now = vi.spyOn(Date, "now").mockReturnValue(10000);
  try {
    const room = new Room("shot-delay", {
      kind: "pool",
      humans: 2,
      ai: [],
      team: false,
      training: false,
    });
    const tokens = [room.claim("甲"), room.claim("乙")];
    room.seats.forEach((seat) => (seat.ready = true));
    room.start(tokens[0]);
    const action = {
      type: "pool-shot" as const,
      aim: 0,
      power: 0.05,
      spin: { x: 0, y: 0 },
    };
    room.act(tokens[0], "first", room.version, action);
    if (room.state?.kind !== "pool") throw Error("状态错误");
    const turn = room.state.view.turn;
    expect(() =>
      room.act(tokens[turn], "too-soon", room.version, action),
    ).toThrow("等待");
    room.seats[turn].difficulty = "normal";
    expect(room.aiRequest()).toBeNull();
    const duration = room.state.view.lastShot!.frames.at(-1)!.t;
    expect(room.snapshot(tokens[0]).turnDeadline).toBeGreaterThanOrEqual(
      10000 + duration / POOL_PLAYBACK_RATE + 60000,
    );
    now.mockReturnValue(10000 + duration + 1000);
    expect(room.aiRequest()).not.toBeNull();
  } finally {
    now.mockRestore();
  }
});

it("uses selected nine-ball settings in room starts, replay and restoration", () => {
  const room = new Room("nine-room", {
    kind: "pool",
    humans: 2,
    ai: [],
    team: false,
    training: false,
    pool: { mode: "nine-ball", shotSeconds: 45, assist: false },
  });
  const tokens = [room.claim("甲"), room.claim("乙")];
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  if (room.state?.kind !== "pool") throw Error("状态错误");
  expect(room.state.view.mode).toBe("nine-ball");
  expect(room.state.view.options).toEqual({
    mode: "nine-ball",
    shotSeconds: 45,
    assist: false,
  });
  room.act(tokens[0], "break-nine", room.version, {
    type: "pool-shot",
    aim: 0,
    power: 0.7,
    spin: { x: 0, y: 0 },
  });
  const archive = room.export();
  expect(
    new Replay(archive.replay!).frame(archive.replay!.events.length),
  ).toEqual(room.state);
  const { checkpoint, ...withoutCheckpoint } = archive;
  expect(Room.restore(withoutCheckpoint).state).toEqual(room.state);
});
