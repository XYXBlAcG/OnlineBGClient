import { expect, it } from "vitest";
import {
  readRoomPreset,
  saveRoomPreset,
} from "../src/client/lobby/room-preset";

function storage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    dump: () => data,
  };
}

it("round-trips a lobby preset through local storage", () => {
  const store = storage();
  saveRoomPreset(
    {
      kind: "expedition",
      humans: 2,
      ai: [{ difficulty: "hard", name: "青竹" }],
      team: false,
      aiDelayMs: 900,
    },
    store,
  );
  expect(readRoomPreset(store)).toEqual({
    kind: "expedition",
    humans: 2,
    ai: [{ difficulty: "hard", name: "青竹" }],
    team: false,
    aiDelayMs: 900,
  });
});

it("rejects corrupt or unknown presets and clamps unsafe values", () => {
  expect(readRoomPreset(storage())).toBeNull();
  expect(
    readRoomPreset(storage({ "onlinebg.room-preset": "{oops" })),
  ).toBeNull();
  expect(
    readRoomPreset(
      storage({ "onlinebg.room-preset": JSON.stringify({ kind: "nope" }) }),
    ),
  ).toBeNull();
  const clamped = readRoomPreset(
    storage({
      "onlinebg.room-preset": JSON.stringify({
        kind: "uno",
        humans: 99,
        ai: [{ difficulty: "impossible", name: "x" }],
        aiDelayMs: 99_999,
        team: true,
      }),
    }),
  );
  expect(clamped).toMatchObject({
    kind: "uno",
    humans: 8,
    ai: [],
    aiDelayMs: 5000,
    team: true,
  });
});
