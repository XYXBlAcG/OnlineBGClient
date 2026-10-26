import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import {
  dominionCards,
  cardDefinition,
  firstKingdom,
  type CardId,
} from "../src/domain/dominion/cards";
import { DominionRules } from "../src/domain/dominion/rules";
import type { DominionState } from "../src/domain/dominion/types";
const engine = new GameEngine();
const rules = new DominionRules(() => 0.37);
const setup = (players = 2) =>
  engine.create("dominion", players, "dominion-test") as DominionState;
it("registers 26 kingdom cards and deals seeded, conserved starting decks for 2–4 players", () => {
  expect(
    Object.keys(dominionCards).filter(
      (card) => cardDefinition(card as CardId).kingdom,
    ),
  ).toHaveLength(26);
  for (const players of [2, 3, 4]) {
    const state = setup(players);
    expect(state).toEqual(setup(players));
    expect(state.view.kingdom).toEqual(firstKingdom);
    for (const player of state.view.players) {
      expect(player.hand).toHaveLength(5);
      expect([...player.hand, ...player.deck].sort()).toEqual(
        [...Array(7).fill("copper"), ...Array(3).fill("estate")].sort(),
      );
    }
    expect(state.view.supply.province).toBe(players === 2 ? 8 : 12);
    expect(state.view.supply.curse).toBe((players - 1) * 10);
  }
});
it("transacts action, treasure, buying and cleanup through the shared engine", () => {
  let state = setup();
  state.view.players[0].hand = [
    "village",
    "smithy",
    "copper",
    "silver",
    "gold",
  ];
  const play = (card: CardId) => {
    state = engine.apply(
      state,
      0,
      { type: "dominion-action", move: { type: "play", card } },
      "play",
    ) as DominionState;
  };
  play("village");
  expect(state.view.actions).toBe(2);
  play("smithy");
  expect(state.view.actions).toBe(1);
  state = engine.apply(
    state,
    0,
    { type: "dominion-action", move: { type: "treasures" } },
    "treasures",
  ) as DominionState;
  expect(state.view.phase).toBe("buy");
  expect(state.view.coins).toBeGreaterThanOrEqual(6);
  const original = structuredClone(state);
  expect(() =>
    engine.apply(
      state,
      1,
      { type: "dominion-action", move: { type: "buy", card: "silver" } },
      "illegal",
    ),
  ).toThrow();
  expect(state).toEqual(original);
  state = engine.apply(
    state,
    0,
    { type: "dominion-action", move: { type: "buy", card: "silver" } },
    "buy",
  ) as DominionState;
  expect(state.view.players[0].discard).toContain("silver");
  state = engine.apply(
    state,
    0,
    { type: "dominion-action", move: { type: "end" } },
    "end",
  ) as DominionState;
  expect(state.view.turn).toBe(1);
  expect(state.view.players[0].hand).toHaveLength(5);
  expect(state.view.inPlay).toHaveLength(0);
});
it("hides opposing hands and all deck order while preserving own choices", () => {
  const state = setup(3);
  const view = engine.project(state, 0) as DominionState;
  expect(view.view.players[0].hand).toEqual(state.view.players[0].hand);
  expect(view.view.players[1].hand).toEqual(Array(5).fill("hidden"));
  expect(
    view.view.players.every((p) => p.deck.every((card) => card === "hidden")),
  ).toBe(true);
  expect(state.view.players[1].hand).not.toContain("hidden");
});
it("resolves Moat reactions and Militia discards in seat order", () => {
  let state = setup(3);
  state.view.players[0].hand = ["militia"];
  state.view.players[1].hand = ["moat", "copper", "estate", "silver", "gold"];
  state = rules.apply(state, 0, {
    type: "dominion-action",
    move: { type: "play", card: "militia" },
  });
  expect(rules.actors(state)).toEqual([1]);
  state = rules.apply(state, 1, {
    type: "dominion-action",
    move: { type: "choose", choice: "block" },
  });
  expect(state.view.players[1].hand).toHaveLength(5);
  expect(rules.actors(state)).toEqual([2]);
  while (state.view.prompt)
    state = rules.apply(state, 2, rules.candidates(state, 2)[0].action);
  expect(state.view.players[2].hand).toHaveLength(3);
  expect(rules.actors(state)).toEqual([0]);
});
it("scores Gardens, ends at turn cleanup, and breaks ties by fewer turns", () => {
  const state = setup();
  state.view.players[0].hand = ["province", "gardens", "curse"];
  state.view.players[0].deck = Array(7).fill("copper");
  state.view.players[0].discard = [];
  state.view.players[1].hand = ["province"];
  state.view.players[1].deck = [];
  state.view.players[1].discard = [];
  state.view.supply.province = 0;
  expect(rules.finished(state)).toBe(false);
  const ended = rules.apply(state, 0, {
    type: "dominion-action",
    move: { type: "end" },
  });
  expect(rules.finished(ended)).toBe(true);
  expect(ended.view.scores).toEqual([6, 6]);
  expect(ended.view.winners).toEqual([1]);
});
it("resolves every base action without losing or creating physical cards", () => {
  const count = (state: DominionState) => {
    const v = state.view;
    return (
      Object.values(v.supply).reduce((n, count) => n + count, 0) +
      v.trash.length +
      v.inPlay.length +
      v.players.reduce(
        (n, p) =>
          n + p.hand.length + p.deck.length + p.discard.length + p.aside.length,
        0,
      ) +
      (v.prompt &&
      ["sentry", "library", "order", "bandit"].includes(v.prompt.kind)
        ? v.prompt.cards.length + (v.prompt.kept?.length ?? 0)
        : 0)
    );
  };
  for (const card of Object.keys(dominionCards) as CardId[]) {
    if (cardDefinition(card).type !== "action") continue;
    let state = rules.create(3, false, {
      dominion: {
        mode: "custom",
        kingdom: [...new Set([card, ...firstKingdom])].slice(0, 10),
      },
    });
    state.view.players[0].hand = [
      card,
      "copper",
      "estate",
      "village",
      "silver",
    ];
    state.view.players[0].deck = [
      "gold",
      "smithy",
      "copper",
      "market",
      "moat",
      "silver",
      "copper",
      "estate",
    ];
    state.view.players[0].discard = ["gold", "estate"];
    state.view.players[1].hand = [
      "moat",
      "estate",
      "silver",
      "copper",
      "village",
    ];
    state.view.players[1].deck = ["silver", "gold", "estate"];
    const before = count(state);
    state = rules.apply(state, 0, {
      type: "dominion-action",
      move: { type: "play", card },
    });
    expect(count(state), card).toBe(before);
    let responses = 0;
    while (state.view.prompt && responses++ < 30) {
      const actor = rules.actors(state)[0],
        choices = rules.candidates(state, actor);
      const choice =
        state.view.prompt.kind === "moat"
          ? choices.find(
              (c) =>
                c.action.type === "dominion-action" &&
                c.action.move.type === "choose" &&
                c.action.move.choice === "accept",
            )!
          : choices[0];
      state = rules.apply(state, actor, choice.action);
      expect(count(state), `${card} response ${responses}`).toBe(before);
    }
    expect(state.view.prompt, card).toBeNull();
    expect(state.view.queue, card).toHaveLength(0);
  }
});
it("orders Sentry's remaining cards and keeps looked-at cards private", () => {
  let state = setup();
  state.view.players[0].hand = ["sentry"];
  state.view.players[0].deck = ["copper", "silver", "gold"];
  state = rules.apply(state, 0, {
    type: "dominion-action",
    move: { type: "play", card: "sentry" },
  });
  expect(rules.project(state, 1).view.prompt?.cards).toEqual([]);
  for (const choice of ["keep", "keep", "gold"])
    state = rules.apply(state, 0, {
      type: "dominion-action",
      move: { type: "choose", choice },
    });
  expect(state.view.players[0].deck).toEqual(["gold", "silver"]);
});
it("handles nested Throne Rooms as separate double plays", () => {
  let state = setup();
  state.view.players[0].hand = ["throne", "throne", "village", "smithy"];
  state.view.players[0].deck = Array(20).fill("copper");
  state = rules.apply(state, 0, {
    type: "dominion-action",
    move: { type: "play", card: "throne" },
  });
  for (const choice of ["throne", "village", "smithy"])
    state = rules.apply(state, 0, {
      type: "dominion-action",
      move: { type: "choose", choice },
    });
  expect(state.view.inPlay).toEqual(["throne", "throne", "village", "smithy"]);
  expect(state.view.players[0].hand).toHaveLength(8);
  expect(state.view.actions).toBe(4);
});
it("stacks Merchant bonuses only on the first Silver and forbids treasure after a purchase", () => {
  let state = setup();
  state.view.players[0].hand = ["merchant", "merchant", "silver", "silver"];
  state.view.players[0].deck = [];
  state.view.players[0].discard = [];
  for (let index = 0; index < 2; index++)
    state = rules.apply(state, 0, {
      type: "dominion-action",
      move: { type: "play", card: "merchant" },
    });
  state = rules.apply(state, 0, {
    type: "dominion-action",
    move: { type: "buy-phase" },
  });
  state = rules.apply(state, 0, {
    type: "dominion-action",
    move: { type: "play", card: "silver" },
  });
  expect(state.view.coins).toBe(4);
  state = rules.apply(state, 0, {
    type: "dominion-action",
    move: { type: "buy", card: "silver" },
  });
  expect(() =>
    rules.apply(state, 0, {
      type: "dominion-action",
      move: { type: "play", card: "silver" },
    }),
  ).toThrow();
});
