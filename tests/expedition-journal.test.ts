import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import {
  observeExpedition,
  emptyJournal,
} from "../src/domain/expedition/journal";
it("records discoveries once per run without granting permanent combat stats", () => {
  const run = new ExpeditionAdventure().create(1).view;
  run.phase = "map";
  const journal = observeExpedition(emptyJournal, run, 0);
  expect(Object.keys(observeExpedition(journal, run, 0).runs)).toHaveLength(1);
  run.phase = "won";
  const finished = observeExpedition(journal, run, 0);
  expect(finished.runs[run.runId].won).toBe(true);
  run.phase = "map";
  expect(observeExpedition(finished, run, 0).runs[run.runId].won).toBe(true);
});
