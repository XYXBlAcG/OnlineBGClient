import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { advanceArcade, chooseArcade, createArcade, settleArcade } from "../src/domain/arcade/campaign";
import { ArcadeSession } from "../src/domain/arcade/session";
import { arcadeOutcome } from "../src/domain/arcade/scenario";
import { Replay } from "../src/domain/replay";

it("pairs the humans against a separate guard team from a four-player room", () => {
  let room = new Room("co-op", {
    kind: "miner", arcade: true,
    arcadeSettings: { countdown: false, actionLimit: false, preferred: "graphwar" },
    humans: 4, ai: [], team: false, training: false,
  });
  const tokens = ["A", "B", "C", "D"].map((name) => room.claim(name));
  tokens.slice(1).forEach((token) => room.setReady(token, true));
  room.start(tokens[0]!);
  const archive = room.export();
  const run = archive.arcade!.run;
  chooseArcade(run, 4);
  settleArcade(run, true, "达标", "fixture");
  advanceArcade(run, 4);
  room = Room.restore(archive);
  tokens.forEach((token) => room.claim("", token));
  const route = room.snapshot(tokens[0]!).arcade!;
  const option = route.options.find(({ kind }) => kind === "graphwar")!;
  for (const token of tokens)
    room.arcadeAction(token, { type: "vote", run: route.id, stage: route.stage, option: option.id });
  const game = room.state;
  if (game?.kind !== "graphwar") throw Error("wrong game");
  expect(game.view.teams).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
  const bots = room.seats.map((seat) => !!seat.difficulty);
  const outcome = (winner: number) => arcadeOutcome(
    { ...game, view: { ...game.view, winner, finished: true } }, 0, bots, true,
  );
  expect(outcome(0).won).toBe(true);
  expect(outcome(1).won).toBe(false);
  expect(Room.restore(room.export()).state).toEqual(game);
  expect(new Replay(room.export().replay).frame(0)).toEqual(game);
});

it("allows a watching host to choose or skip before the last ready player advances", () => {
  const run = createArcade("co-op", 2, { countdown: false, actionLimit: false });
  chooseArcade(run, 2);
  settleArcade(run, true, "达标", "fixture");
  const session = new ArcadeSession({ id: "run", run, remainingMs: 0 });
  const ready = { type: "ready", run: "run", stage: 0 } as const;
  expect(session.apply(ready, 0, false, false, 2, [0, 1])).toBeUndefined();
  expect(session.apply(ready, 1, false, false, 2, [0, 1])).toBeUndefined();
  expect(session.apply({ ...ready, reward: "scout" }, -1, true, false, 2, [0, 1])).toBe("advance");
  expect(session.archive.reward).toBe("scout");
});
