import { expect, it } from "vitest";
import { tableInteractive } from "../src/client/game-sizing/table-state";

it("keeps a running local table interactive", () => {
  expect(tableInteractive({ actor: 0, finished: false }, false)).toBe(true);
});

it("stops local actions while the room is paused", () => {
  expect(
    tableInteractive({ actor: 0, finished: false, paused: true }, false),
  ).toBe(false);
});

it("stops local actions for replays, finished games, and spectators", () => {
  expect(tableInteractive({ actor: 0, finished: false }, true)).toBe(false);
  expect(tableInteractive({ actor: 0, finished: true }, false)).toBe(false);
  expect(tableInteractive({ actor: -2, finished: false }, false)).toBe(false);
});
