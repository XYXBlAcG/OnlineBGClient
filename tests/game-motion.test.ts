import { expect, it } from "vitest";
import { gameHighlights } from "../src/client/game-motion";
import { Room } from "../src/domain/room";
it("derives localized feedback from projected confirmed state in all games", () => {
  for (const kind of [
    "uno",
    "sgs",
    "ktd",
    "ccbs",
    "dy",
    "ddz",
    "tq",
    "fxq",
  ] as const) {
    const room = new Room(
      "motion",
      { kind, humans: 3, ai: [], team: false, training: false },
      "motion",
    );
    const token = room.claim("甲");
    room.claim("乙");
    room.claim("丙");
    room.seats.forEach((s) => (s.ready = true));
    room.start(token);
    const state = room.snapshot(token).state!;
    expect(gameHighlights(state, state)).toEqual([]);
    let next = structuredClone(state);
    if (next.kind === "sgs") next.view.playerBlood[0] -= 1;
    if (next.kind === "ccbs") next.view.playerGem[0][0] += 1;
    if (next.kind === "ktd") next.view.playerData[0].resources[0] += 1;
    if (next.kind === "dy") next.view.potValues[0] += 1;
    if (next.kind === "uno")
      next.view.currentColor = (next.view.currentColor + 1) % 4;
    if (next.kind === "ddz") next.view.playerRestCardCounts[0] -= 1;
    if (next.kind === "tq") next.view.waitFor = (next.view.waitFor + 1) % 3;
    if (next.kind === "fxq") next.view.lastDice = 6;
    expect(gameHighlights(state, next).length, kind).toBeGreaterThan(0);
    if (kind === "ccbs")
      expect(gameHighlights(state, next)).toContainEqual({
        selector: '[data-guide-target="ccbs.bank"][data-guide-id="0"]',
        destination: '[data-game-avatar="0"]',
        label: "+1",
      });
  }
});

it("bounds enhanced interaction particles without changing baseline effects", async () => {
  const { effectMotion } = await import("../src/client/effect-motion");
  expect(effectMotion("confetti", 200, 80).fragments).toHaveLength(18);
  expect(effectMotion("confetti", 200, 80, 8).fragments).toHaveLength(8);
});
