import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
it("persists actual map data and keeps legacy three-lane replays deterministic", () => {
  const room = new Room(
      "map-replay",
      { kind: "expedition", humans: 1, ai: [], team: false, training: false },
      "map-replay",
    ),
    token = room.claim("甲");
  room.start(token);
  const record = room.export().replay!;
  expect(record.expeditionMap).toBeDefined();
  expect(record.expeditionMap?.some((layer) => layer.length > 3)).toBe(true);
  const saved = structuredClone(record);
  saved.expeditionMap![0][0].kind = "shop";
  const replayed = new Replay(saved).frame(0);
  expect(replayed.kind === "expedition" && replayed.view.map).toEqual(
    saved.expeditionMap,
  );
  const old = structuredClone(record);
  delete old.expeditionMap;
  const legacy = new Replay(old).frame(0);
  expect(
    legacy.kind === "expedition" &&
      legacy.view.map.every((layer) => layer.length === 3),
  ).toBe(true);
  expect(Room.restore(room.export()).state).toEqual(room.state);
});
