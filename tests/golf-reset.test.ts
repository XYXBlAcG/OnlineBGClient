import { describe, expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";

const engine = new GameEngine();

describe("golf reset", () => {
  it("resets the ball position without touching strokes", () => {
    let state = engine.create("golf", 2, "golf-reset", false);
    if (state.kind !== "golf") throw new Error("wrong game");
    const course = state.view.courses[0]!;
    state = engine.apply(
      state,
      0,
      { type: "golf-putt", hole: 0, previousStrokes: 0, aim: 0.6, power: 0.7 },
      "shot",
    ) as typeof state;
    expect(state.kind).toBe("golf");
    if (state.kind !== "golf") throw new Error("wrong game");
    expect(state.view.players[0]!.strokes).toBeGreaterThanOrEqual(1);
    const strokes = state.view.players[0]!.strokes;
    const moved = state.view.players[0]!.position;
    state = engine.apply(state, 0, { type: "golf-reset", hole: 0 }, "reset") as typeof state;
    if (state.kind !== "golf") throw new Error("wrong game");
    expect(state.view.players[0]!.strokes).toBe(strokes);
    expect(state.view.players[0]!.position).toEqual(course.tee);
    expect(moved).not.toEqual(course.tee);
    expect(state.view.players[1]!.strokes).toBe(0);
  });

  it("rejects reset when the hole is already finished or outside the turn", () => {
    const state = engine.create("golf", 2, "golf-reset", false);
    if (state.kind !== "golf") throw new Error("wrong game");
    expect(() =>
      engine.apply(state, 0, { type: "golf-reset", hole: 1 }, "reset"),
    ).toThrow();
  });
});
