import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { recordSeriesRound } from "../src/domain/series";

it("accumulates same-game wins, draws, and resets when the game changes", () => {
  expect(recordSeriesRound(null, "uno", 2, [0])).toEqual({
    kind: "uno",
    rounds: 1,
    wins: [1, 0],
    draws: 0,
  });
  const second = recordSeriesRound(
    recordSeriesRound(null, "uno", 2, [0]),
    "uno",
    2,
    [1],
  );
  expect(second).toMatchObject({ rounds: 2, wins: [1, 1], draws: 0 });
  expect(recordSeriesRound(second, "uno", 2, [])).toMatchObject({
    rounds: 3,
    wins: [1, 1],
    draws: 1,
  });
  expect(recordSeriesRound(second, "ddz", 3, [2])).toEqual({
    kind: "ddz",
    rounds: 1,
    wins: [0, 0, 1],
    draws: 0,
  });
});

it("exposes a series once a room starts and keeps it across archives", () => {
  const room = new Room("series", {
    kind: "uno",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const first = room.claim("甲");
  const second = room.claim("乙");
  room.setReady(second, true);
  room.start(first);
  expect(room.snapshot(first).series).toEqual({
    kind: "uno",
    rounds: 0,
    wins: [0, 0],
    draws: 0,
  });
  room.series = recordSeriesRound(room.series, "uno", 2, [1]);
  const restored = Room.restore(room.export());
  expect(restored.snapshot(first).series).toEqual({
    kind: "uno",
    rounds: 1,
    wins: [0, 1],
    draws: 0,
  });
});
