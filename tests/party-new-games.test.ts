import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { putt } from "../src/domain/golf/physics";
import { classicGolfCourses } from "../src/domain/golf/courses";
import { Strategies } from "../src/domain/strategies";
import { actionSchema } from "../src/domain/actions";
import { arcadeOutcome } from "../src/domain/arcade/scenario";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
import { drawRevealMs, drawRoundMs } from "../src/domain/drawguess/types";
import { vi } from "vitest";

const engine = new GameEngine();

it("keeps drawing prompts private and combines stroke segments before undo", () => {
  let state = engine.create("drawguess", 3, "party");
  if (state.kind !== "drawguess" || state.mode !== "classic")
    throw new Error("wrong kind");
  const word = state.view.prompt!;
  expect(engine.project(state, 1)).not.toHaveProperty("view.prompt");
  expect(engine.project(state, -1)).not.toHaveProperty("view.prompt");
  expect(engine.project(state, 0)).toHaveProperty("view.prompt", word);
  const line = {
    type: "draw-stroke" as const,
    round: 0,
    id: "first",
    part: 0,
    ink: "blue" as const,
    points: [
      [5, 5],
      [10, 10],
    ] as [number, number][],
  };
  expect(() => engine.apply(state, 1, line, "stroke")).toThrow();
  state = engine.apply(state, 0, line, "stroke") as typeof state;
  state = engine.apply(
    state,
    0,
    { ...line, part: 1, points: [[30, 30]] },
    "stroke",
  ) as typeof state;
  expect(state.view.strokes[0].points).toEqual([
    [5, 5],
    [10, 10],
    [30, 30],
  ]);
  state = engine.apply(
    state,
    0,
    { type: "draw-undo", round: 0, id: "first" },
    "undo",
  ) as typeof state;
  expect(state.view.strokes).toEqual([]);
  expect(actionSchema.safeParse({ ...line, points: [[-1, 0]] }).success).toBe(
    false,
  );
});

it("scores each correct guess once, reveals the answer and rotates the artist", () => {
  let state = engine.create("drawguess", 3, "night");
  if (state.kind !== "drawguess" || state.mode !== "classic")
    throw new Error("wrong kind");
  const guess = {
    type: "draw-guess" as const,
    round: 0,
    text: state.view.prompt!,
  };
  state = engine.apply(state, 1, guess, "correct") as typeof state;
  expect(engine.actors(state)).toEqual([0, 2]);
  expect(() => engine.apply(state, 1, guess, "again")).toThrow();
  expect(engine.project(state, 2)).not.toHaveProperty("view.prompt");
  state = engine.apply(state, 2, guess, "correct") as typeof state;
  expect(state.view.phase).toBe("reveal");
  expect(state.view.scores).toEqual([2, 3, 2]);
  state = engine.resolve(state, "next") as typeof state;
  expect(state.view.artist).toBe(1);
  expect(state.view.phase).toBe("drawing");
  expect(() => engine.apply(state, 0, guess, "old")).toThrow();
});

it("plays an original golf hole deterministically and scores the result for the expedition", () => {
  const course = classicGolfCourses[0]!;
  const strength = 0.78;
  const sample = putt(course, course.tee, 0, strength);
  expect(sample).toEqual(putt(course, course.tee, 0, strength));
  expect(sample.frames.length).toBeGreaterThan(3);
  const first = engine.create("golf", 2, "outdoor", false, {
    arcadeScenario: { kind: "golf", noActionCap: true },
  });
  const action = {
    type: "golf-putt" as const,
    hole: 0,
    previousStrokes: 0,
    aim: 0,
    power: strength,
  };
  const next = engine.apply(first, 0, action, "shot");
  if (next.kind !== "golf") throw new Error("wrong kind");
  expect(next.view.players[0].strokes).toBe(1);
  expect(next.view.players[0].lastShot?.frames).toEqual(sample.frames);
  expect(next.view.players[1].position).toEqual(course.tee);
  expect(arcadeOutcome(next, 1, [false, true], false).won).toBe(sample.sunk);
  const ai = new Strategies()
    .select("golf")
    .decide(next, 1, "normal", "golf-player");
  expect(actionSchema.parse(ai.chosen)).toMatchObject({
    type: "golf-putt",
    hole: 0,
  });
  expect(() => engine.apply(next, 1, { ...action, hole: 1 }, "old")).toThrow();
  const slow = { ...action, power: 0.12 };
  const firstStroke = engine.apply(first, 0, slow, "slow");
  expect(() => engine.apply(firstStroke, 0, slow, "duplicate")).toThrow(
    "球已移动",
  );
});

it("publishes simultaneous golf shots from the same room version without moving a rival ball", () => {
  const room = new Room(
    "golf-room",
    { kind: "golf", humans: 2, ai: [], team: false, training: false },
    "hole",
  );
  const first = room.claim("房主");
  const second = room.claim("朋友");
  room.setReady(second, true);
  room.start(first);
  const shot = {
    type: "golf-putt" as const,
    hole: 0,
    previousStrokes: 0,
    aim: 0,
    power: 0.2,
  };
  const start = room.snapshot(first).version;
  room.act(first, "first-shot", start, shot);
  room.act(second, "second-shot", start, shot);
  expect(room.snapshot(first).state).toMatchObject({
    view: { players: [{ strokes: 1 }, { strokes: 1 }] },
  });
  expect(() => room.act(first, "stale-shot", start, shot)).toThrow("球已移动");
});

it("keeps the drawing deadline while strokes arrive and replays a completed party", () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date(2026, 0, 1));
    let room = new Room(
      "draw-room",
      { kind: "drawguess", humans: 3, ai: [], team: false, training: false },
      "drawing",
    );
    const artist = room.claim("画手");
    const guesser = room.claim("朋友");
    const other = room.claim("队友");
    room.setReady(guesser, true);
    room.setReady(other, true);
    room.start(artist);
    const { turnDeadline, version } = room.snapshot(artist);
    expect(turnDeadline).toBe(Date.now() + drawRoundMs);
    const round = 0;
    const stroke = {
      type: "draw-stroke" as const,
      round,
      id: "stroke",
      ink: "blue" as const,
      part: 0,
      points: [[30, 40]] as [number, number][],
    };
    vi.advanceTimersByTime(4000);
    room.act(artist, "draw-first", version, stroke);
    expect(room.snapshot(guesser).turnDeadline).toBe(turnDeadline);
    expect(room.snapshot(guesser)).toMatchObject({
      state: { view: { strokes: [{ points: [[30, 40]] }] } },
      replay: null,
    });
    const saved = room.export();
    room = Room.restore(saved);
    room.claim("画手", artist);
    room.claim("朋友", guesser);
    room.claim("队友", other);
    expect(room.snapshot(guesser).state?.view).not.toHaveProperty("prompt");
    expect(room.snapshot(guesser).state).toMatchObject({
      view: { strokes: [{ id: "stroke" }] },
    });
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(drawRoundMs);
      expect(room.resolveIfDue()).toBe(true);
      expect(room.snapshot(guesser).state).toMatchObject({
        view: { round: i, phase: "reveal" },
      });
      vi.advanceTimersByTime(drawRevealMs);
      expect(room.resolveIfDue()).toBe(true);
    }
    const final = room.snapshot(artist);
    expect(final.finished).toBe(true);
    const replay = new Replay(final.replay);
    expect(replay.frame(1)).toMatchObject({
      view: { strokes: [{ id: "stroke" }] },
    });
    expect(replay.frame(replay.record.events.length)).toEqual(
      room.export().checkpoint?.state,
    );
  } finally {
    vi.useRealTimers();
  }
});
