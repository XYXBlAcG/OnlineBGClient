import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { chapterAt, chapterCount, endlessScale, endlessTier } from "../src/domain/expedition/chapters";
import { encounterFor, generateMap } from "../src/domain/expedition/map";
import { endlessLayers, endlessScore } from "../src/domain/expedition/endless";

it("cycles chapters and escalates encounter scaling in endless runs", () => {
  expect(chapterAt(chapterCount)).toBe(chapterAt(0));
  expect(chapterAt(chapterCount + 1)).toBe(chapterAt(1));
  expect(endlessTier(chapterCount - 1)).toBe(0);
  expect(endlessTier(chapterCount)).toBe(1);
  expect(endlessScale(chapterCount).health).toBeGreaterThan(1);
  expect(endlessScale(chapterCount * 2).health).toBeGreaterThan(
    endlessScale(chapterCount).health,
  );
  const map = generateMap("endless-map", 2, chapterCount + 1);
  expect(map.length).toBeGreaterThan(0);
});

it("scales endless encounters above the same campaign node", () => {
  const rules = new ExpeditionAdventure(() => 0.42);
  const base = structuredClone(
    rules.create(1, false, {
      expedition: { difficulty: "standard", endless: true },
    }).view,
  );
  const node = base.map.flat().find((item) => item.kind === "battle")!;
  const first = encounterFor(base, node).enemies[0].hp;
  const deeper = structuredClone(base);
  deeper.chapter = chapterCount + 1;
  deeper.endless = true;
  const deepNode = deeper.map.flat().find((item) => item.kind === "battle")!;
  expect(encounterFor(deeper, deepNode).enemies[0].hp).toBeGreaterThan(first);
});

it("turns every cycle boss into a waystation instead of a victory", () => {
  const rules = new ExpeditionAdventure(() => 0.42);
  let state = rules.create(1, false, {
    expedition: { difficulty: "story", endless: true },
  });
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  const boss = state.view.map.at(-1)![0];
  state.view.phase = "reward";
  state.view.current = boss.id;
  state.view.rewardElite = false;
  state.view.nodeReady = [false];
  state.view.offers = [["strike"]];
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "reward", choice: "skip" },
  });
  expect(state.view.phase).toBe("waystation");
});

it("advances into a scaled next cycle after the final chapter", () => {
  const rules = new ExpeditionAdventure(() => 0.42);
  let state = rules.create(1, false, {
    expedition: { difficulty: "story", endless: true },
  });
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  state.view.phase = "waystation";
  state.view.nodeReady = [false];
  state.view.chapter = chapterCount - 1;
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "advance", choice: "vitality" },
  });
  expect(state.view.chapter).toBe(chapterCount);
  const node = state.view.map.flat().find((item) => item.kind === "battle")!;
  expect(encounterFor(state.view, node).enemies[0].hp).toBeGreaterThan(0);
});

it("scores endless runs from depth, battles, cards, relics, and cycle", () => {
  const rules = new ExpeditionAdventure(() => 0.42);
  const run = structuredClone(
    rules.create(1, false, {
      expedition: { difficulty: "standard", endless: true },
    }).view,
  );
  expect(run.endless).toBe(true);
  run.path = ["a", "b", "c"];
  run.history = [{ chapter: 0, path: ["x", "y"] }];
  run.chapter = chapterCount;
  run.combat.metrics.battlesWon = 4;
  run.combat.metrics.cards = 40;
  expect(endlessLayers(run)).toBe(5);
  expect(endlessScore(run)).toBeGreaterThan(5 * 120);
});
