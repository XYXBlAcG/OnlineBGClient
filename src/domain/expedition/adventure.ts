import type { Rules } from "../plugin";
import type { Action, Candidate } from "../types";
import type { GameOptions } from "../game-options";
import { ExpeditionRules, allCards } from "./rules";
import {
  cards,
  heroContent,
  cardPools,
  commonCards,
  definition,
  type CardId,
  type CardInstance,
} from "./content";
import {
  potions,
  relics,
  storyEvents,
  type RelicId,
  type PotionId,
  type StoryEventId,
  type EventEffect,
} from "./world";
import {
  expeditionOptionsSchema,
  type ExpeditionRun,
  type ExpeditionGameState,
  type ExpeditionMove,
  type ShopItem,
} from "./adventure-types";
import { generateMap, mapChoices, encounterFor, nodeNames } from "./map";
import { shuffled } from "./random";
const combat = new ExpeditionRules();
const upgradable = (card: CardInstance) =>
  !card.upgraded &&
  definition(card).effects.some((effect) => effect.kind !== "cleanse");
export class ExpeditionAdventure implements Rules<"expedition"> {
  constructor(private readonly random: () => number = () => 0.5) {}
  create(
    players: number,
    _team = false,
    options?: GameOptions,
  ): ExpeditionGameState {
    if (players < 1 || players > 4) throw new Error("秘塔远征支持 1–4 名角色");
    const seed = `${this.random()}:${this.random()}`,
      config = expeditionOptionsSchema.parse(options?.expedition ?? {});
    const view: ExpeditionRun = {
      rulesVersion: 1,
      contentVersion: 1,
      runId: `exp-${Math.floor(this.random() * 2 ** 48).toString(36)}-${Math.floor(this.random() * 2 ** 48).toString(36)}`,
      seed,
      difficulty: config.difficulty,
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
      offers: [],
      event: null,
      treasure: [],
      selectedRelic: null,
      pending: Array.from({ length: players }, () => []),
      rewardElite: false,
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
        ["map", "event", "treasure", "holder"].includes(run.phase) &&
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
    const moves: { move: ExpeditionMove; label: string }[] = [];
    const add = (move: ExpeditionMove, label: string) =>
      moves.push({ move, label });
    if (run.phase === "profession" && run.professions[actor] === undefined)
      heroContent.forEach((h, profession) =>
        add({ type: "profession", profession }, `选择${h.name} · ${h.title}`),
      );
    if (run.phase === "map")
      mapChoices(run).forEach((node) =>
        add(
          { type: "vote", choice: node.id },
          `投票前往${nodeNames[node.kind]} · 第 ${node.floor + 1} 层`,
        ),
      );
    if (
      run.phase === "tie" &&
      actor === Math.max(0, run.floor) % run.combat.heroes.length
    )
      run.tieChoices.forEach((choice) => {
        const label =
          run.votePhase === "map"
            ? nodeNames[run.map.flat().find((node) => node.id === choice)!.kind]
            : run.votePhase === "event"
              ? choice === "leave"
                ? "离开"
                : storyEvents[run.event!].choices[Number(choice)].name
              : run.votePhase === "treasure"
                ? relics[choice as RelicId].name
                : run.combat.heroes[Number(choice)].name;
        add({ type: "tie", choice }, `领队决定：${label}`);
      });
    if (run.phase === "battle") {
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
      if (hero.hp > 0 && !hero.ready)
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
    }
    if (run.phase === "shop" && !run.nodeReady[actor]) {
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
        hero.gold >= 35 &&
        !run.shopRemoved[actor] &&
        allCards(hero).length > 5
      )
        for (const card of allCards(hero))
          add(
            { type: "remove", instance: card.id },
            `移除${definition(card).name} · 35 金币`,
          );
      add({ type: "done" }, "离开商店");
    }
    if (run.phase === "camp" && !run.nodeReady[actor]) {
      add({ type: "rest" }, `休息：恢复 ${Math.ceil(hero.maxHp * 0.35)} 生命`);
      allCards(hero)
        .filter(upgradable)
        .forEach((card) =>
          add(
            { type: "upgrade", instance: card.id },
            `升级${definition(card).name}`,
          ),
        );
      if (allCards(hero).length > 5)
        allCards(hero).forEach((card) =>
          add(
            { type: "remove", instance: card.id },
            `移除${definition(card).name}`,
          ),
        );
      add({ type: "done" }, "跳过营地");
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
    }
    if (run.phase === "recovery" && !run.nodeReady[actor]) {
      const next = run.pending[actor][0];
      if (next?.kind === "upgrade")
        allCards(hero)
          .filter(upgradable)
          .forEach((card) =>
            add(
              { type: "upgrade", instance: card.id },
              `升级${definition(card).name}`,
            ),
          );
      if (next?.kind === "remove" && allCards(hero).length > 5)
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
    run.sequence++;
    if (move.type === "profession") {
      run.professions[actor] = move.profession;
      if (Object.keys(run.professions).length === run.combat.heroes.length) {
        run.combat = combat.create(
          run.seed,
          run.combat.heroes.map((_, i) => run.professions[i]!),
          [],
        );
        run.combat.heroes.forEach((h) => {
          h.gold = 50;
          h.relics = [
            h.profession === 0
              ? "shell"
              : h.profession === 1
                ? "lens"
                : "salve",
          ];
        });
        run.phase = "map";
      }
    }
    if (move.type === "vote") {
      run.votes[actor] = move.choice;
      if (Object.keys(run.votes).length === run.combat.heroes.length) {
        const counts = new Map<string, number>();
        Object.values(run.votes).forEach((v) =>
          counts.set(v!, 1 + (counts.get(v!) ?? 0)),
        );
        const max = Math.max(...counts.values()),
          choices = [...counts]
            .filter(([, count]) => count === max)
            .map(([id]) => id);
        if (choices.length > 1) {
          run.votePhase = run.phase as ExpeditionRun["votePhase"];
          run.phase = "tie";
          run.tieChoices = choices;
        } else this.decide(run, choices[0]);
      }
    }
    if (move.type === "tie") {
      run.phase = run.votePhase;
      this.decide(run, move.choice);
    }
    if (
      move.type === "card" ||
      move.type === "ready" ||
      move.type === "unready"
    ) {
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
    if (move.type === "reward") {
      if (move.choice === "heal") this.heal(run, actor, 8);
      else if (move.choice !== "skip")
        this.gainCard(run, actor, move.choice as CardId);
      run.nodeReady[actor] = true;
      this.nodeDone(run);
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
      this.heal(run, actor, Math.ceil(hero.maxHp * 0.35));
      run.nodeReady[actor] = true;
      this.nodeDone(run);
    }
    if (move.type === "upgrade" || move.type === "remove") {
      const card = allCards(hero).find((card) => card.id === move.instance)!;
      if (move.type === "upgrade") card.upgraded = true;
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
          hero.gold -= 35;
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
      upgraded: false,
    });
  }
  private pool(run: ExpeditionRun, actor: number) {
    return [
      ...cardPools[run.combat.heroes[actor].profession],
      ...commonCards.filter((id) => !["strike", "defend"].includes(id)),
    ];
  }
  private afterCombat(run: ExpeditionRun) {
    if (run.combat.phase === "lost") {
      run.phase = "lost";
      return;
    }
    if (run.combat.phase !== "won") return;
    if (
      run.map.flat().find((node) => node.id === run.current)!.kind === "boss"
    ) {
      run.phase = "won";
      return;
    }
    run.phase = "reward";
    run.nodeReady.fill(false);
    run.offers = run.combat.heroes.map((hero, actor) => {
      hero.gold += 25 + run.floor * 3;
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
    if (run.phase === "reward" && run.rewardElite) {
      run.rewardElite = false;
      this.treasure(run);
    } else {
      run.phase = "map";
      run.votes = {};
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
    if (!run.treasure.length) run.phase = "map";
  }
  private decide(run: ExpeditionRun, choice: string) {
    run.votes = {};
    run.tieChoices = [];
    if (run.phase === "map") {
      const node = mapChoices(run).find((node) => node.id === choice)!;
      run.current = node.id;
      run.floor = node.floor;
      run.path.push(node.id);
      run.nodeReady.fill(false);
      run.pending = run.combat.heroes.map(() => []);
      run.marks = [];
      if (["battle", "elite", "boss"].includes(node.kind)) {
        run.combat = combat.begin(run.combat, encounterFor(run, node));
        run.phase = "battle";
        run.rewardElite = node.kind === "elite";
      }
      if (node.kind === "camp") run.phase = "camp";
      if (node.kind === "treasure") this.treasure(run);
      if (node.kind === "event") {
        run.event = shuffled(
          Object.keys(storyEvents) as StoryEventId[],
          `${run.seed}:event:${node.id}`,
        )[0];
        run.phase = "event";
      }
      if (node.kind === "shop") {
        run.phase = "shop";
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
              price: 35 + cards[card].cost * 10,
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
              price: 100,
              sold: false,
            });
          items.push({
            id: "potion",
            kind: "potion",
            potion: shuffled(
              Object.keys(potions) as PotionId[],
              `${run.seed}:shop-potion:${node.id}:${actor}`,
            )[0],
            price: 30,
            sold: false,
          });
          return items;
        });
      }
    } else if (run.phase === "event") {
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
        run.phase = "map";
      }
    } else if (run.phase === "treasure") {
      run.selectedRelic = choice as RelicId;
      run.phase = "holder";
    } else if (run.phase === "holder") {
      run.combat.heroes[Number(choice)].relics.push(run.selectedRelic!);
      run.selectedRelic = null;
      run.phase = "map";
    }
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
