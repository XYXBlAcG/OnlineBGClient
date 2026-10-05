import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
import { CatanRules } from "../src/domain/catan";
import { catanIntent } from "../src/domain/catan-intent";
import type { CatanMove } from "../src/domain/catan-actions";
const engine = new GameEngine();
const rules = new CatanRules(engine.runtime);
function table(players = 3) {
  let state = engine.create("ktd", players, "table");
  for (let i = 0; i < players * 4; i++) {
    const actor = engine.actors(state)[0];
    state = engine.apply(
      state,
      actor,
      engine.candidates(state, actor)[0].action,
      `initial:${i}`,
    );
  }
  if (state.kind !== "ktd") throw new Error("table");
  state.view.lastDice = 1;
  state.view.lastOp = { type: 0, playerId: 0 };
  return state;
}
it("transacts offers atomically and enforces responders and resource limits", () => {
  let state = table();
  state.view.playerData[0].resources = [2, 2, 0, 0, 0];
  state.view.playerData[1].resources = [0, 0, 2, 0, 0];
  const apply = (actor: number, move: CatanMove) => {
    state = rules.apply(state, actor, { type: "ktd-action", move });
  };
  const offer = {
    kind: "trade" as const,
    give: [1, 0, 0, 0, 0],
    take: [0, 0, 1, 0, 0],
    targets: [1],
  };
  apply(0, offer);
  expect(engine.actors(state)).toContain(1);
  expect(() => apply(2, { kind: "respond", accept: true })).toThrow();
  expect(() => apply(0, { kind: "buy-dev" })).toThrow();
  apply(1, { kind: "respond", accept: false });
  apply(0, { kind: "cancel-trade" });
  apply(0, offer);
  apply(1, { kind: "respond", accept: true });
  expect(state.view.playerData[0].resources).toEqual([1, 2, 1, 0, 0]);
  expect(state.view.playerData[1].resources).toEqual([1, 0, 1, 0, 0]);
  expect(state.view.exchangeData).toBeUndefined();
});
it("handles development cards, robber discard requests and special construction", () => {
  let state = table(5);
  const view = state.view;
  view.playerData[0].cards = [2, 2, 2, 2, 0];
  view.newCards = [0, 0, 0, 0, 0];
  state = rules.apply(state, 1, {
    type: "ktd-action",
    move: { kind: "request-build" },
  });
  const requested = structuredClone(state.view);
  const next = {
    ...requested,
    actionRequest: (requested.actionRequest || 0) | (1 << 2),
  };
  expect(catanIntent(requested, next, 2, rules.ops)).toEqual({
    type: "ktd-action",
    move: { kind: "request-build" },
  });
  state = rules.apply(state, 0, { type: "ktd-action", move: { kind: "end" } });
  expect(state.view.state).toBe(1);
  expect(state.view.devCard & 16).toBe(16);
  state = rules.apply(state, 1, { type: "ktd-action", move: { kind: "end" } });
  expect(state.view.state).toBe(1);
  expect(state.view.devCard & 16).toBe(0);
  state = table();
  state.view.playerData[0].cards = [1, 1, 1, 1, 0];
  state.view.newCards = [0, 0, 0, 0, 0];
  state.view.playerData[1].resources = [3, 0, 0, 0, 0];
  const before = state.view.playerData[0].resources[0];
  state = rules.apply(state, 0, {
    type: "ktd-action",
    move: { kind: "monopoly", resource: 0 },
  });
  expect(state.view.playerData[0].resources[0]).toBeGreaterThanOrEqual(
    before + 3,
  );
  expect(state.view.playerData[1].resources[0]).toBe(0);
  expect(() =>
    rules.apply(state, 0, {
      type: "ktd-action",
      move: { kind: "abundance", resources: [1, 1, 0, 0, 0] },
    }),
  ).toThrow();
  state = table();
  state.view.playerData[0].resources = [10, 0, 0, 0, 0];
  state.view.lastDice = 6;
  state.view.lastOp = { type: rules.ops.RollDice, playerId: 0 };
  state.view.actionRequest = 1;
  expect(() =>
    rules.apply(state, 0, {
      type: "ktd-action",
      move: { kind: "discard", resources: [4, 0, 0, 0, 0] },
    }),
  ).toThrow();
  state = rules.apply(state, 0, {
    type: "ktd-action",
    move: { kind: "discard", resources: [5, 0, 0, 0, 0] },
  });
  expect(state.view.actionRequest).toBe(0);
  const move = rules
    .candidates(state, 0)
    .find(
      (candidate) =>
        candidate.action.type === "ktd-action" &&
        candidate.action.move.kind === "robber",
    )!;
  state = rules.apply(state, 0, move.action);
  expect(state.view.lastOp!.type).toBe(rules.ops.MoveRobber);
});
it("rebuilds complete setup and random dice from actual room replay", () => {
  const room = new Room("island", {
    kind: "ktd",
    humans: 3,
    ai: [],
    team: false,
    training: false,
  });
  const tokens = [room.claim("甲"), room.claim("乙"), room.claim("丙")];
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  for (let i = 0; i < 13; i++) {
    const actor = room.engine.actors(room.state!)[0];
    const candidate = room.engine.candidates(room.state!, actor)[0];
    room.act(tokens[actor], `step:${i}`, room.version, candidate.action);
  }
  const frames = new Replay(room.export().replay!).frames();
  expect(frames.at(-1)).toEqual(room.state);
  expect(Room.restore(room.export()).state).toEqual(room.state);
  if (room.state?.kind !== "ktd") throw new Error("island");
  room.state.view.playerData[room.state.view.state].cards[4] = 8;
  expect(room.engine.finished(room.state)).toBe(true);
});

it("uses abundance, two free roads and knight cards without spending resources or revealing theft", () => {
  let state = table();
  state.view.playerData[0].cards = [1, 1, 1, 0, 0];
  state.view.newCards = [0, 0, 0, 0, 0];
  const resources = state.view.playerData[0].resources.slice();
  const abundant = rules.apply(state, 0, {
    type: "ktd-action",
    move: { kind: "abundance", resources: [1, 1, 0, 0, 0] },
  });
  expect(abundant.view.playerData[0].resources).toEqual(
    resources.map((count, index) => count + (index < 2 ? 1 : 0)),
  );
  expect(abundant.view.playerData[0].cards[2]).toBe(0);
  state.view.newCards[2] = 1;
  expect(() =>
    rules.apply(state, 0, {
      type: "ktd-action",
      move: { kind: "abundance", resources: [1, 1, 0, 0, 0] },
    }),
  ).toThrow();
  state.view.newCards[2] = 0;
  const road = rules
    .candidates(state, 0)
    .find(
      (candidate) =>
        candidate.action.type === "ktd-action" &&
        candidate.action.move.kind === "road-card",
    )!;
  state = rules.apply(state, 0, road.action);
  expect(state.view.playerData[0].resources).toEqual(resources);
  const second = rules
    .candidates(state, 0)
    .find(
      (candidate) =>
        candidate.action.type === "ktd-action" &&
        candidate.action.move.kind === "build" &&
        candidate.action.move.building === "road",
    )!;
  state = rules.apply(state, 0, second.action);
  expect(state.view.playerData[0].roads).toHaveLength(4);
  expect(state.view.playerData[0].cards[1]).toBe(0);
  expect(state.view.playerData[0].resources).toEqual(resources);
  expect(state.view.devCard & 2).toBe(0);
  state = table();
  state.view.playerData[0].cards[0] = 1;
  state.view.newCards = [0, 0, 0, 0, 0];
  state.view.playerData[0].robberCount = 2;
  state.view.playerData[1].resources = [2, 2, 2, 2, 2];
  const knight = rules
    .candidates(state, 0)
    .find(
      (candidate) =>
        candidate.action.type === "ktd-action" &&
        candidate.action.move.kind === "robber" &&
        candidate.action.move.knight &&
        candidate.action.move.target === 1,
    )!;
  expect(knight).toBeDefined();
  state = rules.apply(state, 0, knight.action);
  expect(state.view.playerData[1].resources.reduce((a, b) => a + b)).toBe(9);
  expect(state.view.bankData.maxRobberCountPos).toBe(1);
  const publicView = rules.project(state, 2);
  expect(publicView.view.lastOp?.needs).toBeUndefined();
  expect(
    rules.project(state, 0).view.lastOp?.needs?.reduce((a, b) => a + b),
  ).toBe(1);
});

it("awards the longest road through legal connected construction and stops actions at victory", () => {
  let state = table();
  state.view.playerData[0].resources = [15, 15, 0, 0, 0];
  for (let step = 0; step < 10 && !state.view.bankData.longestRoadPos; step++) {
    const options = rules
      .candidates(state, 0)
      .filter(
        (candidate) =>
          candidate.action.type === "ktd-action" &&
          candidate.action.move.kind === "build" &&
          candidate.action.move.building === "road",
      );
    expect(options.length).toBeGreaterThan(0);
    state = options
      .map((candidate) => rules.apply(state, 0, candidate.action))
      .sort(
        (a, b) =>
          b.view.playerData[0].longestRoad - a.view.playerData[0].longestRoad,
      )[0];
  }
  expect(state.view.bankData.longestRoadPos).toBe(1);
  expect(state.view.bankData.longestRoad).toBeGreaterThanOrEqual(5);
  state.view.playerData[0].cards[4] = 6;
  expect(rules.finished(state)).toBe(true);
  expect(rules.actors(state)).toEqual([]);
  expect(() =>
    rules.apply(state, 0, { type: "ktd-action", move: { kind: "end" } }),
  ).toThrow();
});

it("resets typed turn fields and rejects unknown interface intents", () => {
  const state = table();
  const next = rules.apply(state, 0, {
    type: "ktd-action",
    move: { kind: "end" },
  });
  expect(next.view.lastDice).toBe(0);
  expect(next.view.devCard).toBe(0);
  expect(
    catanIntent(state.view, { ...next.view, lastDice: 0 }, 0, rules.ops),
  ).toEqual({ type: "ktd-action", move: { kind: "end" } });
  expect(() =>
    catanIntent(
      state.view,
      { ...state.view, lastOp: { type: 999, playerId: 0 } },
      0,
      rules.ops,
    ),
  ).toThrow();
});
