import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
import { dominionOptionsSchema } from "../src/domain/dominion/types";
import { firstKingdom, type CardId } from "../src/domain/dominion/cards";
it("validates custom kingdoms and persists seeded setup across replay and room restoration", () => {
  expect(
    dominionOptionsSchema.safeParse({ mode: "custom", kingdom: ["copper"] })
      .success,
  ).toBe(false);
  const kingdom: CardId[] = [
    "witch",
    ...firstKingdom.filter((card) => card !== "militia"),
  ];
  const room = new Room("dom-room", {
    kind: "dominion",
    humans: 2,
    ai: [],
    team: false,
    training: false,
    dominion: { mode: "custom", kingdom },
  });
  const a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  room.start(a);
  expect(room.state?.kind).toBe("dominion");
  if (room.state?.kind !== "dominion") throw new Error("dominion");
  expect(room.state.view.kingdom).toEqual(kingdom);
  for (let step = 0; step < 4; step++) {
    const snapshot = room.snapshot(a),
      move = snapshot.candidates.find(
        (c) =>
          c.action.type === "dominion-action" && c.action.move.type === "end",
      )!;
    room.act(a, `end-${step}`, room.version, move.action);
    room.act(b, `other-${step}`, room.version, {
      type: "dominion-action",
      move: { type: "end" },
    });
  }
  expect(new Replay(room.export().replay!).frames().at(-1)).toEqual(room.state);
  const restored = Room.restore(room.export());
  expect(restored.state).toEqual(room.state);
});
