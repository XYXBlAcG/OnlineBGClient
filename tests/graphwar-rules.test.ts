import { describe, expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { compileFormula } from "../src/domain/graphwar/expression";
import { traceShot, containsTerrain } from "../src/domain/graphwar/trajectory";
import {
  graphwarOptionsSchema,
  type GraphwarState,
} from "../src/domain/graphwar/types";

function fixture(): GraphwarState {
  const state = new GameEngine().create(
    "graphwar",
    4,
    "fixture",
  ) as GraphwarState;
  state.view.terrain = [];
  state.view.craters = [];
  state.view.soldiers = [
    { id: 0, player: 0, x: -20, y: 0, hp: 100, guardUntil: 0 },
    { id: 4, player: 1, x: 20, y: 0, hp: 100, guardUntil: 0 },
    { id: 8, player: 2, x: -10, y: 0, hp: 100, guardUntil: 0 },
    { id: 12, player: 3, x: 10, y: 0, hp: 100, guardUntil: 0 },
  ];
  return state;
}

describe("bounded scalar Graphwar expressions", () => {
  it("keeps Graphwar logarithm semantics and rejects non-scalar syntax", () => {
    expect(compileFormula("log(100)+ln(exp(2))").evaluate(0)).toBeCloseTo(4);
    expect(compileFormula("-x^2 + 2*x").evaluate(3)).toBeCloseTo(-3);
    for (const text of [
      "a=1",
      "random()",
      '"123"',
      "true",
      "[1,2]",
      "x.y",
      "y+1",
      "sin(",
      "x".repeat(300),
    ])
      expect(() => compileFormula(text)).toThrow();
    expect(Number.isFinite(compileFormula("sqrt(x)").evaluate(-1))).toBe(false);
  });
  it("translates through the firing soldier and ignores additive constants", () => {
    const v = fixture().view;
    const a = traceShot(v, 0, "x/5");
    const b = traceShot(v, 0, "x/5+123");
    expect(a.points[0]).toEqual({ x: -20, y: 0 });
    expect(a.points.length).toBe(b.points.length);
    a.points.forEach((p, i) => expect(p.y).toBeCloseTo(b.points[i].y, 9));
  });
  it("mirrors right-side shots and hits multiple enemies and teammates without stopping", () => {
    const v = fixture().view;
    expect(
      traceShot(v, 0, "0")
        .impacts.map((h) => h.soldier)
        .sort((a, b) => a - b),
    ).toEqual([4, 8, 12]);
    v.currentSoldier = 4;
    expect(
      traceShot(v, 1, "0")
        .impacts.map((h) => h.soldier)
        .sort((a, b) => a - b),
    ).toEqual([0, 8, 12]);
    v.currentSoldier = 0;
    const a = traceShot(v, 0, "x/10");
    v.currentSoldier = 4;
    const b = traceShot(v, 1, "x/10");
    expect(a.points.at(-1)!.y).toBeCloseTo(b.points.at(-1)!.y);
  });
  it("terminates at obstacles and undefined values with finite bounded samples", () => {
    const v = fixture().view;
    v.terrain = [{ x: 0, y: 0, radius: 2 }];
    const shot = traceShot(v, 0, "0");
    expect(shot.reason).toBe("terrain");
    expect(shot.points.at(-1)!.x).toBeCloseTo(-2, 1);
    expect(shot.impacts.map((h) => h.soldier)).toEqual([8]);
    expect(traceShot(v, 0, "sqrt(x)").reason).toBe("undefined");
    const high = traceShot(v, 0, "sin(100*x)");
    expect(high.points.length).toBeLessThanOrEqual(4096);
    expect(high.points.every((p) => Number.isFinite(p.x + p.y))).toBe(true);
    v.craters = [{ x: -2, y: 0, radius: 3 }];
    expect(containsTerrain(v, { x: -1, y: 0 })).toBe(false);
  });
});

describe("Graphwar authoritative rules", () => {
  it("seeds valid 2–8 player maps and rotates each player's soldiers", () => {
    const engine = new GameEngine();
    for (const players of [2, 3, 8]) {
      const a = engine.create("graphwar", players, "map") as GraphwarState;
      expect(a).toEqual(engine.create("graphwar", players, "map"));
      expect(a.view.soldiers).toHaveLength(players * 3);
      expect(a.view.soldiers.every((s) => !containsTerrain(a.view, s))).toBe(
        true,
      );
      let next = a;
      for (let i = 0; i < players; i++)
        next = engine.apply(
          next,
          next.view.turn,
          { type: "graphwar-pass" },
          "skip",
        ) as GraphwarState;
      expect(next.view.turn).toBe(0);
      expect(next.view.currentSoldier).not.toBe(a.view.currentSoldier);
    }
  });
  it("validates turns and formula syntax without mutating rejected moves", () => {
    const engine = new GameEngine(),
      state = fixture(),
      saved = structuredClone(state);
    expect(() =>
      engine.apply(state, 1, { type: "graphwar-fire", formula: "0" }, "x"),
    ).toThrow();
    expect(() =>
      engine.apply(state, 0, { type: "graphwar-fire", formula: "sin(" }, "x"),
    ).toThrow();
    expect(state).toEqual(saved);
    const next = engine.apply(
      state,
      0,
      { type: "graphwar-fire", formula: "0" },
      "x",
    ) as GraphwarState;
    expect(next.view.winner).toBeNull();
    expect(next.view.soldiers.every((s) => s.hp > 0)).toBe(true);
    expect(engine.finished(next)).toBe(false);
  });
  it("records crater geometry, options and bounded match length", () => {
    const engine = new GameEngine(),
      state = fixture();
    state.view.terrain = [{ x: 0, y: 0, radius: 2 }];
    const next = engine.apply(
      state,
      0,
      { type: "graphwar-fire", formula: "0" },
      "x",
    ) as GraphwarState;
    expect(next.view.craters).toHaveLength(1);
    expect(state.view.craters).toHaveLength(0);
    expect(
      graphwarOptionsSchema.parse({
        mode: "demolition",
        map: "fortress",
        soldiers: 4,
      }).soldiers,
    ).toBe(4);
    state.view.sequence = 199;
    expect(
      engine.finished(engine.apply(state, 0, { type: "graphwar-pass" }, "x")),
    ).toBe(true);
  });
});

it("keeps explosion modes distinct and cannot jump through narrow terrain between samples", () => {
  const v = fixture().view;
  v.terrain = [{ x: 0.02, y: 0, radius: 0.003 }];
  for (const mode of ["classic", "demolition", "sniper"] as const) {
    v.options.mode = mode;
    const shot = traceShot(v, 0, "0");
    expect(shot.reason).toBe("terrain");
    expect(shot.points.at(-1)!.x).toBeCloseTo(0.017, 5);
    expect(shot.crater?.radius).toBe(
      { classic: 1.3, demolition: 3.2, sniper: 0.6 }[mode],
    );
  }
});

it("spreads full teams across the available battlefield without soldier overlap", () => {
  const engine = new GameEngine();
  for (const count of [2, 4, 8]) {
    const state = engine.create("graphwar", count, "spread", false, {
      graphwar: {
        map: "islands",
        size: "standard",
        mode: "classic",
        soldiers: 4,
        preview: true,
        turnSeconds: 60,
      },
    }) as GraphwarState;
    const units = state.view.soldiers;
    expect(units.some((s) => s.y > 3)).toBe(true);
    expect(units.some((s) => s.y < -3)).toBe(true);
    for (const a of units)
      for (const b of units)
        if (a.id !== b.id)
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(1);
  }
});
