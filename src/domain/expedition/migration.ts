import { initialResources, expeditionResources } from "./resources";
import { chapters } from "./chapters";
import type { ExpeditionRun } from "./adventure-types";
import { allCards } from "./rules";
import { maxUpgradeLevel } from "./content";

export function migrateExpedition(run: ExpeditionRun): void {
  if (run.campaignVersion === undefined) {
    run.campaignVersion = 1;
    run.chapter = 0;
    run.history = [];
    run.luck = run.combat.heroes.map(() => 0);
    run.rerolls = run.combat.heroes.map(() => 0);
    run.eventRerolls = 0;
  }
  if (
    !Number.isInteger(run.chapter) ||
    run.chapter < 0 ||
    run.chapter >= chapters.length
  )
    throw new Error("远征大层编号无效，原存档保留");
  for (const hero of run.combat.heroes) {
    for (const [key, value] of Object.entries(initialResources())) {
      const resource = key as keyof typeof expeditionResources;
      if (!(key in hero)) hero[resource] = value;
      if (
        !Number.isInteger(hero[resource]) ||
        hero[resource] < 0 ||
        hero[resource] > expeditionResources[resource].maximum
      )
        throw new Error("职业资源数值无效，原存档保留");
    }
    for (const card of allCards(hero)) {
      const saved = card as typeof card & { upgraded?: boolean };
      if (
        saved.upgradeLevel === undefined &&
        typeof saved.upgraded === "boolean"
      )
        saved.upgradeLevel = saved.upgraded ? 1 : 0;
      if (
        !Number.isInteger(saved.upgradeLevel) ||
        saved.upgradeLevel < 0 ||
        saved.upgradeLevel > maxUpgradeLevel
      )
        throw new Error("卡牌强化等级无效，原存档保留");
      delete saved.upgraded;
    }
  }
}
