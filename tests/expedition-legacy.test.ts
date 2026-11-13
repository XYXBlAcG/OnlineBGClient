import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { Room } from "../src/domain/room";
import {
  emptyJournal,
  journalAvailableKnowledge,
  journalKnowledge,
  migrateJournal,
  observeExpedition,
  unlockLegacy,
  type ExpeditionJournal,
} from "../src/domain/expedition/journal";
import type { CardId } from "../src/domain/expedition/content";
import {
  knowledgeForRun,
  legacyNodeIds,
  legacyProfile,
  legacySpent,
} from "../src/domain/expedition/legacy";

const richJournal = (knowledge: number): ExpeditionJournal => ({
  ...emptyJournal,
  runs: {
    test: {
      chapter: 3,
      won: true,
      ascension: 0,
      settled: true,
      knowledge,
      professions: [0],
      cards: [],
      relics: [],
      bosses: [0, 1, 2, 3],
    },
  },
});

it("settles expedition knowledge once and migrates old journals", () => {
  const run = new ExpeditionAdventure().create(1).view;
  run.phase = "map";
  run.chapter = 2;
  const active = observeExpedition(emptyJournal, run, 0);
  expect(active.runs[run.runId]).toMatchObject({
    settled: false,
    knowledge: 0,
  });
  run.phase = "lost";
  const settled = observeExpedition(active, run, 0);
  expect(settled.runs[run.runId].settled).toBe(true);
  expect(settled.runs[run.runId].knowledge).toBe(
    knowledgeForRun({ chapter: 2, won: false, bosses: [], ascension: 0 }),
  );
  run.phase = "lost";
  expect(observeExpedition(settled, run, 0)).toBe(settled);
  const migrated = migrateJournal({
    format: 1,
    runs: {
      old: {
        chapter: 2,
        won: true,
        professions: [0],
        cards: [],
        relics: [],
        bosses: [0, 1],
      },
    },
  });
  expect(migrated.format).toBe(2);
  expect(migrated.legacy).toEqual([]);
  expect(migrated.runs.old).toMatchObject({ settled: true, knowledge: 36 });
  expect(journalKnowledge(migrated)).toBe(36);
});

it("enforces legacy prerequisites, costs and cumulative effects", () => {
  const rich = richJournal(100);
  expect(() => unlockLegacy(rich, "camp1")).toThrow("前置传承尚未解锁");
  const supply1 = unlockLegacy(rich, "supply1");
  expect(journalAvailableKnowledge(supply1)).toBe(80);
  const supply2 = unlockLegacy(supply1, "supply2");
  const navigation1 = unlockLegacy(supply2, "navigation1");
  expect(journalAvailableKnowledge(navigation1)).toBe(0);
  expect(() => unlockLegacy(navigation1, "supply3")).toThrow("秘塔学识不足");
  expect(legacySpent(legacyNodeIds)).toBe(640);
  expect(legacyProfile(legacyNodeIds)).toMatchObject({
    startGold: 30,
    startMaxHp: 4,
    startCompass: 2,
    startLuck: 2,
    campHealing: 1.1,
    startPotions: 1,
    freeRerolls: 1,
  });
});

it("applies legacy bonuses to authoritative expedition state", () => {
  let state = new ExpeditionAdventure().create(1, false, {
    expedition: {
      difficulty: "standard",
      ascension: 0,
      legacy: [...legacyNodeIds],
    },
  });
  expect(state.view.compass).toBe(4);
  expect(state.view.luck).toEqual([3]);
  expect(state.view.legacyFreeRerolls).toEqual([1]);
  state = new ExpeditionAdventure().apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  const hero = state.view.combat.heroes[0];
  expect(hero.maxHp).toBe(55);
  expect(hero.gold).toBe(96);
  expect(hero.potions).toHaveLength(1);
});

it("uses the free reroll before spending a luck chip", () => {
  const rules = new ExpeditionAdventure();
  let state = rules.create(1, false, {
    expedition: {
      difficulty: "standard",
      ascension: 0,
      legacy: [...legacyNodeIds],
    },
  });
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  state.view.phase = "reward";
  state.view.current = "reward";
  state.view.offers = [["strike", "defend", "bash"] as CardId[]];
  state.view.nodeReady = [false];
  state.view.luck = [0];
  expect(
    rules
      .candidates(state, 0)
      .some(
        (candidate) =>
          candidate.action.type === "expedition-action" &&
          candidate.action.move.type === "reroll" &&
          candidate.label.includes("传承免费"),
      ),
  ).toBe(true);
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "reroll" },
  });
  expect(state.view.legacyFreeRerolls?.[0]).toBe(0);
  expect(state.view.luck[0]).toBe(0);
});

it("passes the host legacy through room configuration", () => {
  const room = new Room(
    "legacy-room",
    {
      kind: "expedition",
      humans: 1,
      ai: [],
      team: false,
      training: false,
      expedition: {
        difficulty: "standard",
        ascension: 0,
        legacy: ["supply1", "supply2"],
      },
    },
    "legacy-room",
  );
  const token = room.claim("甲");
  room.start(token);
  expect(
    room.state?.kind === "expedition" ? room.state.view.legacy : undefined,
  ).toEqual(["supply1", "supply2"]);
  expect(
    room.state?.kind === "expedition"
      ? room.state.view.legacyFreeRerolls
      : undefined,
  ).toEqual([0]);
  expect(Room.restore(room.export()).state).toEqual(room.state);
});
