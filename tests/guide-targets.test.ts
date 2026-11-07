import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { guideTarget } from "../src/client/guide-targets";
import { beginnerGuides } from "../src/client/beginner-guides";
import { Room } from "../src/domain/room";

function roomSnapshot(
  kind: "uno" | "ddz",
  humans: number,
): ReturnType<Room["snapshot"]> {
  const room = new Room(
    `guide-${kind}`,
    { kind, humans, ai: [], team: false, training: false, aiDelayMs: 0 },
    `guide-${kind}`,
  );
  const tokens = Array.from({ length: humans }, (_, index) =>
    room.claim(`玩家${index}`),
  );
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  return room.snapshot(tokens[0]);
}
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

it("locates precise UNO and DDZ elements instead of the whole table", () => {
  const uno = roomSnapshot("uno", 2);
  expect(guideTarget("uno.hand", uno).selector).toBe(".uno-list > .uno");
  expect(guideTarget("uno.top", uno).selector).toBe(".uno-last-card");
  expect(guideTarget("uno.deck", uno).selector).toBe(
    '[data-motion-zone="uno.deck"]',
  );
  expect(guideTarget("uno.players", uno).selector).toBe(
    '[data-table-region="players"] .w-36 > div',
  );
  expect(guideTarget("uno.actions", uno).selector).toBe(
    '[data-table-region="hand"] > .flex.flex-wrap > button',
  );
  const ddz = roomSnapshot("ddz", 3);
  expect(guideTarget("ddz.hand", ddz).selector).toContain(".ddz-my-poker");
  expect(guideTarget("ddz.table", ddz).selector).toContain(".ddz-poker-list");
  for (const step of [
    ...beginnerGuides.fxq!.steps,
    ...beginnerGuides.uno!.steps,
    ...beginnerGuides.ddz!.steps,
  ]) {
    expect(step.focus.target).toBeTruthy();
    expect(step.details.length).toBeGreaterThanOrEqual(3);
  }
});

it("uses leaf selectors for every complex guide target", () => {
  const expected: Partial<Record<string, string>> = {
    "fxq.roll": ".text-center button.primary",
    "fxq.plane": ".fxq-selectable-plane",
    "fxq.landing": ".flight-landing-marker circle",
    "fxq.weather": '[data-guide-target="fxq.weather"]',
    "scmj.tile": ".scmj-hand .scmj-tile",
    "scmj.exchange": '[data-guide-target="scmj.exchange"]',
    "scmj.discard": '[data-guide-target="scmj.discard"]',
    "scmj.action": ".scmj-actions button",
    "dominion.supply": ".dominion-supply-grid .dominion-card",
    "dominion.actions": ".dominion-actions button",
    "ktd.hand": ".catan-hand-panel .my-1",
    "dy.hand": '[data-room-region="dy.hand"] .dy-card',
    "dy.play": '[data-room-region="dy.hand"] button.primary',
    "sgs.card": ".sgs-hand-panel .sgs-card",
    "gw.fire":
      '.original-game[data-game="graphwar"] .gw-input-row button.primary-button',
    "expedition.actions": ".exp-table-controls > button",
    "expedition.choices":
      ".exp-event-options > button, .exp-relic-choices > button, .exp-node-actions > button",
  };
  for (const [key, selector] of Object.entries(expected)) {
    expect(guideTarget(key as never).selector).toBe(selector);
  }
  for (const key of [
    "fxq.roll",
    "fxq.plane",
    "scmj.tile",
    "dominion.supply",
    "ktd.hand",
    "dy.hand",
    "sgs.card",
    "gw.fire",
    "expedition.actions",
  ] as const) {
    const selector = guideTarget(key).selector ?? "";
    expect(selector).not.toMatch(
      /\.(game-stage|original-game|text-center|fitted-map)$/,
    );
  }
});
