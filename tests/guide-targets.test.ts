import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { guideTarget } from "../src/client/guide-targets";
import { beginnerGuides } from "../src/client/beginner-guides";
it("derives exact checkers camp and own movable pieces from real rules", () => {
  const engine = new GameEngine();
  const state = engine.create("tq", 6, "guide");
  const actor = engine.actors(state)[0];
  const snapshot = {
    state: engine.project(state, actor),
    actor,
    candidates: engine.candidates(state, actor),
    finished: false,
    version: 1,
  };
  const camp = guideTarget("tq.camp", snapshot);
  expect(camp.ids).toHaveLength(10);
  expect(new Set(camp.ids).size).toBe(10);
  const own = guideTarget("tq.piece", snapshot);
  expect(own.ids!.length).toBeGreaterThan(0);
  expect(own.player).toBe(actor);
  expect(
    own.ids!.every(
      (id) =>
        state.kind === "tq" &&
        state.view.playerPieces[actor].includes(Number(id)),
    ),
  ).toBe(true);
  expect(guideTarget("tq.route", snapshot).key).toBe("tq.route");
  for (const guide of Object.values(beginnerGuides))
    for (const step of guide.steps) {
      expect(step.focus.target).toBeTruthy();
      expect(step.focus).not.toHaveProperty("selector");
      expect(step.focus).not.toHaveProperty("button");
    }
});
