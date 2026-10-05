import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { CatanRules } from "../src/domain/catan";
import type { CatanView } from "../src/domain/catan-actions";
const engine = new GameEngine();
function setup(players = 3) {
  let state = engine.create("ktd", players, "island");
  for (let step = 0; step < players * 4; step++) {
    const actor = engine.actors(state)[0];
    const candidate = engine.candidates(state, actor)[0];
    expect(candidate).toBeDefined();
    state = engine.apply(state, actor, candidate.action, `setup:${step}`);
  }
  if (state.kind !== "ktd") throw new Error("game");
  return state;
}
it("uses all three original maps with deterministic snake setup and legal positions", () => {
  for (const players of [2, 3, 5, 8]) {
    const state = setup(players);
    expect(state.view.mapId).toBe(players > 6 ? 2 : players > 4 ? 1 : 0);
    expect(
      state.view.playerData.every(
        (player) => player.houses.length === 2 && player.roads.length === 2,
      ),
    ).toBe(true);
    expect(state.view.state).toBe(0);
    expect(engine.create("ktd", players, "same")).toEqual(
      engine.create("ktd", players, "same"),
    );
  }
});
it("validates authoritative resource changes, transactions, development cards and hidden hands", () => {
  const state = setup();
  const view = state.view;
  view.lastDice = 1;
  view.lastOp = { type: 0, playerId: 0 };
  view.playerData[0].resources = [6, 6, 6, 6, 6];
  view.playerData[1].resources = [2, 3, 4, 5, 6];
  const apply = (
    move: Parameters<CatanRules["apply"]>[2] extends infer T ? T : never,
    actor = 0,
  ) => engine.apply(state, actor, move, "test");
  expect(() =>
    apply({
      type: "ktd-action",
      move: { kind: "bank", give: [0, 0, 0, 0, 0], take: [1, 0, 0, 0, 0] },
    }),
  ).toThrow();
  expect(() =>
    apply({ type: "ktd-action", move: { kind: "end" } }, 1),
  ).toThrow();
  const bankMove = engine
    .candidates(state, 0)
    .find(
      (candidate) =>
        candidate.action.type === "ktd-action" &&
        candidate.action.move.kind === "bank" &&
        candidate.action.move.give[0] > 0 &&
        candidate.action.move.take[1] === 1,
    )!.action;
  if (bankMove.type !== "ktd-action" || bankMove.move.kind !== "bank")
    throw new Error("bank");
  const bank = apply(bankMove);
  if (bank.kind !== "ktd") throw new Error("game");
  expect(bank.view.playerData[0].resources.slice(0, 2)).toEqual([
    6 - bankMove.move.give[0],
    7,
  ]);
  const bought = apply({ type: "ktd-action", move: { kind: "buy-dev" } });
  if (bought.kind !== "ktd") throw new Error("game");
  expect(bought.view.playerData[0].cards.reduce((a, b) => a + b)).toBe(1);
  expect(bought).toEqual(
    apply({ type: "ktd-action", move: { kind: "buy-dev" } }),
  );
  const projected = engine.project(state, 0);
  if (projected.kind !== "ktd") throw new Error("game");
  expect(projected.view.playerData[0].resources).toEqual(
    view.playerData[0].resources,
  );
  expect(projected.view.playerData[1].resources).not.toEqual(
    view.playerData[1].resources,
  );
  expect(projected.view.playerData[1].resources.reduce((a, b) => a + b)).toBe(
    20,
  );
});
