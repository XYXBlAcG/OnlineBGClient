import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import {
  graphwarOptionsSchema,
  type GraphwarState,
} from "../src/domain/graphwar/types";
import { balance, battlefields } from "../src/domain/graphwar/balance";
import { traceShot, containsTerrain } from "../src/domain/graphwar/trajectory";
import { battlefieldQuality } from "../src/domain/graphwar/map";
import { BattlefieldIndex } from "../src/domain/graphwar/trajectory";
import { shotDamage } from "../src/domain/graphwar/damage";
function scene(): GraphwarState {
  const state = new GameEngine().create("graphwar", 4, "balance", false, {
    graphwar: graphwarOptionsSchema.parse({ map: "open", soldiers: 1 }),
  }) as GraphwarState;
  state.view.soldiers = [0, 1, 2, 3].map((player) => ({
    id: player,
    player,
    x: [-30, 0, 10, 20][player],
    y: 0,
    hp: balance.hp,
    guardUntil: 0,
  }));
  state.view.currentSoldier = 0;
  return state;
}
it("uses real arc length and energy loss without full-health one-shot kills", () => {
  const v = scene().view;
  const shot = traceShot(v, 0, "0");
  expect(shot.impacts.map((h) => h.soldier)).toEqual([1, 2, 3]);
  expect(shot.reason).toBe("penetration");
  expect(shot.impacts.every((h) => h.damage > 0 && h.hpAfter > 0)).toBe(true);
  expect(shot.impacts[0].damage).toBeGreaterThan(shot.impacts[1].damage);
  expect(shot.impacts[1].damage).toBeGreaterThan(shot.impacts[2].damage);
  expect(shotDamage(120, 40, 80, 0)).toBeLessThan(shotDamage(40, 40, 80, 0));
  expect(traceShot(v, 0, "0+123").impacts).toEqual(shot.impacts);
});
it("retains HP, consumes guard once and treats friendly fire by the same rules", () => {
  const engine = new GameEngine(),
    state = scene();
  state.view.soldiers[1].guardUntil = 1;
  const guarded = engine.apply(
    state,
    0,
    { type: "graphwar-fire", formula: "0" },
    "g",
  ) as GraphwarState;
  const unguarded = traceShot(
    {
      ...state.view,
      soldiers: state.view.soldiers.map((s) => ({ ...s, guardUntil: 0 })),
    },
    0,
    "0",
  );
  expect(guarded.view.soldiers[1].hp).toBeGreaterThan(
    unguarded.impacts[0].hpAfter,
  );
  expect(guarded.view.soldiers[1].guardUntil).toBe(0);
  expect(state.view.soldiers[1].hp).toBe(100);
  expect(guarded.view.soldiers[2].hp).toBeLessThan(100);
});
it("validates movement as a swept circle and expires defensive stance", () => {
  const engine = new GameEngine(),
    state = scene();
  expect(() =>
    engine.apply(state, 0, { type: "graphwar-move", x: -25, y: 0 }, "x"),
  ).toThrow();
  state.view.terrain = [{ x: -28.5, y: 0, radius: 0.5 }];
  expect(() =>
    engine.apply(state, 0, { type: "graphwar-move", x: -27, y: 0 }, "x"),
  ).toThrow();
  const moved = engine.apply(
    state,
    0,
    { type: "graphwar-move", x: -30, y: 2 },
    "x",
  ) as GraphwarState;
  expect(moved.view.soldiers[0].y).toBe(2);
  let guard = engine.apply(
    state,
    0,
    { type: "graphwar-guard" },
    "x",
  ) as GraphwarState;
  for (let i = 0; i < 4; i++)
    guard = engine.apply(
      guard,
      guard.view.turn,
      { type: "graphwar-pass" },
      "x",
    ) as GraphwarState;
  expect(guard.view.playerTurns[0]).toBe(2);
  expect(
    traceShot(
      { ...guard.view, turn: 1, currentSoldier: 1, terrain: [] },
      1,
      "0",
    ).impacts.find((h) => h.soldier === 0)?.guarded,
  ).toBe(false);
});
it("generates reproducible, distributed 12-player maps and six soldiers per player", () => {
  const engine = new GameEngine();
  for (const size of ["standard", "large"] as const)
    for (let seed = 0; seed < 4; seed++) {
      const options = {
        graphwar: graphwarOptionsSchema.parse({ size, soldiers: 6 }),
      };
      const state = engine.create(
        "graphwar",
        12,
        `map:${seed}`,
        false,
        options,
      ) as GraphwarState;
      expect(state).toEqual(
        engine.create("graphwar", 12, `map:${seed}`, false, options),
      );
      expect(state.view.soldiers).toHaveLength(72);
      expect(new Set(state.view.soldiers.map((s) => s.id)).size).toBe(72);
      expect(state.view.terrain.length).toBeGreaterThanOrEqual(
        size === "large" ? 60 : 35,
      );
      expect(state.view.terrain.some((s) => s.permanent)).toBe(true);
      for (const a of state.view.soldiers) {
        expect(containsTerrain(state.view, a, balance.soldierRadius)).toBe(
          false,
        );
        expect(Math.abs(a.x)).toBeLessThan(battlefields[size].width / 2);
        for (const b of state.view.soldiers)
          if (a.id !== b.id)
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(
              balance.soldierRadius * 2,
            );
      }
    }
});
it("permanent rocks remain solid through craters, blast damage never doubles a direct hit", () => {
  const state = scene();
  state.view.terrain = [{ x: 0, y: 0, radius: 1, permanent: true }];
  state.view.craters = [{ x: 0, y: 0, radius: 3 }];
  expect(containsTerrain(state.view, { x: 0, y: 0 })).toBe(true);
  const shot = traceShot(state.view, 0, "0");
  expect(new Set(shot.impacts.map((h) => h.soldier)).size).toBe(
    shot.impacts.length,
  );
  expect(shot.impacts.every((h) => h.damage <= balance.baseDamage)).toBe(true);
});
it("does not mistake an aliased oscillation for a cheap straight shot", () => {
  const shot = traceShot(scene().view, 0, "sin(6.283185307179586*(x+30)/0.14)");
  expect(shot.length).toBeGreaterThan(80);
  expect(shot.impacts).toHaveLength(0);
});

it("keeps asymmetric dense terrain traversable and comparable on both sides",()=>{
 const engine=new GameEngine();
 for(const size of ["standard","large"] as const){
  const state=engine.create("graphwar",12,"passages",false,{graphwar:graphwarOptionsSchema.parse({size,soldiers:6,map:"fortress"})}) as GraphwarState;
  const b=battlefields[size],quality=battlefieldQuality(state.view.terrain,b.width,b.height);
  expect(quality.passage).toBe(true);expect(quality.coverDifference).toBeLessThanOrEqual(.12);
  expect(state.view.terrain.every(c=>state.view.terrain.some(other=>other.x===-c.x&&other.y===c.y&&other.radius===c.radius))).toBe(false);
 }
});
