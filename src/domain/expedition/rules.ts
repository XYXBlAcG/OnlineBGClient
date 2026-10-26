import { relics, potions, type RelicId, type RelicDefinition } from "./world";
import { shuffled } from "./random";
import {
  cards,
  definition,
  heroContent,
  encounters,
  type CardInstance,
  type CardId,
  type Effect,
  type EncounterDefinition,
} from "./content";
import type {
  ExpeditionState,
  ExpeditionAction,
  Fighter,
  Hero,
  Enemy,
  Target,
  Preview,
  Reward,
} from "./types";
export function allCards(hero: Hero): CardInstance[] {
  return [
    ...hero.hand,
    ...hero.deck,
    ...hero.discard,
    ...hero.played,
    ...hero.exhaust,
  ];
}
export function damageAmount(
  amount: number,
  source: Fighter,
  target: Fighter,
): number {
  return Math.floor(
    (amount + source.strength) *
      (target.vulnerable > 0 ? 1.5 : 1) *
      (source.weak > 0 ? 0.75 : 1),
  );
}
export function attackPlan(
  state: ExpeditionState,
  enemy: Enemy,
): { actor: number; amount: number; hits: number }[] {
  if (enemy.hp <= 0 || enemy.intent.kind !== "attack") return [];
  const intent = enemy.intent;
  const targets =
    intent.target === "all"
      ? state.heroes.flatMap((h, i) => (h.hp > 0 ? [i] : []))
      : [
          state.heroes[intent.target % state.heroes.length].hp > 0
            ? intent.target % state.heroes.length
            : state.heroes.findIndex((h) => h.hp > 0),
        ];
  return targets
    .filter((actor) => actor >= 0)
    .map((actor) => ({
      actor,
      amount: damageAmount(intent.amount, enemy, state.heroes[actor]),
      hits: intent.hits ?? 1,
    }));
}
export function incoming(state: ExpeditionState, actor: number): number {
  return state.enemies
    .flatMap((enemy) => attackPlan(state, enemy))
    .filter((hit) => hit.actor === actor)
    .reduce((sum, hit) => sum + hit.amount * hit.hits, 0);
}
export class ExpeditionRules {
  create(
    seed: string,
    professions: number[] = [0, 1],
    scenario: EncounterDefinition[] = encounters,
  ): ExpeditionState {
    const state: ExpeditionState = {
      seed,
      scenario: structuredClone(scenario),
      battleSerial: 0,
      encounter: 0,
      round: 1,
      phase: "combat",
      nextId: 0,
      sequence: 0,
      log: [],
      visuals: [],
      rewardOffers: [],
      rewards: {},
      enemies: [],
      heroes: [],
      metrics: {
        damage: 0,
        healthLost: 0,
        blocked: 0,
        healed: 0,
        cards: 0,
        rounds: 0,
        battlesWon: 0,
        byCard: {},
      },
      turns: [],
      turnStart: { damage: 0, blocked: 0, healthLost: 0, cards: 0 },
    };
    state.heroes = professions.map((profession) => {
      const h = heroContent[profession];
      return {
        profession,
        gold: 0,
        relics: [],
        potions: [],
        relicUses: {},
        name: h.name,
        hp: h.maxHp,
        maxHp: h.maxHp,
        block: 0,
        strength: 0,
        vulnerable: 0,
        poison: 0,
        weak: 0,
        dexterity: 0,
        thorns: 0,
        regen: 0,
        energy: 3,
        hand: [],
        deck: h.deck.map((card) => ({
          id: `c${state.nextId++}`,
          card,
          upgraded: false,
        })),
        discard: [],
        played: [],
        exhaust: [],
        ready: false,
        shuffles: 0,
      };
    });
    if (scenario.length) this.startEncounter(state);
    else state.phase = "setup";
    return state;
  }
  private log(state: ExpeditionState, text: string) {
    state.log.push({ id: ++state.sequence, text });
    state.log = state.log.slice(-60);
  }
  private draw(state: ExpeditionState, actor: number, amount: number) {
    const hero = state.heroes[actor];
    for (let n = 0; n < amount && hero.hand.length < 10; n++) {
      if (!hero.deck.length) {
        hero.deck = shuffled(
          hero.discard,
          `${state.seed}:shuffle:${state.encounter}:${state.battleSerial}:${actor}:${hero.shuffles++}`,
        );
        hero.discard = [];
      }
      const card = hero.deck.shift();
      if (!card) break;
      hero.hand.push(card);
    }
  }
  begin(
    state: ExpeditionState,
    encounter: EncounterDefinition,
  ): ExpeditionState {
    const next = structuredClone(state);
    next.encounter = 0;
    next.scenario = [structuredClone(encounter)];
    next.battleSerial++;
    this.startEncounter(next);
    return next;
  }
  private startEncounter(state: ExpeditionState) {
    state.phase = "combat";
    state.visuals = [];
    state.round = 1;
    state.rewards = {};
    state.rewardOffers = [];
    state.heroes.forEach((hero, actor) => {
      hero.deck = shuffled(
        allCards(hero),
        `${state.seed}:encounter:${state.encounter}:${state.battleSerial}:${actor}`,
      );
      hero.hand = [];
      hero.discard = [];
      hero.played = [];
      hero.exhaust = [];
      hero.block = 0;
      hero.strength = 0;
      hero.poison = 0;
      hero.weak = 0;
      hero.dexterity = 0;
      hero.thorns = 0;
      hero.regen = 0;
      hero.relicUses = {};
      hero.vulnerable = 0;
      hero.energy = 3;
      hero.ready = false;
      hero.shuffles = 0;
      this.draw(state, actor, 5);
    });
    state.enemies = state.scenario[state.encounter].enemies.map((e) => ({
      name: e.name,
      icon: e.icon,
      hp: e.hp,
      maxHp: e.hp,
      block: 0,
      strength: 0,
      vulnerable: 0,
      poison: 0,
      weak: 0,
      dexterity: 0,
      thorns: 0,
      regen: 0,
      intent: structuredClone(e.pattern[0]),
    }));
    state.turnStart = {
      damage: state.metrics.damage,
      blocked: state.metrics.blocked,
      healthLost: state.metrics.healthLost,
      cards: state.metrics.cards,
    };
    state.heroes.forEach((_, actor) => this.relic(state, actor, "start"));
    state.heroes.forEach((_, actor) => this.relic(state, actor, "round"));
    this.log(
      state,
      `进入${state.scenario[state.encounter].name}，双方开始行动`,
    );
  }
  candidates(state: ExpeditionState, actor: number): ExpeditionAction[] {
    if (state.phase === "reward") {
      if (state.rewards[actor]) return [];
      const hero = state.heroes[actor];
      return [
        ...state.rewardOffers[actor].map((card) => ({
          type: "reward" as const,
          actor,
          reward: { kind: "card" as const, card },
        })),
        ...(hero.hp < hero.maxHp
          ? [
              {
                type: "reward" as const,
                actor,
                reward: { kind: "heal" as const },
              },
            ]
          : []),
        ...(allCards(hero).some((c) => c.card === "strike" && !c.upgraded)
          ? [
              {
                type: "reward" as const,
                actor,
                reward: { kind: "upgrade" as const },
              },
            ]
          : []),
        { type: "reward", actor, reward: { kind: "skip" } },
      ];
    }
    if (state.phase !== "combat") return [];
    const hero = state.heroes[actor];
    if (!hero || hero.hp <= 0) return [];
    if (hero.ready) return [{ type: "unready", actor }];
    const actions: ExpeditionAction[] = [];
    for (const instance of hero.hand) {
      const card = definition(instance);
      if (card.cost > hero.energy) continue;
      if (card.target === "enemy" || card.target === "ally") {
        const side = card.target === "enemy" ? "enemy" : "hero";
        (side === "enemy" ? state.enemies : state.heroes).forEach(
          (target, index) => {
            if (target.hp > 0)
              actions.push({
                type: "play",
                actor,
                instance: instance.id,
                target: { side, index },
              });
          },
        );
      } else actions.push({ type: "play", actor, instance: instance.id });
    }
    actions.push({ type: "ready", actor });
    return actions;
  }
  private hit(
    state: ExpeditionState,
    target: Target,
    amount: number,
    source?: number,
    piercing = false,
    origin?: Target,
  ) {
    const fighter =
      target.side === "hero"
        ? state.heroes[target.index]
        : state.enemies[target.index];
    const absorbed = piercing ? 0 : Math.min(fighter.block, amount),
      damage = Math.min(fighter.hp, amount - absorbed);
    fighter.block -= absorbed;
    fighter.hp -= damage;
    if (target.side === "hero") {
      state.metrics.blocked += absorbed;
      state.metrics.healthLost += damage;
    } else state.metrics.damage += damage;
    if (damage)
      state.visuals.push({
        kind: "damage",
        target,
        amount: damage,
        source,
        ...(origin ? { origin } : {}),
      });
    if (absorbed)
      state.visuals.push({
        kind: "block",
        target,
        amount: absorbed,
        source,
        ...(origin ? { origin } : {}),
      });
    this.log(
      state,
      `${fighter.name ?? "目标"}受到 ${damage} 伤害${absorbed ? `，格挡吸收 ${absorbed}` : ""}`,
    );
  }
  private effect(
    state: ExpeditionState,
    actor: number,
    effect: Effect,
    target: Target,
  ) {
    const hero = state.heroes[actor],
      fighter =
        target.side === "hero"
          ? state.heroes[target.index]
          : state.enemies[target.index];
    if (effect.kind === "damage")
      this.hit(
        state,
        target,
        damageAmount(
          effect.amount +
            (effect.scale === "block"
              ? hero.block
              : effect.scale === "poison"
                ? fighter.poison * 2
                : effect.scale === "played"
                  ? hero.played.length * 2
                  : effect.scale === "marked" && fighter.vulnerable > 0
                    ? 6
                    : 0),
          hero,
          fighter,
        ),
        actor,
      );
    if (
      effect.kind === "damage" &&
      target.side === "enemy" &&
      fighter.thorns > 0
    )
      this.hit(
        state,
        { side: "hero", index: actor },
        fighter.thorns,
        undefined,
        true,
      );
    if (effect.kind === "block") {
      const recipient = target.side === "enemy" ? hero : fighter;
      const index = target.side === "enemy" ? actor : target.index;
      recipient.block += effect.amount + recipient.dexterity;
      state.visuals.push({
        kind: "block",
        target: { side: "hero", index },
        amount: effect.amount + recipient.dexterity,
        source: actor,
      });
    }
    if (effect.kind === "heal") {
      const gain = Math.min(fighter.maxHp - fighter.hp, effect.amount);
      fighter.hp += gain;
      state.metrics.healed += gain;
      state.visuals.push({ kind: "heal", target, amount: gain, source: actor });
    }
    if (effect.kind === "draw" && target.side === "hero")
      this.draw(state, target.index, effect.amount);
    if (effect.kind === "energy" && target.side === "hero")
      state.heroes[target.index].energy += effect.amount;
    if (
      [
        "strength",
        "weak",
        "dexterity",
        "thorns",
        "regen",
        "vulnerable",
        "poison",
      ].includes(effect.kind)
    ) {
      const kind = effect.kind as
        | "strength"
        | "weak"
        | "dexterity"
        | "thorns"
        | "regen"
        | "vulnerable"
        | "poison";
      fighter[kind] += effect.amount;
      state.visuals.push({
        kind: "status",
        target,
        amount: effect.amount,
        source: actor,
      });
    }
    if (effect.kind === "cleanse") {
      fighter.poison = 0;
      fighter.vulnerable = 0;
      fighter.weak = 0;
    }
  }
  effects(
    state: ExpeditionState,
    actor: number,
    effects: readonly Effect[],
    targets: Target[],
  ) {
    const hero = state.heroes[actor];
    for (const effect of effects) {
      const recipients: Target[] =
        effect.target === "party"
          ? state.heroes.flatMap((h, index) =>
              h.hp > 0 ? [{ side: "hero" as const, index }] : [],
            )
          : effect.target === "self" ||
              (["draw", "energy", "strength", "dexterity", "thorns"].includes(
                effect.kind,
              ) &&
                targets[0]?.side === "enemy")
            ? [{ side: "hero", index: actor }]
            : targets;
      for (const target of recipients) {
        const fighter =
          target.side === "enemy"
            ? state.enemies[target.index]
            : state.heroes[target.index];
        if (!fighter || fighter.hp <= 0) continue;
        const alive = fighter.hp;
        this.effect(state, actor, effect, target);
        if (target.side === "enemy" && alive > 0 && fighter.hp <= 0)
          this.relic(state, actor, "kill");
      }
    }
  }
  relic(
    state: ExpeditionState,
    actor: number,
    trigger: RelicDefinition["trigger"],
    cardType?: "attack" | "skill",
  ) {
    const hero = state.heroes[actor];
    for (const id of hero.relics) {
      const relic: RelicDefinition = relics[id];
      if (
        relic.trigger !== trigger ||
        (relic.cardType && relic.cardType !== cardType)
      )
        continue;
      const n = (hero.relicUses[id] ?? 0) + 1;
      hero.relicUses[id] = n;
      if (n % (relic.every ?? 1)) continue;
      this.effects(state, actor, relic.effects, [
        { side: "hero", index: actor },
      ]);
    }
  }
  potion(
    state: ExpeditionState,
    actor: number,
    index: number,
    target?: Target,
  ): ExpeditionState {
    if (state.phase !== "combat" || state.heroes[actor]?.ready)
      throw new Error("当前不能使用药水");
    const id = state.heroes[actor].potions[index];
    if (!id) throw new Error("药水不存在");
    const potion = potions[id],
      aim = target ?? { side: "hero" as const, index: actor };
    if (
      (potion.target === "enemy"
        ? aim.side !== "enemy"
        : aim.side !== "hero") ||
      (potion.target === "self" && aim.index !== actor)
    )
      throw new Error("药水目标无效");
    if (
      !(
        aim.side === "hero" ? state.heroes[aim.index] : state.enemies[aim.index]
      )?.hp
    )
      throw new Error("目标已失效");
    const next = structuredClone(state);
    next.visuals = [];
    next.heroes[actor].potions.splice(index, 1);
    this.effects(next, actor, potion.effects, [aim]);
    this.log(next, `${next.heroes[actor].name}使用${potion.name}`);
    this.victory(next);
    return next;
  }
  private finishTurn(state: ExpeditionState) {
    state.turns.push({
      encounter: state.encounter,
      round: state.round,
      damage: state.metrics.damage - state.turnStart.damage,
      blocked: state.metrics.blocked - state.turnStart.blocked,
      healthLost: state.metrics.healthLost - state.turnStart.healthLost,
      cards: state.metrics.cards - state.turnStart.cards,
    });
    state.metrics.rounds++;
    state.turnStart = {
      damage: state.metrics.damage,
      blocked: state.metrics.blocked,
      healthLost: state.metrics.healthLost,
      cards: state.metrics.cards,
    };
  }
  private victory(state: ExpeditionState) {
    if (state.heroes.every((h) => h.hp <= 0)) {
      state.phase = "lost";
      this.finishTurn(state);
      this.log(state, "队伍全部倒地，冒险结束");
      return true;
    }
    if (!state.enemies.every((e) => e.hp <= 0)) return false;
    this.finishTurn(state);
    state.metrics.battlesWon++;
    this.log(state, `${state.scenario[state.encounter].name}胜利`);
    state.heroes.forEach((hero) => {
      if (hero.hp === 0) {
        hero.hp = Math.ceil(hero.maxHp / 4);
        state.metrics.healed += hero.hp;
      }
    });
    state.heroes.forEach((_, actor) => this.relic(state, actor, "victory"));
    state.phase =
      state.encounter === state.scenario.length - 1 ? "won" : "reward";
    if (state.phase === "reward")
      state.rewardOffers = state.heroes.map((hero, actor) =>
        shuffled(
          heroContent[hero.profession].rewards,
          `${state.seed}:reward:${state.encounter}:${state.battleSerial}:${actor}`,
        ).slice(0, 3),
      );
    return true;
  }
  private enemiesAct(state: ExpeditionState) {
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.block = 0;
      if (enemy.poison) {
        this.hit(
          state,
          { side: "enemy", index: state.enemies.indexOf(enemy) },
          enemy.poison,
          undefined,
          true,
        );
        enemy.poison--;
      }
      if (enemy.hp <= 0) continue;
      const intent = enemy.intent;
      if (intent.kind === "block") enemy.block += intent.amount;
      if (intent.kind === "strength") enemy.strength += intent.amount;
      for (const attack of attackPlan(state, enemy))
        for (
          let hit = 0;
          hit < attack.hits && state.heroes[attack.actor].hp > 0;
          hit++
        ) {
          this.hit(
            state,
            { side: "hero", index: attack.actor },
            attack.amount,
            undefined,
            false,
            { side: "enemy", index: state.enemies.indexOf(enemy) },
          );
          if (state.heroes[attack.actor].thorns > 0)
            this.hit(
              state,
              { side: "enemy", index: state.enemies.indexOf(enemy) },
              state.heroes[attack.actor].thorns,
              attack.actor,
              true,
            );
          if (enemy.hp <= 0) break;
        }
      if (state.heroes.every((h) => h.hp <= 0)) {
        state.phase = "lost";
        this.finishTurn(state);
        this.log(state, "队伍全部倒地，冒险结束");
        return;
      }
    }
    if (this.victory(state)) return;
    this.finishTurn(state);
    state.round++;
    state.heroes.forEach((hero, actor) => {
      hero.discard.push(...hero.hand, ...hero.played);
      hero.hand = [];
      hero.played = [];
      hero.block = 0;
      hero.energy = 3;
      hero.ready = hero.hp <= 0;
      hero.vulnerable = Math.max(0, hero.vulnerable - 1);
      hero.weak = Math.max(0, hero.weak - 1);
      if (hero.hp > 0 && hero.regen > 0) {
        this.effects(
          state,
          actor,
          [{ kind: "heal", amount: hero.regen }],
          [{ side: "hero", index: actor }],
        );
        hero.regen--;
      }
      if (hero.hp > 0 && hero.poison > 0) {
        this.hit(
          state,
          { side: "hero", index: actor },
          hero.poison,
          undefined,
          true,
        );
        hero.poison--;
      }
      if (hero.hp > 0) {
        this.draw(state, actor, 5);
        this.relic(state, actor, "round");
      }
    });
    if (state.heroes.every((h) => h.hp <= 0)) {
      state.phase = "lost";
      this.log(state, "队伍全部倒地，冒险结束");
      return;
    }
    state.heroes.forEach((hero) => (hero.ready = hero.hp <= 0));
    state.enemies.forEach((enemy, index) => {
      enemy.vulnerable = Math.max(0, enemy.vulnerable - 1);
      enemy.weak = Math.max(0, enemy.weak - 1);
      const pattern = state.scenario[state.encounter].enemies[index].pattern;
      enemy.intent = structuredClone(
        pattern[(state.round - 1) % pattern.length],
      );
    });
    this.log(state, `第 ${state.round} 回合，存活角色各补充 3 能量并抽 5 张`);
  }
  apply(state: ExpeditionState, action: ExpeditionAction): ExpeditionState {
    const valid =
      action.type === "continue"
        ? state.phase === "reward" &&
          state.heroes.every((_, i) => !!state.rewards[i])
        : this.candidates(state, action.actor).some(
            (a) => JSON.stringify(a) === JSON.stringify(action),
          );
    if (!valid) throw new Error("当前动作已失效，局面未改变");
    const next = structuredClone(state);
    next.visuals = [];
    if (action.type === "continue") {
      next.encounter++;
      this.startEncounter(next);
      return next;
    }
    const hero = next.heroes[action.actor];
    if (action.type === "play") {
      const index = hero.hand.findIndex((c) => c.id === action.instance),
        instance = hero.hand.splice(index, 1)[0],
        card = definition(instance);
      hero.energy -= card.cost;
      (card.exhaust ? hero.exhaust : hero.played).push(instance);
      next.metrics.cards++;
      next.metrics.byCard[instance.card] =
        (next.metrics.byCard[instance.card] ?? 0) + 1;
      this.log(next, `${hero.name}使用${card.name}（${card.cost} 能量）`);
      const targets: Target[] =
        card.target === "all-enemies"
          ? next.enemies.flatMap((e, index) =>
              e.hp > 0 ? [{ side: "enemy" as const, index }] : [],
            )
          : [action.target ?? { side: "hero", index: action.actor }];
      this.effects(next, action.actor, card.effects, targets);
      this.relic(
        next,
        action.actor,
        "card",
        card.effects.some((e) => e.kind === "damage") ? "attack" : "skill",
      );
      this.victory(next);
    }
    if (action.type === "ready" || action.type === "unready") {
      hero.ready = action.type === "ready";
      this.log(next, `${hero.name}${hero.ready ? "结束行动" : "取消结束"}`);
      if (next.heroes.every((h) => h.ready || h.hp <= 0)) this.enemiesAct(next);
    }
    if (action.type === "reward") {
      this.reward(next, action.actor, action.reward);
      next.rewards[action.actor] = action.reward;
    }
    return next;
  }
  private reward(state: ExpeditionState, actor: number, reward: Reward) {
    const hero = state.heroes[actor];
    if (reward.kind === "card") {
      hero.discard.push({
        id: `c${state.nextId++}`,
        card: reward.card,
        upgraded: false,
      });
      this.log(state, `${hero.name}获得${cards[reward.card].name}`);
    }
    if (reward.kind === "heal") {
      const gain = Math.min(8, hero.maxHp - hero.hp);
      hero.hp += gain;
      state.metrics.healed += gain;
      this.log(state, `${hero.name}恢复 ${gain} 生命`);
    }
    if (reward.kind === "upgrade") {
      const card = allCards(hero).find(
        (c) => c.card === "strike" && !c.upgraded,
      )!;
      card.upgraded = true;
      this.log(state, `${hero.name}升级打击：6 → 9 伤害`);
    }
    if (reward.kind === "skip") this.log(state, `${hero.name}跳过奖励`);
  }
  preview(state: ExpeditionState, action: ExpeditionAction): Preview {
    const next = this.apply(state, action);
    return {
      heroes: next.heroes.map(({ hp, block, energy }) => ({
        hp,
        block,
        energy,
      })),
      enemies: next.enemies.map(({ hp, block }) => ({ hp, block })),
      events: next.visuals,
    };
  }
}
