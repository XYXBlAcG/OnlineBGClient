import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
import { classicGolfCourses } from "../src/domain/golf/courses";
import { gameSeatMinimum } from "../src/domain/catalogue";

function start(kind: "drawguess" | "golf") {
  const room = new Room("review", {
    kind, humans: 2, ai: [], team: false, training: false, drawguess: { mode: "fayu" },
  }, "old-golf-3");
  const host = room.claim("A");
  const guest = room.claim("B");
  room.setReady(guest, true);
  room.start(host);
  return { room, host, guest };
}

it("opens prior standalone Fayu archives and translates old playback actions", () => {
  const { room, host, guest } = start("drawguess");
  for (let i = 0; i < 3; i++) expect(room.resolveIfDue(Date.now() + 600_000)).toBe(true);
  room.act(host, "finish", room.version, { type: "draw-end", round: 0 });
  const current = room.export();
  const stored = JSON.parse(JSON.stringify(current));
  stored.config.kind = stored.replay.config.kind = stored.checkpoint.state.kind = "fayu";
  delete stored.config.drawguess;
  delete stored.replay.config.drawguess;
  delete stored.checkpoint.state.mode;
  stored.replay.rulesVersion = "1";
  stored.replay.fayuStart = stored.replay.drawStart;
  delete stored.replay.drawStart;
  stored.replay.events.at(-1).action.type = "fayu-end";
  const replay = new Replay(stored.replay);
  expect(replay.frame(replay.record.events.length)).toEqual(room.state);
  expect(Room.restore(stored).state).toEqual(room.state);
  expect(stored.replay.config.kind).toBe("fayu");
  expect(guest).toBeTruthy();
});

it("derives the minimum for both drawing modes from one definition", () => {
  expect(gameSeatMinimum("drawguess", "fayu")).toBe(2);
  expect(gameSeatMinimum("drawguess", "classic")).toBe(3);
});

it("restores old golf checkpoints and plays their original three-hole course", () => {
  const { room, host, guest } = start("golf");
  const saved = room.export();
  if (saved.checkpoint?.state.kind !== "golf" || !saved.replay) throw Error();
  saved.checkpoint.state.view.holes = 3;
  saved.checkpoint.state.view.players.forEach((player) => { player.position = classicGolfCourses[0]!.tee; });
  Reflect.deleteProperty(saved.checkpoint.state.view, "courses");
  Reflect.deleteProperty(saved.replay, "golfCourses");
  const replay = new Replay(saved.replay).frame(0);
  expect(replay).toMatchObject({ view: { holes: 3, courses: classicGolfCourses } });
  const restored = Room.restore(saved);
  restored.claim("A", host);
  restored.claim("B", guest);
  restored.act(host, "stroke", restored.version, {
    type: "golf-putt", hole: 0, previousStrokes: 0, aim: 0, power: 0.5,
  });
  expect(restored.state).toMatchObject({ view: { players: [{ strokes: 1 }, { strokes: 0 }] } });
});

it("pins a new golf match to the exact course recorded by the room", () => {
  const { room } = start("golf");
  const record = room.export().replay!;
  expect(record.golfCourses).toHaveLength(5);
  expect(new Replay(record).frame(0)).toEqual(room.state);
});
