import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { readFileSync } from "node:fs";
it("isolates the Catan hand panel and gives Poison a visible icon surface", () => {
  const factories = readFileSync("src/upstream/factories.js", "utf8");
  expect(factories.includes("catan-hand-panel")).toBe(true);
  expect(factories.includes("mt-2 text-center bg-gray-700 pt-1 text-sm")).toBe(
    false,
  );
  expect(readFileSync("src/styles.css", "utf8")).toContain(".game-symbol.dy");
});
it("creates seeded Splendor with correct supplies and authoritative legal moves", () => {
  const engine = new GameEngine();
  for (const players of [2, 3, 4]) {
    const state = engine.create("ccbs", players, "jewel");
    expect(state).toEqual(engine.create("ccbs", players, "jewel"));
    if (state.kind !== "ccbs") throw new Error("game");
    expect(state.view.bankGem).toEqual(
      Array(5)
        .fill(players === 2 ? 4 : players === 3 ? 5 : 7)
        .concat(5),
    );
    expect(state.view.bankNoble).toHaveLength(players + 1);
    const move = engine
      .candidates(state, 0)
      .find(
        (c) => c.action.type === "ccbs-action" && c.action.move.kind === "take",
      )!;
    expect(move).toBeDefined();
    expect(() => engine.apply(state, 1, move.action, "wrong")).toThrow();
    const next = engine.apply(state, 0, move.action, "take");
    if (next.kind !== "ccbs") throw new Error("game");
    expect(next.view.waitFor).toBe(1);
    expect(next.view.playerGem[0].reduce((a, b) => a + b)).toBeGreaterThan(0);
  }
});
it("keeps blind reservations private while retaining public reservation history", () => {
  const engine = new GameEngine();
  let state = engine.create("ccbs", 3, "privacy");
  state = engine.apply(
    state,
    0,
    { type: "ccbs-action", move: { kind: "deck", level: 1 } },
    "blind",
  );
  if (state.kind !== "ccbs") throw new Error("game");
  const own = engine.project(state, 0),
    other = engine.project(state, 1);
  if (own.kind !== "ccbs" || other.kind !== "ccbs") throw new Error("game");
  expect(own.view.playerBooked[0][0]).toBeGreaterThanOrEqual(0);
  expect(other.view.playerBooked[0]).toEqual([-2]);
  expect(other.view.lastOp.card).toBe(0);
  expect(other.view.recordList).toEqual([]);
  expect(other.view.initial).toBeNull();
  const book = engine
    .candidates(state, 1)
    .find(
      (c) => c.action.type === "ccbs-action" && c.action.move.kind === "book",
    )!;
  state = engine.apply(state, 1, book.action, "public");
  const remembered = engine.project(state, 2);
  if (
    remembered.kind !== "ccbs" ||
    book.action.type !== "ccbs-action" ||
    book.action.move.kind !== "book"
  )
    throw new Error("game");
  expect(remembered.view.playerBooked[1]).toContain(book.action.move.cardId);
});
it("validates payment, surplus return, noble choice and equal-turn victory", () => {
  const engine = new GameEngine();
  let state = engine.create("ccbs", 2, "transactions");
  if (state.kind !== "ccbs") throw new Error("game");
  state.view.playerGem[0] = [4, 4, 4, 4, 4, 5];
  const buy = engine
    .candidates(state, 0)
    .find(
      (c) => c.action.type === "ccbs-action" && c.action.move.kind === "buy",
    )!;
  expect(buy).toBeDefined();
  const next = engine.apply(state, 0, buy.action, "buy");
  if (next.kind !== "ccbs") throw new Error("game");
  expect(next.view.playerCard[0]).toHaveLength(1);
  expect(next.view.waitThrowing).toBe(true);
  const give = engine
    .candidates(next, 0)
    .find(
      (c) => c.action.type === "ccbs-action" && c.action.move.kind === "throw",
    )!;
  const returned = engine.apply(next, 0, give.action, "return");
  if (returned.kind !== "ccbs") throw new Error("game");
  expect(returned.view.playerGem[0].reduce((a, b) => a + b)).toBe(10);
  expect(returned.view.waitFor).toBe(1);
  expect(() =>
    engine.apply(
      state,
      0,
      {
        type: "ccbs-action",
        move: {
          kind: "buy",
          cardId: 89,
          pos: 0,
          booked: false,
          payment: { spend: [0, 0, 0, 0, 0], gold: 0 },
        },
      },
      "invalid",
    ),
  ).toThrow();
  const original = engine.runtime.load(1124);
  state.view.playerCard[0] = [17, 35, 53];
  state.view.playerCard[1] = [71, 89, 16, 34];
  state.view = original.my(original.qA(state.view), 2);
  state.view.publicBooked = [[], []];
  expect(state.view.playerScore).toEqual([15, 18]);
  state.view.waitFor = 1;
  state.view.winner = [];
  const final = engine.apply(
    state,
    1,
    { type: "ccbs-action", move: { kind: "pass" } },
    "final",
  );
  if (final.kind !== "ccbs") throw new Error("game");
  expect(final.view.winner).toEqual([2]);
});
it("lets the player choose one noble and resolves final ties by card count", () => {
  const engine = new GameEngine(),
    original = engine.runtime.load(1124);
  let state = engine.create("ccbs", 2, "nobles");
  if (state.kind !== "ccbs") throw new Error("game");
  state.view.playerCard[0] = [0, 1, 2, 3, 18, 19, 20, 21, 36, 37, 38];
  state.view.playerGem[0] = [1, 1, 1, 2, 2, 2];
  state.view.bankNoble = [2, 3, 0];
  state.view.bankCard = [
    [40, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  state.view = original.my(original.qA(state.view), 2);
  state.view.publicBooked = [[], []];
  const buy = engine
    .candidates(state, 0)
    .find(
      (c) =>
        c.action.type === "ccbs-action" &&
        c.action.move.kind === "buy" &&
        c.action.move.cardId === 39,
    )!;
  expect(buy).toBeDefined();
  state = engine.apply(state, 0, buy.action, "noble-buy");
  if (state.kind !== "ccbs") throw new Error("game");
  expect(state.view.waitNoble).toBe(true);
  expect(state.view.nobleCandidates).toEqual([0, 1]);
  state = engine.apply(
    state,
    0,
    { type: "ccbs-action", move: { kind: "noble", noblePos: 1 } },
    "choose",
  );
  if (state.kind !== "ccbs") throw new Error("game");
  expect(state.view.playerNoble[0]).toEqual([2]);
  expect(state.view.bankNoble[0]).toBe(2);
  for (const extra of [false, true]) {
    let tied = engine.create("ccbs", 2, "tie");
    if (tied.kind !== "ccbs") throw new Error("game");
    tied.view.playerCard = [
      [17, 35, 13, 31, ...(extra ? [2] : [])],
      [53, 71, 89, 7],
    ];
    tied.view.waitFor = 1;
    tied.view = original.my(original.qA(tied.view), 2);
    tied.view.publicBooked = [[], []];
    expect(tied.view.playerScore).toEqual([16, 16]);
    expect(tied.view.lastTurn).toBe(true);
    tied = engine.apply(
      tied,
      1,
      { type: "ccbs-action", move: { kind: "pass" } },
      "tie-end",
    );
    if (tied.kind !== "ccbs") throw new Error("game");
    expect(tied.view.winner).toEqual(extra ? [2] : [1, 2]);
  }
});
