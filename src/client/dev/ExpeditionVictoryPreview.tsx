import { useMemo } from "react";
import { ExpeditionVictory } from "../expedition/ExpeditionVictory";
import { ExpeditionAdventure } from "../../domain/expedition/adventure";
import type { ExpeditionRun } from "../../domain/expedition/adventure-types";

function previewRun(
  outcome: "won" | "lost",
  endless = false,
): ExpeditionRun {
  const rules = new ExpeditionAdventure(() => 0.42);
  const run = structuredClone(
    rules.create(2, false, {
      expedition: {
        difficulty: "challenge",
        ascension: 7,
        ...(endless ? { endless: true } : {}),
      },
    }).view,
  );
  run.phase = outcome;
  run.chapter = 3;
  run.path = Array.from({ length: endless ? 26 : 42 }, (_, index) => `${index}`);
  run.chapter = endless ? 6 : 3;
  run.combat.metrics.battlesWon = 23;
  run.combat.metrics.cards = 186;
  return run;
}

export function ExpeditionVictoryPreview() {
  const won = useMemo(() => previewRun("won"), []);
  const lost = useMemo(() => previewRun("lost"), []);
  const endless = useMemo(() => previewRun("lost", true), []);
  return (
    <main className="app-shell">
      <ExpeditionVictory run={won} />
      <ExpeditionVictory run={lost} />
      <ExpeditionVictory run={endless} />
    </main>
  );
}
