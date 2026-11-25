import { expect, it } from "vitest";
import { adjacentReplay, replayPlaylist } from "../src/client/replay-playlist";
import { replaySchema } from "../src/domain/replay";
const record = (room: string, startedAt: number) =>
  replaySchema.parse({
    format: 1,
    room,
    startedAt,
    config: { kind: "uno", humans: 2, ai: [], team: false, training: false },
    rulesVersion: "2",
    names: ["甲", "乙"],
    seed: "test",
    events: [],
  });
it("orders a room series without including other rooms or wrapping at the ends", () => {
  const a = record("one", 1),
    b = record("one", 2),
    c = record("two", 3);
  expect(replayPlaylist([b, c, a], a)).toEqual([a, b]);
  expect(adjacentReplay([b, c, a], a, 1)).toEqual(b);
  expect(adjacentReplay([b, c, a], a, -1)).toBeUndefined();
  expect(adjacentReplay([b, c, a], b, 1)).toBeUndefined();
});

it("groups a continued expedition by run identity across rooms", () => {
  const a = {
    ...record("one", 1),
    config: { ...record("one", 1).config, kind: "expedition" as const },
    expeditionRunId: "shared",
  };
  const b = { ...a, room: "two", startedAt: 2 };
  const c = { ...a, startedAt: 3, expeditionRunId: "different" };
  expect(replayPlaylist([c, b, a], a)).toEqual([a, b]);
});

it("keeps mixed arcade replays together and excludes normal matches from the same room", () => {
  const first = { ...record("one", 1), arcadeRunId: "chapter-one" };
  const second = {
    ...record("one", 2),
    config: { ...record("one", 2).config, kind: "miner" as const },
    arcadeRunId: "chapter-one",
  };
  const other = { ...record("one", 3), arcadeRunId: "chapter-two" };
  const normal = record("one", 4);
  const records = [normal, second, other, first];
  expect(replayPlaylist(records, first)).toEqual([first, second]);
  expect(adjacentReplay(records, first, 1)).toBe(second);
  expect(replayPlaylist(records, normal)).toEqual([normal]);
});
