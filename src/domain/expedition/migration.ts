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
  if (run.contract === undefined) run.contract = null;
  if (typeof run.hunt !== "boolean") run.hunt = false;
  if (typeof run.side !== "boolean") run.side = false;
  if (run.sideReturn === undefined) run.sideReturn = null;
  if (run.sideReturn && run.sideReturn.nodeStart === undefined)
    run.sideReturn.nodeStart = null;
  if (typeof run.shopsSealed !== "boolean") run.shopsSealed = false;
  if (typeof run.shopRaidActive !== "boolean") run.shopRaidActive = false;
  if (typeof run.shopRaidFailed !== "boolean") run.shopRaidFailed = false;
  if (
    run.shopRaidDeadlineRound !== null &&
    (!Number.isInteger(run.shopRaidDeadlineRound) ||
      run.shopRaidDeadlineRound < 1)
  )
    run.shopRaidDeadlineRound = null;
  if (run.stats === undefined)
    run.stats = {
      nodesVisited: 0,
      battlesWon: 0,
      cardsPlayed: run.combat.heroes.map(() => 0),
    };
  if (run.stats.cardsPlayed.length !== run.combat.heroes.length)
    run.stats.cardsPlayed = run.combat.heroes.map(
      (_, index) => run.stats.cardsPlayed[index] ?? 0,
    );
  if (!Array.isArray(run.companions)) run.companions = [];
  if (!Array.isArray(run.companionOffers)) run.companionOffers = [];
  if (run.companionBattle === undefined) run.companionBattle = null;
  if (run.nodeStart === undefined) run.nodeStart = null;
  if (run.lastNodeResult === undefined) run.lastNodeResult = null;
  if (!Number.isInteger(run.compass) || run.compass < 0) run.compass = 2;
  if (
    !Number.isInteger(run.ascension) ||
    run.ascension < 0 ||
    run.ascension > 10
  )
    run.ascension = 0;
  if (
    !Number.isInteger(run.chapter) ||
    run.chapter < 0 ||
    run.chapter >= chapters.length
  )
    throw new Error("远征大层编号无效，原存档保留");
  for (const hero of run.combat.heroes) {
    if (!Number.isInteger(hero.spore) || hero.spore < 0) hero.spore = 0;
    if (!Number.isInteger(hero.silenced) || hero.silenced < 0)
      hero.silenced = 0;
    if (
      hero.tether !== null &&
      (!Number.isInteger(hero.tether) ||
        hero.tether < 0 ||
        hero.tether >= run.combat.heroes.length ||
        hero.tether === run.combat.heroes.indexOf(hero))
    )
      hero.tether = null;
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
  for (const [index, enemy] of run.combat.enemies.entries()) {
    const definition =
      run.combat.scenario[run.combat.encounter]?.enemies[index];
    if (!enemy.pattern && definition) enemy.pattern = definition.pattern;
    if (!enemy.phasePattern && definition?.phasePattern)
      enemy.phasePattern = definition.phasePattern;
    if (!Array.isArray(enemy.traits))
      enemy.traits = [...(definition?.traits ?? [])];
    if (!["boss", "guard", "part", "minion"].includes(enemy.role))
      enemy.role =
        enemy.hp > 0 && run.combat.enemies.indexOf(enemy) === 0
          ? "boss"
          : "guard";
    if (!Number.isInteger(enemy.stunned) || enemy.stunned < 0)
      enemy.stunned = 0;
    if (!Number.isInteger(enemy.phase) || enemy.phase < 0) enemy.phase = 0;
    if (!Number.isInteger(enemy.stolenGold) || enemy.stolenGold < 0)
      enemy.stolenGold = 0;
    if (!Array.isArray(enemy.stolenRelics)) enemy.stolenRelics = [];
  }
}
