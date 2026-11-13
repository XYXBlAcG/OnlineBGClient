import type { ExpeditionRun } from "./adventure-types";
import { endlessTier } from "./chapters";

export function endlessLayers(run: ExpeditionRun): number {
  return (
    run.path.length +
    run.history.reduce((sum, entry) => sum + entry.path.length, 0)
  );
}

export function endlessRelicCount(run: ExpeditionRun): number {
  return run.combat.heroes.reduce((sum, hero) => sum + hero.relics.length, 0);
}

export function endlessScore(run: ExpeditionRun): number {
  const layers = endlessLayers(run);
  return Math.round(
    layers * 120 +
      run.combat.metrics.battlesWon * 45 +
      run.combat.metrics.cards * 2.5 +
      endlessRelicCount(run) * 18 +
      endlessTier(run.chapter) * 300,
  );
}
