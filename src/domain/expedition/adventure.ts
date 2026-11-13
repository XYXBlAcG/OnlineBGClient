import {
  advancedBalance,
  advancedEncounter,
  grantSceneShield,
  advanceTeamContract,
} from "./advanced";
import { ballotOption, ballotResult, routeLabel } from "./ballot";
import {
  chapters,
  advancementChoices,
  waystationRecovery,
} from "./chapters";
import { ascensionProfile } from "./ascension";
import { legacyProfile, normalizeLegacy } from "./legacy";
import { cardServices, campRecovery } from "./card-services";
import type { Rules } from "../plugin";
import type { Action, Candidate } from "../types";
import type { GameOptions } from "../game-options";
import { ExpeditionRules, allCards } from "./rules";
import {
  cards,
  heroContent,
  cardPools,
  commonCards,
  legacyCardIds,
  canUpgrade,
  definition,
  type CardId,
} from "./content";
import {
  potions,
  relics,
  relicValue,
  storyEvents,
  type RelicId,
  type PotionId,
  type StoryEventId,
  type EventEffect,
} from "./world";
import {
  expeditionDifficulties,
  expeditionOptionsSchema,
  type ExpeditionRun,
  type ExpeditionGameState,
  type ExpeditionMove,
  type NodeKind,
  type ShopItem,
  type Companion,
  type CompanionOffer,
  type ExpeditionResourceSnapshot,
} from "./adventure-types";
import {
  generateMap,
  generateSideMap,
  mapChoices,
  encounterFor,
  shopRaidBalance,
  shopRaidEncounter,
  travelCost,
} from "./map";
import { shuffled } from "./random";
const combat = new ExpeditionRules();
const startingRelics: readonly RelicId[] = [
  "shell",
  "lens",
  "salve",
  "battery",
  "prism",
  "salve",
  "abyss_lamp",
  "lockpick",
  "secondFate",
];
export function combatGoldReward(kind: NodeKind, floor: number) {
  const base = kind === "elite" ? 75 : kind === "boss" ? 120 : 35;
  return base + Math.max(0, floor) * 4;
}
export class ExpeditionAdventure implements Rules<"expedition"> {
  constructor(private readonly random: () => number = () => 0.5) {}
  create(
    players: number,
    _team = false,
    options?: GameOptions,
  ): ExpeditionGameState {
    if (players < 1 || players > 4) throw new Error("秘塔远征支持 1–4 名角色");
    const seed = `${this.random()}:${this.random()}`,
      config = expeditionOptionsSchema.parse(options?.expedition ?? {}),
      ascension = ascensionProfile(config.ascension),
      legacy = legacyProfile(config.legacy),
      difficultyCompensation =
        expeditionDifficulties[config.difficulty].compensation;
    const view: ExpeditionRun = {
      advanced: config.advanced,
      rulesVersion: 1,
      campaignVersion: options?.expeditionCampaign ?? 2,
      tuning: options?.expeditionTuning ?? 2,
      chapter: 0,
      history: [],
      luck: Array(players).fill(
        (options?.expeditionCampaign === 1 ? 0 : 1) +
          ascension.startLuck +
          legacy.startLuck +
          difficultyCompensation.luck,
      ),
      rerolls: Array(players).fill(0),
      eventRerolls: 0,
      contentVersion: 1,
      runId: `exp-${Math.floor(this.random() * 2 ** 48).toString(36)}-${Math.floor(this.random() * 2 ** 48).toString(36)}`,
      seed,
      difficulty: config.difficulty,
      ascension: config.ascension,
      endless: config.endless,
      legacy: normalizeLegacy(config.legacy),
      legacyFreeRerolls: Array(players).fill(legacy.freeRerolls),
      phase: "profession",
      combat: combat.create(
        seed,
        Array.from({ length: players }, (_, i) => i % 3),
        [],
      ),
      map: structuredClone(
        options?.expeditionMap ??
          generateMap(seed, options?.expeditionLayout ?? 2),
      ),
      floor: -1,
      current: null,
      path: [],
      professions: {},
      votes: {},
      tieChoices: [],
      votePhase: "map",
      nodeReady: Array(players).fill(false),
      shop: [],
      shopRemoved: Array(players).fill(false),
      shopsSealed: false,
      shopRaidActive: false,
      shopRaidFailed: false,
      shopRaidDeadlineRound: null,
      stats: {
        nodesVisited: 0,
        battlesWon: 0,
        cardsPlayed: Array(players).fill(0),
      },
      offers: [],
      event: null,
      treasure: [],
      selectedRelic: null,
      pending: Array.from({ length: players }, () => []),
      rewardElite: false,
      contract: null,
      hunt: false,
      side: false,
      sideReturn: null,
      companions: [],
      companionOffers: [],
      companionBattle: null,
      nodeStart: null,
      lastNodeResult: null,
      compass:
        2 +
        ascension.startCompass +
        legacy.startCompass +
        difficultyCompensation.compass,
      sequence: 0,
      marks: [],
    };
    return { kind: "expedition", view };
  }
  actionWindow(state: ExpeditionGameState, action: Action): string | undefined {
    const v = state.view;
    return action.type === "expedition-action"
      ? `${v.runId}:${v.phase}:${v.current}:${v.combat.battleSerial}:${v.combat.round}`
      : undefined;
  }
  finished(state: ExpeditionGameState) {
    return state.view.phase === "won" || state.view.phase === "lost";
  }
  actors(state: ExpeditionGameState): number[] {
    const run = state.view;
    return run.combat.heroes.flatMap((hero, actor) => {
      if (run.phase === "battle" && (hero.ready || hero.hp <= 0)) return [];
      if (
        [
          "map",
          "event",
          "treasure",
          "holder",
          "oracle",
          "contract",
          "pawnshop",
          "gamble",
          "library",
          "hunt",
          "rift",
          "recruit",
        ].includes(run.phase) &&
        run.votes[actor] !== undefined
      )
        return [];
      return this.candidates(state, actor).some(
        (c) =>
          c.action.type === "expedition-action" &&
          !["discard-potion", "ping", "unready"].includes(c.action.move.type),
      )
        ? [actor]
        : [];
    });
  }
  candidates(state: ExpeditionGameState, actor: number): Candidate[] {
    const run = state.view,
      hero = run.combat.heroes[actor];
    if (!hero || this.finished(state)) return [];
    if (
      [
        "map",
        "event",
        "treasure",
        "holder",
        "oracle",
        "contract",
        "pawnshop",
        "gamble",
        "library",
        "hunt",
        "rift",
        "recruit",
      ].includes(run.phase) &&
      run.votes[actor] !== undefined
    )
      return [];
    const moves: { move: ExpeditionMove; label: string }[] = [];
    const add = (move: ExpeditionMove, label: string) =>
      moves.push({ move, label });
    if (run.phase === "profession" && run.professions[actor] === undefined)
      heroContent
        .slice(0, run.campaignVersion === 1 ? 3 : heroContent.length)
        .forEach((h, profession) =>
          add({ type: "profession", profession }, `选择${h.name} · ${h.title}`),
        );
    if (run.phase === "waystation" && !run.nodeReady[actor])
      for (const choice of Object.keys(
        advancementChoices,
      ) as (keyof typeof advancementChoices)[])
        if (choice !== "forge" || allCards(hero).some(canUpgrade))
          add({ type: "advance", choice }, advancementChoices[choice]);
    if (run.phase === "map")
      mapChoices(run).forEach((node) => {
        const travel = travelCost(run, node);
        if (travel.cost > run.compass) return;
        add(
          { type: "vote", choice: node.id },
          `投票前往${routeLabel(run.map, node)}${travel.visited ? " · 已探索，仅通行" : ""}${travel.cost ? ` · 消耗罗盘 ${travel.cost}` : ""}`,
        );
      });
    if (
      run.phase === "tie" &&
      actor === Math.max(0, run.floor) % run.combat.heroes.length
    )
      run.tieChoices.forEach((choice) => {
        const label = ballotOption(run, run.votePhase, choice).label;
        add({ type: "tie", choice }, `领队决定：${label}`);
      });
    if (run.phase === "battle") {
      if (run.teamContract?.status === "offered") {
        add(
          { type: "team-contract", accept: true },
          `接受协作契约：同轮攻击与格挡，全队获得 ${advancedBalance.contract} 格挡`,
        );
        add({ type: "team-contract", accept: false }, "本战不接受契约");
      }
      if (
        run.companionBattle &&
        !run.companionBattle.chosen &&
        run.companions.some((companion) => companion.active && !companion.dead)
      ) {
        add({ type: "toggle-companion", enabled: true }, "让 AI 队友上场");
        add({ type: "toggle-companion", enabled: false }, "本场让 AI 队友待命");
      }
      for (const action of combat.candidates(run.combat, actor)) {
        if (action.type === "play")
          add(
            {
              type: "card",
              instance: action.instance,
              ...(action.target ? { target: action.target } : {}),
            },
            `使用${definition(hero.hand.find((c) => c.id === action.instance)!).name}`,
          );
        else if (action.type === "ready" || action.type === "unready")
          add(
            { type: action.type },
            action.type === "ready" ? "结束行动" : "取消结束",
          );
      }
      if (hero.hp > 0 && !hero.ready && hero.silenced === 0)
        hero.potions.forEach((id, index) => {
          const potion = potions[id];
          if (potion.target === "self")
            add({ type: "potion", index }, `使用${potion.name}`);
          else
            (potion.target === "enemy"
              ? run.combat.enemies
              : run.combat.heroes
            ).forEach((target, i) => {
              if (target.hp > 0)
                add(
                  {
                    type: "potion",
                    index,
                    target: {
                      side: potion.target === "enemy" ? "enemy" : "hero",
                      index: i,
                    },
                  },
                  `使用${potion.name} → ${target.name}`,
                );
            });
        });
      [
        ...run.combat.heroes.map((_, index) => ({
          side: "hero" as const,
          index,
        })),
        ...run.combat.enemies.map((_, index) => ({
          side: "enemy" as const,
          index,
        })),
      ].forEach((target) =>
        add(
          {
            type: "ping",
            target,
            kind: target.side === "hero" ? "protect" : "attack",
          },
          target.side === "hero" ? "请求保护" : "标记攻击目标",
        ),
      );
    }
    if (run.phase === "reward" && !run.nodeReady[actor]) {
      run.offers[actor].forEach((id) =>
        add({ type: "reward", choice: id }, `获得${cards[id].name}`),
      );
      if (hero.hp < hero.maxHp)
        add({ type: "reward", choice: "heal" }, "恢复 8 生命");
      add({ type: "reward", choice: "skip" }, "跳过奖励");
      if (run.luck[actor] > 0 || (run.legacyFreeRerolls?.[actor] ?? 0) > 0)
        add(
          { type: "reroll" },
          (run.legacyFreeRerolls?.[actor] ?? 0) > 0
            ? "重选战利品 · 传承免费"
            : "重选战利品 · 1 幸运筹码",
        );
    }
    if (run.phase === "shop" && !run.nodeReady[actor]) {
      const removalPrice = Math.ceil(
        cardServices.removalPrice * ascensionProfile(run.ascension).shopPrice,
      );
      for (const item of run.shop[actor])
        if (
          !item.sold &&
          hero.gold >= item.price &&
          (item.kind !== "potion" || hero.potions.length < 3) &&
          (item.kind !== "relic" || !hero.relics.includes(item.relic))
        )
          add(
            { type: "buy", item: item.id },
            `购买${item.kind === "card" ? cards[item.card].name : item.kind === "relic" ? relics[item.relic].name : potions[item.potion].name} · ${item.price} 金币`,
          );
      if (
        hero.gold >= removalPrice &&
        !run.shopRemoved[actor] &&
        allCards(hero).length > cardServices.minimumDeckSize
      )
        for (const card of allCards(hero))
          add(
            { type: "remove", instance: card.id },
            `移除${definition(card).name} · ${removalPrice} 金币`,
          );
      for (const relic of new Set(hero.relics)) {
        const value = relicValue(relic, {
          nodes: run.stats.nodesVisited,
          battles: run.stats.battlesWon,
          cards: run.stats.cardsPlayed[actor],
        });
        if (value > 0)
          add(
            { type: "sell-relic", relic },
            `向老板出售${relics[relic].name} · ${value} 金币`,
          );
      }
      if (!run.shopsSealed)
        add(
          { type: "raid-shop" },
          `抢走商店 · ${shopRaidBalance.roundLimit} 回合内击败老板，商品全免费；超时老板带走商品`,
        );
      add({ type: "done" }, "离开商店");
    }
    if (run.phase === "camp" && !run.nodeReady[actor]) {
      add(
        { type: "rest" },
        `休息：恢复 ${Math.ceil(
          campRecovery(hero) *
            ascensionProfile(run.ascension).campHealing *
            legacyProfile(run.legacy ?? []).campHealing,
        )} 生命`,
      );
      allCards(hero)
        .filter(canUpgrade)
        .forEach((card) =>
          add(
            { type: "upgrade", instance: card.id },
            `升级${definition(card).name}`,
          ),
        );
      if (allCards(hero).length > cardServices.minimumDeckSize)
        allCards(hero).forEach((card) =>
          add(
            { type: "remove", instance: card.id },
            `移除${definition(card).name}`,
          ),
        );
      add({ type: "done" }, "跳过营地");
    }
    if (
      run.advanced &&
      run.phase === "camp" &&
      !run.nodeReady[actor] &&
      run.compass >= advancedBalance.supply.compass
    )
      add(
        { type: "compass-supply" },
        `消耗 ${advancedBalance.supply.compass} 罗盘：恢复 ${advancedBalance.supply.heal} 生命并获得 ${advancedBalance.supply.gold} 金币，结束营地选择`,
      );
    if (run.phase === "oracle" && !run.nodeReady[actor]) {
      add({ type: "vote", choice: "luck" }, "观星：每人获得 1 幸运筹码");
      add({ type: "vote", choice: "heal" }, "观星：每人恢复 8 生命");
      add({ type: "vote", choice: "compass" }, "观星：罗盘充能 +1");
    }
    if (run.phase === "contract" && !run.nodeReady[actor]) {
      add(
        { type: "vote", choice: "accept" },
        "签订孵巢契约：每人获得 80 金币，下一首领增加幼体",
      );
      add({ type: "vote", choice: "refuse" }, "拒绝契约");
    }
    if (run.phase === "pawnshop") {
      if (run.combat.heroes.every((member) => member.relics.length))
        add(
          { type: "vote", choice: "sell" },
          "每人典当 1 件遗物，获得 65 金币",
        );
      if (run.combat.heroes.every((member) => member.gold >= 45))
        add({ type: "vote", choice: "buy" }, "每人支付 45 金币，获得随机遗物");
      add({ type: "vote", choice: "leave" }, "离开当铺");
    }
    if (run.phase === "gamble") {
      add({ type: "vote", choice: "safe" }, "稳妥分赃：每人获得 15 金币");
      add(
        { type: "vote", choice: "risk" },
        "押上命运：约六成获得 55 金币，否则失去 12 生命",
      );
      add({ type: "vote", choice: "leave" }, "离开赌局");
    }
    if (run.phase === "library") {
      add(
        { type: "vote", choice: "bargain" },
        "签下禁书契约：获得遗物、50 金币与 1 张永久废牌",
      );
      add({ type: "vote", choice: "leave" }, "离开禁书库");
    }
    if (run.phase === "hunt") {
      add(
        { type: "vote", choice: "accept" },
        "接下悬赏：下一精英增加词条，胜利后每人获得 50 金币",
      );
      add({ type: "vote", choice: "leave" }, "离开追猎台");
    }
    if (run.phase === "rift") {
      add(
        { type: "vote", choice: "enter" },
        "进入深层：随机消耗队伍牌与遗物，完成短层后高额返回",
      );
      add({ type: "vote", choice: "leave" }, "不进入裂隙");
    }
    if (run.phase === "recruit") {
      if (
        run.companions.filter(
          (companion) => companion.active && !companion.dead,
        ).length < 2
      ) {
        run.companionOffers.forEach((offer) =>
          add({ type: "vote", choice: offer.id }, `招募${offer.name}`),
        );
        add({ type: "vote", choice: "leave" }, "不招募，继续前进");
      } else add({ type: "vote", choice: "leave" }, "队伍已满，继续前进");
    }
    if (run.phase === "event") {
      const event = storyEvents[run.event!];
      event.choices.forEach((choice, index) => {
        const gold = choice.effects
          .filter((e) => e.kind === "gold")
          .reduce((sum, e) => sum + e.amount, 0);
        if (run.combat.heroes.every((h) => h.gold + gold >= 0))
          add({ type: "vote", choice: String(index) }, choice.name);
      });
      add({ type: "vote", choice: "leave" }, "离开，不作改变");
      if (run.luck.every((amount) => amount > 0))
        add(
          { type: "vote", choice: "reroll" },
          "全员同意重选奇遇 · 每人 1 幸运筹码",
        );
    }
    if (run.phase === "recovery" && !run.nodeReady[actor]) {
      const next = run.pending[actor][0];
      if (next?.kind === "upgrade")
        allCards(hero)
          .filter(canUpgrade)
          .forEach((card) =>
            add(
              { type: "upgrade", instance: card.id },
              `升级${definition(card).name}`,
            ),
          );
      if (
        next?.kind === "remove" &&
        allCards(hero).length > cardServices.minimumDeckSize
      )
        allCards(hero).forEach((card) =>
          add(
            { type: "remove", instance: card.id },
            `移除${definition(card).name}`,
          ),
        );
      add({ type: "done" }, "放弃剩余改造");
    }
    if (run.phase === "treasure")
      run.treasure.forEach((id) =>
        add({ type: "vote", choice: id }, `投票选择${relics[id].name}`),
      );
    if (run.phase === "holder")
      run.combat.heroes.forEach((h, index) => {
        if (!h.relics.includes(run.selectedRelic!))
          add({ type: "vote", choice: String(index) }, `交给${h.name}`);
      });
    if (run.phase !== "profession")
      hero.potions.forEach((id, index) =>
        add({ type: "discard-potion", index }, `丢弃${potions[id].name}`),
      );
    return moves.map(({ move, label }) => ({
      action: { type: "expedition-action", move },
      label,
    }));
  }
  apply(
    state: ExpeditionGameState,
    actor: number,
    action: Action,
  ): ExpeditionGameState {
    if (
      action.type !== "expedition-action" ||
      !this.candidates(state, actor).some(
        (c) => JSON.stringify(c.action) === JSON.stringify(action),
      )
    )
      throw new Error("动作已失效，请重新选择当前可用目标");
    const next = structuredClone(state),
      run = next.view,
      move = action.move,
      hero = run.combat.heroes[actor];
    if (move.type === "team-contract")
      run.teamContract!.status = move.accept ? "active" : "declined";
    if (move.type === "compass-supply") {
      run.compass -= advancedBalance.supply.compass;
      this.heal(run, actor, advancedBalance.supply.heal);
      hero.gold += advancedBalance.supply.gold;
      run.nodeReady[actor] = true;
      this.nodeDone(run);
    }
    const cardsBefore = run.combat.metrics.cards;
    run.sequence++;
    if (move.type === "advance") {
      if (move.choice === "vitality") hero.maxHp += 4;
      if (move.choice === "supplies") hero.gold += 60;
      if (move.choice === "forge")
        run.pending[actor] = [{ kind: "upgrade", left: 2 }];
      run.nodeReady[actor] = true;
      if (run.nodeReady.every(Boolean)) {
        run.history.push({ chapter: run.chapter, path: [...run.path] });
        run.chapter++;
        run.luck = run.luck.map((amount) => Math.min(2, amount + 1));
        run.compass = Math.min(4, run.compass + 1);
        run.map = generateMap(
          `${run.seed}:chapter:${run.chapter}`,
          2,
          run.chapter,
        );
        if (run.shopsSealed) this.sealShops(run);
        run.current = null;
        run.floor = -1;
        run.path = [];
        run.votes = {};
        run.hunt = false;
        run.combat.heroes.forEach((member, index) => {
          const recovered = Math.ceil(
            (member.hp > 0 ? member.maxHp - member.hp : member.maxHp) *
              waystationRecovery,
          );
          this.heal(run, index, recovered);
        });
        run.phase = run.pending.some((pending) => pending.length)
          ? "recovery"
          : "map";
        run.nodeReady = run.pending.map((pending) => !pending.length);
        this.recordNodeResult(run);
      }
    }
    if (move.type === "profession") {
      run.professions[actor] = move.profession;
      if (Object.keys(run.professions).length === run.combat.heroes.length) {
        run.combat = combat.create(
          run.seed,
          run.combat.heroes.map((_, i) => run.professions[i]!),
          [],
        );
        const profile = ascensionProfile(run.ascension),
          legacy = legacyProfile(run.legacy ?? []);
        run.combat.heroes.forEach((h, index) => {
          h.maxHp +=
            profile.startMaxHp +
            legacy.startMaxHp +
            expeditionDifficulties[run.difficulty].compensation.maxHp;
          h.hp = h.maxHp;
          h.gold =
            50 +
            profile.startGold +
            legacy.startGold +
            expeditionDifficulties[run.difficulty].compensation.gold;
          h.relics = [startingRelics[h.profession] ?? "salve"];
          for (let count = 0; count < legacy.startPotions; count++) {
            const id = shuffled(
              (Object.keys(potions) as PotionId[]).filter(
                (potion) => !h.potions.includes(potion),
              ),
              `${run.seed}:legacy:potion:${index}:${count}`,
            )[0];
            if (id) h.potions.push(id);
          }
        });
        run.phase = "map";
      }
    }
    if (move.type === "vote") {
      run.votes[actor] = move.choice;
      if (Object.keys(run.votes).length === run.combat.heroes.length) {
        const counts = new Map<string, number>();
        const ballots = Object.values(run.votes);
        const counted =
          run.phase === "event" && !ballots.every((v) => v === "reroll")
            ? ballots.filter((v) => v !== "reroll")
            : ballots;
        counted.forEach((v) => counts.set(v!, 1 + (counts.get(v!) ?? 0)));
        const max = Math.max(...counts.values()),
          choices = [...counts]
            .filter(([, count]) => count === max)
            .map(([id]) => id);
        if (choices.length > 1) {
          run.votePhase = run.phase as ExpeditionRun["votePhase"];
          run.phase = "tie";
          run.tieChoices = choices;
        } else {
          run.lastBallot = ballotResult(
            run,
            run.phase as ExpeditionRun["votePhase"],
            choices[0],
          );
          this.decide(run, choices[0]);
        }
      }
    }
    if (move.type === "tie") {
      run.lastBallot = ballotResult(run, run.votePhase, move.choice);
      run.phase = run.votePhase;
      this.decide(run, move.choice);
    }
    if (move.type === "toggle-companion" && run.phase === "battle") {
      const companion = run.companions.find(
        (candidate) => candidate.active && !candidate.dead,
      );
      if (run.companionBattle && !run.companionBattle.chosen && companion) {
        run.companionBattle = {
          ...run.companionBattle,
          companionId: move.enabled ? companion.id : null,
          chosen: true,
        };
        if (move.enabled) {
          this.companionAction(run, companion, 1);
          run.companionBattle.actedRound = run.combat.round;
        }
      }
    }
    if (
      move.type === "card" ||
      move.type === "ready" ||
      move.type === "unready"
    ) {
      const beforeCombat = run.combat;
      const round = run.combat.round;
      if (run.companionBattle && !run.companionBattle.chosen)
        run.companionBattle.chosen = true;
      run.combat = combat.apply(
        run.combat,
        move.type === "card"
          ? {
              type: "play",
              actor,
              instance: move.instance,
              ...(move.target ? { target: move.target } : {}),
            }
          : { type: move.type, actor },
      );
      if (
        run.combat.round > round &&
        run.companionBattle?.companionId &&
        run.companionBattle.actedRound < run.combat.round
      ) {
        const companion = run.companions.find(
          (candidate) =>
            candidate.id === run.companionBattle?.companionId &&
            candidate.active &&
            !candidate.dead,
        );
        if (companion) {
          this.companionAction(run, companion, run.combat.round);
          run.companionBattle.actedRound = run.combat.round;
        }
      }
      advanceTeamContract(run, beforeCombat, actor, move);
      this.afterCombat(run);
    }
    if (move.type === "potion") {
      run.combat = combat.potion(run.combat, actor, move.index, move.target);
      this.afterCombat(run);
    }
    if (move.type === "ping") {
      run.marks = run.marks.filter((mark) => mark.actor !== actor);
      run.marks.push({
        actor,
        target: move.target,
        kind: move.kind,
        sequence: run.sequence,
      });
    }
    if (move.type === "discard-potion") hero.potions.splice(move.index, 1);
    if (move.type === "reroll") {
      if ((run.legacyFreeRerolls?.[actor] ?? 0) > 0)
        run.legacyFreeRerolls![actor]--;
      else run.luck[actor]--;
      run.offers[actor] = shuffled(
        this.pool(run, actor).filter((id) => !run.offers[actor].includes(id)),
        `${run.seed}:rewards:${run.current}:${actor}:reroll:${++run.rerolls[actor]}`,
      ).slice(0, 3);
    }
    if (move.type === "reward") {
      if (move.choice === "heal") this.heal(run, actor, 8);
      else if (move.choice !== "skip")
        this.gainCard(run, actor, move.choice as CardId);
      run.nodeReady[actor] = true;
      this.nodeDone(run);
    }
    if (move.type === "raid-shop" && run.phase === "shop") {
      const node = run.map
        .flat()
        .find((candidate) => candidate.id === run.current);
      if (node && !run.shopsSealed) {
        run.shopRaidActive = true;
        run.shopRaidFailed = false;
        run.shopRaidDeadlineRound = shopRaidBalance.roundLimit;
        run.combat = combat.begin(run.combat, shopRaidEncounter(run, node));
        run.phase = "battle";
        run.rewardElite = false;
        run.nodeReady.fill(false);
        run.votes = {};
        run.companionBattle = {
          companionId: null,
          chosen: false,
          actedRound: 0,
          settled: false,
          healthLostStart: run.combat.metrics.healthLost,
        };
      }
    }
    if (move.type === "sell-relic" && run.phase === "shop") {
      const relic = move.relic as RelicId,
        index = hero.relics.indexOf(relic),
        value = relicValue(relic, {
          nodes: run.stats.nodesVisited,
          battles: run.stats.battlesWon,
          cards: run.stats.cardsPlayed[actor],
        });
      if (index >= 0 && value > 0) {
        hero.relics.splice(index, 1);
        hero.gold += value;
      }
    }
    if (move.type === "buy") {
      const item = run.shop[actor].find((item) => item.id === move.item)!;
      hero.gold -= item.price;
      item.sold = true;
      if (item.kind === "card") this.gainCard(run, actor, item.card);
      if (item.kind === "relic") hero.relics.push(item.relic);
      if (item.kind === "potion") hero.potions.push(item.potion);
    }
    if (move.type === "rest") {
      this.heal(
        run,
        actor,
        Math.ceil(
          campRecovery(hero) *
            ascensionProfile(run.ascension).campHealing *
            legacyProfile(run.legacy ?? []).campHealing,
        ),
      );
      run.nodeReady[actor] = true;
      this.nodeDone(run);
    }
    if (move.type === "upgrade" || move.type === "remove") {
      const card = allCards(hero).find((card) => card.id === move.instance)!;
      if (move.type === "upgrade") card.upgradeLevel++;
      else {
        for (const pile of [
          hero.hand,
          hero.deck,
          hero.discard,
          hero.played,
          hero.exhaust,
        ]) {
          const index = pile.findIndex((c) => c.id === card.id);
          if (index >= 0) pile.splice(index, 1);
        }
        if (run.phase === "shop") {
          hero.gold -= Math.ceil(
            cardServices.removalPrice *
              ascensionProfile(run.ascension).shopPrice,
          );
          run.shopRemoved[actor] = true;
        }
      }
      if (run.phase === "recovery") {
        if (--run.pending[actor][0].left <= 0) run.pending[actor].shift();
        run.nodeReady[actor] = !run.pending[actor].length;
      }
      if (run.phase === "camp") run.nodeReady[actor] = true;
      this.nodeDone(run);
    }
    if (move.type === "done") {
      run.pending[actor] = [];
      run.nodeReady[actor] = true;
      this.nodeDone(run);
    }
    if (run.combat.metrics.cards > cardsBefore)
      run.stats.cardsPlayed[actor] += run.combat.metrics.cards - cardsBefore;
    return next;
  }
  private heal(run: ExpeditionRun, actor: number, amount: number) {
    const hero = run.combat.heroes[actor],
      gain = Math.min(amount, hero.maxHp - hero.hp);
    hero.hp += gain;
    run.combat.metrics.healed += gain;
  }
  private gainCard(run: ExpeditionRun, actor: number, card: CardId) {
    run.combat.heroes[actor].discard.push({
      id: `c${run.combat.nextId++}`,
      card,
      upgradeLevel: 0,
    });
  }
  private gainRelic(run: ExpeditionRun, actor: number, salt: string) {
    const hero = run.combat.heroes[actor],
      id = shuffled(
        Object.keys(relics) as RelicId[],
        `${run.seed}:${salt}:${run.current}:${actor}`,
      ).find((candidate) => !hero.relics.includes(candidate));
    if (id) hero.relics.push(id);
  }
  private pool(run: ExpeditionRun, actor: number) {
    return [
      ...cardPools[run.combat.heroes[actor].profession],
      ...commonCards.filter((id) => !["strike", "defend"].includes(id)),
    ].filter((id) => run.campaignVersion === 2 || legacyCardIds.has(id));
  }
  private afterCombat(run: ExpeditionRun) {
    if (run.combat.phase === "lost") {
      this.settleCompanions(run);
      run.phase = "lost";
      return;
    }
    if (
      run.combat.phase !== "won" &&
      run.shopRaidActive &&
      run.shopRaidDeadlineRound !== null &&
      run.combat.round > run.shopRaidDeadlineRound
    ) {
      this.settleCompanions(run);
      run.shopRaidActive = false;
      run.shopRaidFailed = true;
      run.shopRaidDeadlineRound = null;
      run.shop.forEach((items) => items.forEach((item) => (item.sold = true)));
      run.phase = "shop";
      run.nodeReady.fill(false);
      run.votes = {};
      return;
    }
    if (run.combat.phase !== "won") return;
    this.settleCompanions(run);
    run.stats.battlesWon = Math.max(
      run.stats.battlesWon,
      run.combat.metrics.battlesWon,
    );
    if (run.shopRaidActive) {
      run.shopRaidActive = false;
      run.shopRaidFailed = false;
      run.shopRaidDeadlineRound = null;
      run.shopsSealed = true;
      this.sealShops(run);
      run.shop.forEach((items) => items.forEach((item) => (item.price = 0)));
      run.phase = "shop";
      run.nodeReady.fill(false);
      run.votes = {};
      return;
    }
    const currentNode = run.map.flat().find((node) => node.id === run.current);
    if (currentNode?.kind === "elite" && run.hunt) {
      run.combat.heroes.forEach((hero) => (hero.gold += 50));
      run.hunt = false;
    }
    if (currentNode!.kind === "boss") {
      if (
        run.campaignVersion === 1 ||
        (!run.endless && run.chapter === chapters.length - 1)
      ) {
        run.phase = "won";
        return;
      }
    }
    run.phase = "reward";
    run.nodeReady.fill(false);
    run.offers = run.combat.heroes.map((hero, actor) => {
      hero.gold += combatGoldReward(currentNode!.kind, run.floor);
      if (
        hero.potions.length < 3 &&
        shuffled([0, 1, 2], `${run.seed}:potion:${run.current}:${actor}`)[0] ===
          0
      )
        hero.potions.push(
          shuffled(
            Object.keys(potions) as PotionId[],
            `${run.seed}:potion-kind:${run.current}:${actor}`,
          )[0],
        );
      return shuffled(
        this.pool(run, actor),
        `${run.seed}:rewards:${run.current}:${actor}`,
      ).slice(0, 3);
    });
  }
  private nodeDone(run: ExpeditionRun) {
    if (!run.nodeReady.every(Boolean)) return;
    if (
      run.phase === "reward" &&
      run.map.flat().find((node) => node.id === run.current)?.kind === "boss" &&
      run.campaignVersion === 2 &&
      (run.endless || run.chapter < chapters.length - 1)
    ) {
      this.recordNodeResult(run);
      run.phase = "waystation";
      run.nodeReady.fill(false);
      run.pending = run.combat.heroes.map(() => []);
      run.nodeStart = {
        nodeId: `waystation-${run.chapter + 1}`,
        nodeKind: "camp",
        resources: this.resourceSnapshot(run),
      };
    } else if (run.phase === "reward" && run.rewardElite) {
      run.rewardElite = false;
      this.treasure(run);
    } else {
      this.finishNode(run);
    }
  }
  private treasure(run: ExpeditionRun) {
    run.phase = "treasure";
    run.votes = {};
    run.treasure = shuffled(
      Object.keys(relics) as RelicId[],
      `${run.seed}:treasure:${run.current}`,
    )
      .filter((id) =>
        run.combat.heroes.some((hero) => !hero.relics.includes(id)),
      )
      .slice(0, 3);
    if (!run.treasure.length) this.finishNode(run);
  }
  private decide(run: ExpeditionRun, choice: string) {
    run.votes = {};
    run.tieChoices = [];
    if (run.phase === "map") {
      const node = mapChoices(run).find((node) => node.id === choice)!;
      const travel = travelCost(run, node);
      run.compass -= travel.cost;
      run.current = node.id;
      run.floor = node.floor;
      run.path.push(node.id);
      if (!travel.visited) run.stats.nodesVisited++;
      run.lastNodeResult = null;
      run.nodeStart = travel.visited
        ? null
        : {
            nodeId: node.id,
            nodeKind: node.kind,
            resources: this.resourceSnapshot(run),
          };
      run.nodeReady.fill(false);
      run.pending = run.combat.heroes.map(() => []);
      run.marks = [];
      if (travel.visited) {
        run.phase = "map";
        run.votes = {};
        return;
      }
      if (node.kind === "rift") {
        if (run.side && node.floor === run.map.length - 1) {
          this.returnFromRift(run);
        } else {
          run.phase = "rift";
          run.votes = {};
        }
        return;
      }
      if (node.kind === "empty") {
        this.finishNode(run);
        return;
      }
      if (["battle", "elite", "boss"].includes(node.kind)) {
        run.combat = combat.begin(
          run.combat,
          advancedEncounter(
            encounterFor(run, node),
            !!run.advanced && node.kind === "elite" && node.lane % 2 === 0,
            run.chapter,
          ),
        );
        run.teamContract = run.advanced
          ? {
              status: "offered",
              round: run.combat.round,
              attack: [],
              defend: [],
            }
          : undefined;
        if (run.advanced) grantSceneShield(run.combat);
        if (node.kind === "boss") run.contract = null;
        run.combat.revivalFraction =
          node.kind === "boss" && run.campaignVersion === 2 ? 0 : 0.25;
        run.phase = "battle";
        run.rewardElite = node.kind === "elite";
        run.companionBattle = {
          companionId: null,
          chosen: false,
          actedRound: 0,
          settled: false,
          healthLostStart: run.combat.metrics.healthLost,
        };
      }
      if (node.kind === "camp") run.phase = "camp";
      if (node.kind === "forge") {
        run.pending = run.combat.heroes.map(() => [
          { kind: "upgrade", left: 1 },
        ]);
        run.nodeReady = run.pending.map(() => false);
        run.phase = "recovery";
      }
      if (node.kind === "treasure") this.treasure(run);
      if (node.kind === "secret") this.treasure(run);
      if (node.kind === "event") {
        run.event = shuffled(
          Object.keys(storyEvents) as StoryEventId[],
          `${run.seed}:event:${node.id}`,
        )[0];
        run.phase = "event";
      }
      if (node.kind === "oracle" || node.kind === "contract")
        run.phase = node.kind;
      if (node.kind === "recruit") {
        run.companionOffers = this.rollCompanionOffers(run);
        run.phase = "recruit";
      }
      if (
        node.kind === "pawnshop" ||
        node.kind === "gamble" ||
        node.kind === "library" ||
        node.kind === "hunt"
      )
        run.phase = node.kind;
      if (node.kind === "shop") {
        run.phase = "shop";
        run.shopRaidFailed = false;
        run.shopRaidDeadlineRound = null;
        run.shopRemoved.fill(false);
        run.shop = run.combat.heroes.map((hero, actor) => {
          const items: ShopItem[] = shuffled(
            this.pool(run, actor),
            `${run.seed}:shop:${node.id}:${actor}`,
          )
            .slice(0, 3)
            .map((card, index) => ({
              id: `card-${index}`,
              kind: "card",
              card,
              price: Math.ceil(
                (35 + cards[card].cost * 10) *
                  ascensionProfile(run.ascension).shopPrice,
              ),
              sold: false,
            }));
          const relic = shuffled(
            Object.keys(relics) as RelicId[],
            `${run.seed}:relic-shop:${node.id}:${actor}`,
          ).find((id) => !hero.relics.includes(id));
          if (relic)
            items.push({
              id: "relic",
              kind: "relic",
              relic,
              price: Math.ceil(100 * ascensionProfile(run.ascension).shopPrice),
              sold: false,
            });
          items.push({
            id: "potion",
            kind: "potion",
            potion: shuffled(
              Object.keys(potions) as PotionId[],
              `${run.seed}:shop-potion:${node.id}:${actor}`,
            )[0],
            price: Math.ceil(30 * ascensionProfile(run.ascension).shopPrice),
            sold: false,
          });
          return items;
        });
      }
    } else if (run.phase === "event") {
      if (choice === "reroll") {
        run.luck = run.luck.map((amount) => amount - 1);
        run.event = shuffled(
          (Object.keys(storyEvents) as StoryEventId[]).filter(
            (id) => id !== run.event,
          ),
          `${run.seed}:event:${run.current}:reroll:${++run.eventRerolls}`,
        )[0];
        return;
      }
      if (choice !== "leave") {
        const event = storyEvents[run.event!];
        const effects = event.choices[Number(choice)].effects;
        run.combat.heroes.forEach((_, actor) =>
          this.eventEffects(run, actor, effects),
        );
      }
      run.phase = "recovery";
      run.nodeReady = run.pending.map((p) => !p.length);
      if (run.nodeReady.every(Boolean)) {
        this.finishNode(run);
      }
    } else if (run.phase === "oracle") {
      run.combat.heroes.forEach((_, actor) => {
        if (choice === "luck") run.luck[actor]++;
        if (choice === "heal") this.heal(run, actor, 8);
      });
      if (choice === "compass") run.compass = Math.min(4, run.compass + 1);
      this.finishNode(run);
    } else if (run.phase === "contract") {
      if (choice === "accept") {
        run.contract = "brood";
        run.combat.heroes.forEach((hero) => (hero.gold += 80));
      }
      this.finishNode(run);
    } else if (run.phase === "pawnshop") {
      if (choice === "sell")
        run.combat.heroes.forEach((hero, actor) => {
          const relic = shuffled(
            hero.relics,
            `${run.seed}:pawn:${run.current}:${actor}`,
          )[0];
          if (relic) hero.relics.splice(hero.relics.indexOf(relic), 1);
          hero.gold += 65;
        });
      if (choice === "buy")
        run.combat.heroes.forEach((hero, actor) => {
          hero.gold -= 45;
          this.gainRelic(run, actor, "pawn-buy");
        });
      this.finishNode(run);
    } else if (run.phase === "gamble") {
      if (choice === "safe")
        run.combat.heroes.forEach((hero) => (hero.gold += 15));
      if (choice === "risk") {
        const win = shuffled(
          [true, true, true, false, false],
          `${run.seed}:gamble:${run.current}`,
        )[0];
        run.combat.heroes.forEach((hero) => {
          if (win) hero.gold += 55;
          else {
            const damage = Math.min(hero.hp - 1, 12);
            hero.hp -= damage;
            run.combat.metrics.healthLost += damage;
          }
        });
      }
      this.finishNode(run);
    } else if (run.phase === "library") {
      if (choice === "bargain")
        run.combat.heroes.forEach((hero, actor) => {
          hero.gold += 50;
          this.gainRelic(run, actor, "library");
          this.gainCard(run, actor, "black_debt");
        });
      this.finishNode(run);
    } else if (run.phase === "hunt") {
      if (choice === "accept") run.hunt = true;
      this.finishNode(run);
    } else if (run.phase === "rift") {
      if (choice === "enter") this.enterRift(run);
      else this.finishNode(run);
    } else if (run.phase === "recruit") {
      if (choice !== "leave") {
        const offer = run.companionOffers.find(
          (candidate) => candidate.id === choice,
        );
        if (offer)
          run.companions.push({
            ...offer,
            battlesLeft:
              offer.mode === "limited"
                ? 1 + Math.floor(this.random() * 3)
                : null,
            active: true,
            dead: false,
          });
      }
      this.finishNode(run);
    } else if (run.phase === "treasure") {
      run.selectedRelic = choice as RelicId;
      run.phase = "holder";
    } else if (run.phase === "holder") {
      run.combat.heroes[Number(choice)].relics.push(run.selectedRelic!);
      run.selectedRelic = null;
      this.finishNode(run);
    }
  }
  private enterRift(run: ExpeditionRun) {
    run.sideReturn = {
      map: run.map,
      current: run.current,
      floor: run.floor,
      path: [...run.path],
      nodeStart: null,
    };
    run.side = true;
    run.map = generateSideMap(
      `${run.seed}:side:${run.chapter}:${run.current}`,
      run.chapter,
    );
    if (run.shopsSealed) this.sealShops(run);
    run.current = null;
    run.floor = -1;
    run.path = [];
    run.votes = {};
    run.nodeReady.fill(false);
    run.pending = run.combat.heroes.map(() => []);
    const cardsToConsume = shuffled(
      run.combat.heroes.flatMap((hero, actor) =>
        allCards(hero).map((card) => ({ actor, card })),
      ),
      `${run.seed}:side-cost:${run.current}`,
    ).slice(0, 2);
    for (const { actor, card } of cardsToConsume) {
      const hero = run.combat.heroes[actor];
      for (const pile of [
        hero.hand,
        hero.deck,
        hero.discard,
        hero.played,
        hero.exhaust,
      ]) {
        const index = pile.findIndex((candidate) => candidate.id === card.id);
        if (index >= 0) {
          pile.splice(index, 1);
          break;
        }
      }
    }
    const relicHolder = shuffled(
      run.combat.heroes.flatMap((hero, actor) =>
        hero.relics.map((relic) => ({ actor, relic })),
      ),
      `${run.seed}:side-relic-cost:${run.current}`,
    )[0];
    if (relicHolder) {
      const { actor, relic } = relicHolder,
        index = run.combat.heroes[actor].relics.indexOf(relic);
      if (index >= 0) run.combat.heroes[actor].relics.splice(index, 1);
    }
    this.finishNode(run);
  }
  private returnFromRift(run: ExpeditionRun) {
    const parent = run.sideReturn;
    if (!parent) {
      run.side = false;
      run.phase = "map";
      return;
    }
    run.map = parent.map;
    run.current = parent.current;
    run.floor = parent.floor;
    run.path = parent.path;
    run.sideReturn = null;
    run.side = false;
    run.votes = {};
    run.compass = Math.min(4, run.compass + 1);
    run.combat.heroes.forEach((hero) => (hero.gold += 80));
    this.finishNode(run);
  }
  private resourceSnapshot(run: ExpeditionRun): ExpeditionResourceSnapshot {
    return {
      compass: run.compass,
      heroes: run.combat.heroes.map((hero, actor) => ({
        actor,
        name: hero.name,
        hp: hero.hp,
        maxHp: hero.maxHp,
        gold: hero.gold,
        cards: allCards(hero).length,
        relics: [...hero.relics],
        potions: [...hero.potions],
      })),
      companions: run.companions.map((companion) => ({
        id: companion.id,
        name: companion.name,
        hp: companion.hp,
        status: companion.active ? "active" : companion.dead ? "dead" : "left",
      })),
    };
  }
  private finishNode(run: ExpeditionRun) {
    this.recordNodeResult(run);
    run.companionOffers = [];
    run.phase = "map";
    run.votes = {};
  }
  private recordNodeResult(run: ExpeditionRun) {
    if (!run.nodeStart) return;
    run.lastNodeResult = {
      sequence: run.sequence,
      nodeId: run.nodeStart.nodeId,
      nodeKind: run.nodeStart.nodeKind,
      before: run.nodeStart.resources,
      after: this.resourceSnapshot(run),
    };
    run.nodeStart = null;
  }
  private sealShops(run: ExpeditionRun) {
    run.map.flat().forEach((node) => {
      if (node.kind === "shop") node.kind = "empty";
    });
  }
  private companionAction(
    run: ExpeditionRun,
    companion: Companion,
    round: number,
  ) {
    if (run.combat.phase !== "combat") return;
    const card =
        companion.deck[
          (round + companion.profession + companion.id.length) %
            companion.deck.length
        ],
      cardDefinition = definition({
        id: `${companion.id}-${round}`,
        card,
        upgradeLevel: 0,
      }),
      livingEnemies = run.combat.enemies.flatMap((enemy, index) =>
        enemy.hp > 0 ? [index] : [],
      );
    if (!livingEnemies.length) return;
    const targets =
      cardDefinition.target === "all-enemies"
        ? livingEnemies.map((index) => ({
            side: "enemy" as const,
            index,
          }))
        : cardDefinition.target === "enemy"
          ? [
              {
                side: "enemy" as const,
                index: [...livingEnemies].sort(
                  (left, right) =>
                    run.combat.enemies[left].hp - run.combat.enemies[right].hp,
                )[0],
              },
            ]
          : [
              {
                side: "hero" as const,
                index: run.combat.heroes.reduce(
                  (lowest, hero, index, heroes) =>
                    hero.hp / hero.maxHp <
                    heroes[lowest].hp / heroes[lowest].maxHp
                      ? index
                      : lowest,
                  0,
                ),
              },
            ];
    combat.effects(run.combat, 0, cardDefinition.effects, targets);
    if (round === 1)
      combat.effects(run.combat, 0, relics[companion.relic].effects, [
        { side: "hero", index: 0 },
      ]);
    run.combat.log.push({
      id: run.combat.nextId++,
      text: `${companion.name}使用${cardDefinition.name}`,
    });
    run.combat.visuals.push({
      kind: "status",
      target: targets[0],
      amount: 1,
      label: `${companion.name} · ${cardDefinition.name}`,
    });
  }
  private settleCompanions(run: ExpeditionRun) {
    const battle = run.companionBattle;
    if (!battle || battle.settled) return;
    battle.settled = true;
    const companion = run.companions.find(
      (candidate) => candidate.id === battle.companionId,
    );
    if (!companion || !companion.active) return;
    companion.hp = Math.max(
      0,
      companion.hp -
        Math.ceil(
          Math.max(0, run.combat.metrics.healthLost - battle.healthLostStart) *
            0.18,
        ),
    );
    if (companion.mode === "limited" && companion.battlesLeft !== null)
      companion.battlesLeft = Math.max(0, companion.battlesLeft - 1);
    if (companion.hp <= 0) {
      if (companion.mode === "eternal")
        companion.hp = Math.max(1, Math.ceil(companion.maxHp * 0.5));
      else {
        companion.dead = true;
        companion.active = false;
        if (companion.mode === "limited")
          run.combat.heroes.forEach((_, actor) => this.heal(run, actor, 6));
      }
    }
    if (companion.mode === "limited" && companion.battlesLeft === 0)
      companion.active = false;
  }
  private rollCompanionOffers(run: ExpeditionRun): CompanionOffer[] {
    const names = ["苔灯", "折羽", "雾铃", "青铜仆从", "拾荒客", "白噪"],
      modes = ["fragile", "limited", "eternal"] as const,
      cards = ["strike", "defend", "quick", "protect", "bash", "heal"] as const;
    const offerModes = shuffled(
      [...modes],
      `${run.seed}:companion-modes:${run.current}`,
    );
    return Array.from({ length: 3 }, (_, index) => {
      const profession = Math.floor(this.random() * heroContent.length),
        mode = offerModes[index],
        relic = shuffled(
          Object.keys(relics) as RelicId[],
          `${run.seed}:companion-relic:${run.current}:${index}`,
        )[0],
        deck = shuffled(
          [...cards],
          `${run.seed}:companion-deck:${run.current}:${index}`,
        ).slice(0, 3),
        hpScale = mode === "fragile" ? 0.45 : mode === "limited" ? 0.65 : 0.55,
        maxHp = Math.max(8, Math.ceil(heroContent[profession].maxHp * hpScale));
      return {
        id: `companion-${run.sequence}-${index}`,
        name: `${names[(run.sequence + index) % names.length]}·${heroContent[profession].name}`,
        profession,
        mode,
        relic,
        deck: [...deck],
        hp: maxHp,
        maxHp,
      };
    });
  }
  private eventEffects(
    run: ExpeditionRun,
    actor: number,
    effects: readonly EventEffect[],
  ) {
    const hero = run.combat.heroes[actor];
    for (const effect of effects) {
      if (effect.kind === "gold") hero.gold += effect.amount;
      if (effect.kind === "hurt") {
        const damage = Math.min(hero.hp - 1, effect.amount);
        hero.hp -= damage;
        run.combat.metrics.healthLost += damage;
      }
      if (effect.kind === "heal") this.heal(run, actor, effect.amount);
      if (effect.kind === "maxHp") {
        hero.maxHp += effect.amount;
        this.heal(run, actor, effect.amount);
      }
      if (effect.kind === "upgrade" || effect.kind === "remove")
        run.pending[actor].push({ kind: effect.kind, left: effect.amount });
      if (effect.kind === "relic") {
        const id = shuffled(
          Object.keys(relics) as RelicId[],
          `${run.seed}:event-relic:${run.current}:${actor}`,
        ).find((id) => !hero.relics.includes(id));
        if (id) hero.relics.push(id);
      }
      if (effect.kind === "potion" && hero.potions.length < 3)
        hero.potions.push(
          shuffled(
            Object.keys(potions) as PotionId[],
            `${run.seed}:event-potion:${run.current}:${actor}`,
          )[0],
        );
      if (effect.kind === "card") this.gainCard(run, actor, effect.card);
    }
  }
  project(state: ExpeditionGameState, _actor: number): ExpeditionGameState {
    const next = structuredClone(state);
    next.view.seed = "";
    next.view.combat.seed = "";
    for (const hero of next.view.combat.heroes)
      hero.deck.sort(
        (a, b) => a.card.localeCompare(b.card) || a.id.localeCompare(b.id),
      );
    return next;
  }
}
