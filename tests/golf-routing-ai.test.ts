import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Strategies } from "../src/domain/strategies";

it("navigates every generated hole without hitting the stroke cap", () => {
  const engine = new GameEngine();
  const bot = new Strategies().select("golf");
  const seed = "audit-golf-0";
  for (const difficulty of ["easy", "normal", "hard"] as const) {
    const fresh = engine.create("golf", 2, seed);
    if (fresh.kind !== "golf") throw Error();
    for (const [hole, { tee }] of fresh.view.courses.entries()) {
      let state = structuredClone(fresh);
      state.view.hole = hole;
      state.view.players[0]!.position = tee;
      const cap = state.view.strokeCap ?? 12;
      while (!state.view.players[0]!.sunk && state.view.players[0]!.strokes < cap) {
        const action = bot.decide(state, 0, difficulty, `${seed}:${hole}:${state.view.players[0]!.strokes}`).chosen;
        const next = engine.apply(state, 0, action, seed);
        if (next.kind !== "golf") throw Error();
        state = next;
      }
      expect(state.view.players[0]!.sunk, `${difficulty}, hole ${hole + 1}`).toBe(true);
    }
  }
}, 30_000);
