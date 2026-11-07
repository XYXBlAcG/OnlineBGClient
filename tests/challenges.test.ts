import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import {
  advanceChallenges,
  createChallengeBoard,
} from "../src/domain/challenges";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";

it("supports public deterministic contracts only for selected games", () => {
  expect(createChallengeBoard("uno", "seed", 4)).toBeNull();
  const a = createChallengeBoard("tq", "seed", 4);
  const b = createChallengeBoard("tq", "seed", 4);
  expect(a).toEqual(b);
  expect(a?.cards).toHaveLength(3);
  expect(Object.keys(a!.cards[0].progress)).toEqual(["0", "1", "2", "3"]);
});

it("updates progress and lets only a claimable actor claim first", () => {
  const engine = new GameEngine();
  const before = engine.create("tq", 2, "challenge-state");
  const board = createChallengeBoard("tq", "challenge-state", 2)!;
  const card = board.cards.find((item) => item.id === "tq-triple-jump")!;
  const action = { type: "tq-move" as const, route: [0, 2, 4, 6] };
  const hidden = advanceChallenges(
    board,
    before,
    before,
    0,
    action,
    2,
    false,
  )!;
  expect(hidden.cards.find((item) => item.id === card.id)?.progress["0"]).toBe(
    1,
  );
  expect(hidden.cards.find((item) => item.id === card.id)?.claimedBy).toBeNull();
  const claimed = advanceChallenges(
    board,
    before,
    before,
    0,
    action,
    2,
    true,
  )!;
  expect(claimed.cards.find((item) => item.id === card.id)).toMatchObject({
    claimedBy: 0,
    claimedVersion: 2,
  });
});

it("persists challenge state through room snapshots and replays", () => {
  const room = new Room("challenge", {
    kind: "tq",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  room.start(a);
  expect(room.snapshot(a).challenges?.cards).toHaveLength(3);
  room.end(a);
  const record = room.snapshot(a).replay!;
  expect(record.challenges?.cards).toHaveLength(3);
  expect(new Replay(record).record.challenges?.cards).toHaveLength(3);
});
