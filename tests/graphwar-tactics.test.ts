import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
import { configSchema } from "../src/domain/protocol";
import { Movement } from "../src/domain/graphwar/movement";
import {
  graphwarOptionsSchema,
  type GraphwarState,
} from "../src/domain/graphwar/types";
const create = () =>
  new GameEngine().create("graphwar", 2, "selection", false, {
    graphwar: graphwarOptionsSchema.parse({ map: "open", soldiers: 3 }),
  }) as GraphwarState;
it("uses an explicitly selected own soldier and rejects another owner or an eliminated unit", () => {
  const engine = new GameEngine(),
    s = create();
  const chosen = s.view.soldiers.find(
    (u) => u.player === 0 && u.id !== s.view.currentSoldier,
  )!;
  const after = engine.apply(
    s,
    0,
    { type: "graphwar-fire", soldier: chosen.id, formula: "0" },
    "a",
  ) as GraphwarState;
  const guarded = engine.apply(
    s,
    0,
    { type: "graphwar-guard", soldier: chosen.id },
    "guard",
  ) as GraphwarState;
  expect(
    guarded.view.soldiers.find((u) => u.id === chosen.id)!.guardUntil,
  ).toBeGreaterThan(0);
  expect(guarded.view.soldiers[0].guardUntil).toBe(0);
  expect(after.view.lastShot?.soldier).toBe(chosen.id);
  expect(after.view.lastShot?.points[0]).toEqual({ x: chosen.x, y: chosen.y });
  expect(() =>
    engine.apply(s, 0, { type: "graphwar-guard", soldier: 6 }, "a"),
  ).toThrow("自己的存活士兵");
  chosen.hp = 0;
  expect(() =>
    engine.apply(s, 0, { type: "graphwar-guard", soldier: chosen.id }, "a"),
  ).toThrow("自己的存活士兵");
});
it("returns a single shared movement verdict for preview and rules", () => {
  const s = create(),
    u = s.view.soldiers[0];
  u.x = -20;
  u.y = 0;
  const movement = new Movement(s.view, u.id);
  expect(movement.check({ x: -20, y: 2 }).allowed).toBe(true);
  expect(movement.check({ x: -15, y: 0 }).reason).toContain("距离");
  expect(movement.check({ x: 1, y: 0 }).allowed).toBe(false);
  s.view.terrain = [{ x: -19, y: 0, radius: 0.5 }];
  expect(new Movement(s.view, u.id).check({ x: -18, y: 0 }).reason).toContain(
    "障碍",
  );
});
it("keeps opening units alive and removes protection after every player acts", () => {
  const engine = new GameEngine(),
    s = create();
  s.view.soldiers = [s.view.soldiers[0], s.view.soldiers[3]];
  s.view.soldiers[0].x = -20;
  s.view.soldiers[0].y = 0;
  s.view.soldiers[1].x = 20;
  s.view.soldiers[1].y = 0;
  s.view.soldiers[1].hp = 2;
  const after = engine.apply(
    s,
    0,
    { type: "graphwar-fire", formula: "0" },
    "a",
  ) as GraphwarState;
  expect(after.view.soldiers[1].hp).toBe(1);
  expect(after.view.lastShot!.impacts[0].openingProtected).toBe(true);
  const next = engine.apply(
    after,
    1,
    { type: "graphwar-pass" },
    "b",
  ) as GraphwarState;
  const final = engine.apply(
    next,
    0,
    { type: "graphwar-fire", formula: "0" },
    "c",
  ) as GraphwarState;
  expect(final.view.soldiers[1].hp).toBe(0);
});
it("normalizes odd Graphwar rooms idempotently and preserves manual AIs", () => {
  const input = {
    kind: "graphwar",
    humans: 3,
    ai: [],
    team: false,
    training: false,
  };
  const config = configSchema.parse(input);
  expect(config.ai).toHaveLength(1);
  expect(config.ai[0].balance).toBe(true);
  expect(configSchema.parse(config)).toEqual(config);
  expect(configSchema.parse({ ...config, humans: 4 }).ai).toHaveLength(0);
  expect(configSchema.parse({ ...config, kind: "uno" }).ai).toHaveLength(0);
});
it("persists authoritative initial maps and verifies exact interaction source and target units", () => {
  const room = new Room(
    "units",
    { kind: "graphwar", humans: 2, ai: [], team: false, training: false },
    "layout",
  );
  const a = room.claim("A"),
    b = room.claim("B");
  room.setReady(b, true);
  room.start(a);
  const s = room.state as GraphwarState,
    from = s.view.soldiers[1],
    target = s.view.soldiers[4];
  const anchors = {
    game: "graphwar" as const,
    from: from.id,
    target: target.id,
  };
  const deadline = room.snapshot(a).turnDeadline;
  expect(room.interact(a, "one", 1, "egg", anchors)?.units).toEqual(anchors);
  expect(room.snapshot(a).turnDeadline).toBe(deadline);
  expect(() =>
    room.interact(a, "two", 1, "egg", { ...anchors, from: target.id }),
  ).toThrow("士兵");
  room.act(a, "fire", room.version, {
    type: "graphwar-fire",
    soldier: from.id,
    formula: "0",
  });
  room.end(a);
  const record = room.snapshot(a).replay!;
  expect(record.graphwarInitial?.soldiers).toEqual(s.view.soldiers);
  expect(new Replay(record).frames().at(-1)).toEqual(room.state);
  expect(
    new Replay({ ...record, seed: "different-generator-seed" }).frames().at(-1),
  ).toEqual(room.state);
});
