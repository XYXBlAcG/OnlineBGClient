import {
  expeditionResources,
  initialResources,
  heatRule,
  enemyThornsRule,
  resourceEffects,
} from "./resources";
import { relics, potions, type RelicDefinition } from "./world";
import { shuffled } from "./random";
import {
  cards,
  canUpgrade,
  definition,
  heroContent,
  encounters,
  type CardInstance,
  type Effect,
  type EncounterDefinition,
  type EncounterMechanicDefinition,
  type EnemyDefinition,
} from "./content";
import {
  encounterModifierEffect,
  type EncounterModifierEffects,
} from "./modifiers";
import { enemyTraits, type EnemyTraitId } from "./enemy-traits";
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
  ].filter((card) => !definition(card).temporary);
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
export function intentTargets(
  state: ExpeditionState,
  target: number | "all",
): number[] {
  return target === "all"
    ? state.heroes.flatMap((hero, index) => (hero.hp > 0 ? [index] : []))
    : [
        state.heroes[target % state.heroes.length].hp > 0
          ? target % state.heroes.length
          : state.heroes.findIndex((hero) => hero.hp > 0),
      ].filter((index) => index >= 0);
}
export function attackPlan(
  state: ExpeditionState,
  enemy: Enemy,
): { actor: number; amount: number; hits: number }[] {
  if (enemy.hp <= 0 || enemy.intent.kind !== "attack") return [];
  const intent = enemy.intent;
  const targets = intentTargets(state, intent.target);
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
      summons: [],
      modifiers: [],
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
        ...initialResources(),
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
          upgradeLevel: 0,
        })),
        discard: [],
        played: [],
        exhaust: [],
        ready: false,
        shuffles: 0,
        spore: 0,
        tether: null,
        silenced: 0,
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
  private mechanicDefinition(
    state: ExpeditionState,
  ): EncounterMechanicDefinition | undefined {
    return state.scenario[state.encounter]?.mechanic;
  }
  private traitTotal(
    enemy: Enemy,
    key: keyof Omit<(typeof enemyTraits)[EnemyTraitId], "name" | "description">,
  ) {
    return (enemy.traits ?? []).reduce(
      (total, id) => total + Number(enemyTraits[id][key] ?? 0),
      0,
    );
  }
  private modifierTotal(
    state: ExpeditionState,
    key: keyof EncounterModifierEffects,
  ) {
    return encounterModifierEffect(state.modifiers, key);
  }
  private mechanicBoss(state: ExpeditionState): Enemy | undefined {
    return (
      state.enemies.find((enemy) => enemy.role === "boss" && enemy.hp > 0) ??
      state.enemies.find((enemy) => enemy.hp > 0)
    );
  }
  private mechanicEvent(
    state: ExpeditionState,
    kind: "mechanic" | "phase" | "break" | "status",
    label: string,
    target?: Target,
  ) {
    const boss = this.mechanicBoss(state);
    const index = boss ? state.enemies.indexOf(boss) : 0;
    state.visuals.push({
      kind,
      target: target ?? { side: "enemy", index },
      amount: state.mechanic?.track ?? 0,
      label,
    });
    this.log(state, label);
  }
  private aliveParts(state: ExpeditionState, part?: string) {
    return state.enemies.filter(
      (enemy) =>
        enemy.role === "part" && enemy.hp > 0 && (!part || enemy.part === part),
    ).length;
  }
  private linkedPairs(state: ExpeditionState) {
    const linked = new Set<number>();
    return state.heroes.reduce((count, hero, index) => {
      if (
        linked.has(index) ||
        hero.hp <= 0 ||
        hero.tether === null ||
        state.heroes[hero.tether]?.tether !== index
      )
        return count;
      linked.add(index);
      linked.add(hero.tether);
      return count + 1;
    }, 0);
  }
  private linkHeroes(state: ExpeditionState) {
    const mechanic = state.mechanic;
    if (!mechanic) return;
    const living = state.heroes.flatMap((hero, index) =>
      hero.hp > 0 ? [index] : [],
    );
    if (!living.length) return;
    const targetPairs = Math.min(
      mechanic.phase > 0 ? 2 : 1,
      Math.floor(living.length / 2),
    );
    state.heroes.forEach((hero) => (hero.tether = null));
    for (let pair = 0; pair < targetPairs; pair++) {
      const left =
          living[(state.round + pair * 3 + mechanic.phase) % living.length],
        right =
          living[(state.round + pair * 3 + 1 + mechanic.phase) % living.length];
      if (left === right) continue;
      state.heroes[left].tether = right;
      state.heroes[right].tether = left;
    }
    mechanic.track = this.linkedPairs(state);
    if (mechanic.track) this.mechanicEvent(state, "mechanic", "根须重新缠结");
  }
  private startMechanic(state: ExpeditionState) {
    const definition = this.mechanicDefinition(state);
    if (!definition) {
      delete state.mechanic;
      return;
    }
    state.mechanic = {
      id: definition.id,
      track: definition.track.initial ?? 0,
      max: definition.track.max,
      phase: 0,
      roundCards: 0,
    };
    if (definition.id === "roots") this.linkHeroes(state);
    if (definition.id === "symbiosis")
      state.mechanic.track = state.enemies.filter(
        (enemy) =>
          enemy.hp > 0 && (enemy.role === "boss" || enemy.part === "twin"),
      ).length;
  }
  private enterMechanicPhase(state: ExpeditionState) {
    const mechanic = state.mechanic,
      definition = this.mechanicDefinition(state);
    if (!mechanic || !definition || mechanic.phase > 0) return;
    mechanic.phase = 1;
    if (mechanic.id === "fate" || mechanic.id === "tempo") mechanic.max = 4;
    if (mechanic.id === "mirror") mechanic.max = 3;
    if (mechanic.id === "brood") mechanic.max = 2;
    if (mechanic.id === "silence") mechanic.max = 3;
    if (mechanic.id === "tide") {
      mechanic.max = 3;
      const boss = this.mechanicBoss(state);
      if (boss) boss.strength += 2;
    }
    if (mechanic.id === "furnace") {
      const boss = this.mechanicBoss(state);
      if (boss) {
        boss.block = 0;
        boss.vulnerable += 2;
      }
    }
    if (mechanic.id === "trial") {
      const boss = this.mechanicBoss(state);
      if (boss) boss.strength += 2;
    }
    if (mechanic.id === "symbiosis") {
      const boss = this.mechanicBoss(state);
      if (boss) boss.strength += 3;
    }
    if (mechanic.id === "brood")
      state.enemies
        .filter((enemy) => enemy.hp > 0 && enemy.role === "minion")
        .forEach((enemy) => (enemy.strength += 1));
    state.enemies.forEach((enemy) => {
      if (
        enemy.hp > 0 &&
        (enemy.role === "boss" || enemy.part === "twin") &&
        enemy.phasePattern
      ) {
        enemy.phase = 1;
        enemy.intent = structuredClone(enemy.phasePattern[0]);
      }
    });
    if (mechanic.id === "roots") this.linkHeroes(state);
    this.mechanicEvent(state, "phase", definition.phaseName);
  }
  private checkMechanicPhase(state: ExpeditionState) {
    const mechanic = state.mechanic,
      definition = this.mechanicDefinition(state),
      boss = state.enemies.find((enemy) => enemy.role === "boss");
    if (
      mechanic &&
      definition &&
      mechanic.id !== "symbiosis" &&
      mechanic.phase === 0 &&
      boss &&
      boss.hp > 0 &&
      boss.hp / boss.maxHp <= definition.phaseThreshold
    )
      this.enterMechanicPhase(state);
  }
  private repeatIntent(
    state: ExpeditionState,
    enemy: Enemy,
    intent: Enemy["intent"],
  ) {
    if (intent.kind === "block") enemy.block += intent.amount;
    if (intent.kind === "strength") enemy.strength += intent.amount;
    if (intent.kind === "thorns")
      enemy.thorns = Math.min(
        enemyThornsRule.maximum,
        enemy.thorns + intent.amount,
      );
    if (intent.kind === "heal")
      state.enemies
        .filter((member) => member.hp > 0)
        .forEach(
          (member) =>
            (member.hp = Math.min(member.maxHp, member.hp + intent.amount)),
        );
    if (intent.kind === "poison" || intent.kind === "weak")
      for (const target of intentTargets(state, intent.target))
        state.heroes[target][intent.kind] +=
          intent.amount + Number(intent.kind === "weak");
    if (intent.kind === "attack")
      for (const attack of attackPlan(state, { ...enemy, intent }))
        for (
          let hit = 0;
          hit < attack.hits && state.heroes[attack.actor].hp > 0;
          hit++
        )
          this.hit(
            state,
            { side: "hero", index: attack.actor },
            attack.amount,
            undefined,
            false,
            { side: "enemy", index: state.enemies.indexOf(enemy) },
          );
  }
  private resolveMechanic(state: ExpeditionState) {
    const mechanic = state.mechanic,
      boss = this.mechanicBoss(state);
    if (!mechanic || !boss) return;
    if (mechanic.id === "trial") {
      this.mechanicEvent(state, "mechanic", "审判降临");
      state.heroes.forEach((hero, index) => {
        if (hero.hp > 0)
          this.hit(
            state,
            { side: "hero", index },
            5 + mechanic.phase * 2,
            undefined,
            false,
            { side: "enemy", index: state.enemies.indexOf(boss) },
          );
      });
      boss.block += 6;
      mechanic.track = 0;
    }
    if (mechanic.id === "fate") {
      this.mechanicEvent(state, "mechanic", "命运重演");
      if (mechanic.lastIntent)
        this.repeatIntent(state, boss, structuredClone(mechanic.lastIntent));
      else boss.block += 6;
      mechanic.track = 0;
    }
    if (mechanic.id === "furnace") {
      const valves = this.aliveParts(state, "valve");
      if (valves) {
        this.mechanicEvent(state, "mechanic", "熔炉喷发");
        state.heroes.forEach((hero, index) => {
          if (hero.hp > 0)
            this.hit(
              state,
              { side: "hero", index },
              12 + mechanic.phase * 4,
              undefined,
              false,
              { side: "enemy", index: state.enemies.indexOf(boss) },
            );
        });
        mechanic.track = 6;
      } else {
        this.mechanicEvent(state, "mechanic", "冷却失效 · 巨像过热");
        boss.stunned = 1;
        boss.vulnerable += 2;
        mechanic.track = 4;
      }
    }
    if (mechanic.id === "tempo") {
      this.mechanicEvent(state, "mechanic", "钟摆过载");
      boss.block += 5 + mechanic.phase * 2;
      boss.strength += 1;
      mechanic.track = 0;
    }
    if (mechanic.id === "mirror") {
      this.mechanicEvent(state, "mechanic", "镜面回响");
      boss.block += 10 + mechanic.phase * 2;
      boss.thorns = Math.min(enemyThornsRule.maximum, boss.thorns + 2);
      boss.strength += 1;
      mechanic.track = 0;
    }
    if (mechanic.id === "tide") {
      this.mechanicEvent(state, "mechanic", "满潮爆发");
      state.heroes.forEach((hero, index) => {
        if (hero.hp > 0)
          this.hit(
            state,
            { side: "hero", index },
            8 + mechanic.phase * 3,
            undefined,
            false,
            { side: "enemy", index: state.enemies.indexOf(boss) },
          );
      });
      boss.block += 8 + mechanic.phase * 3;
      if (mechanic.phase > 0) boss.strength += 1;
      mechanic.track = 0;
    }
    if (mechanic.id === "brood") {
      this.mechanicEvent(state, "mechanic", "母巢脉冲");
      boss.block += 6 + mechanic.phase * 2;
      state.enemies
        .filter((enemy) => enemy.hp > 0 && enemy.role === "minion")
        .forEach((enemy) => (enemy.strength += 1));
      mechanic.track = 0;
    }
    if (mechanic.id === "silence") {
      const living = state.heroes.flatMap((hero, index) =>
          hero.hp > 0 ? [index] : [],
        ),
        target =
          living[(state.round + mechanic.phase) % Math.max(1, living.length)];
      if (target !== undefined) {
        this.mechanicEvent(state, "mechanic", "圣咏封口", {
          side: "hero",
          index: target,
        });
        this.sealHand(state, target, 2 + mechanic.phase);
        this.silenceHero(state, target, 1);
      }
      mechanic.track = 0;
    }
    if (mechanic.id === "tribute") {
      const target = [...state.heroes]
        .map((hero, index) => ({ hero, index }))
        .filter(({ hero }) => hero.hp > 0)
        .sort((left, right) => right.hero.gold - left.hero.gold)[0];
      if (target) {
        this.mechanicEvent(state, "mechanic", "贡赋清算", {
          side: "hero",
          index: target.index,
        });
        this.stealGold(state, boss, target.index, 15 + mechanic.phase * 10);
        boss.block += 8 + mechanic.phase * 3;
        boss.strength += target.hero.gold >= 40 ? 1 + mechanic.phase : 0;
      }
      mechanic.track = 0;
    }
  }
  private advanceMechanic(state: ExpeditionState, amount: number) {
    const mechanic = state.mechanic;
    if (!mechanic || amount <= 0) return;
    mechanic.track += amount;
    if (mechanic.track >= mechanic.max) this.resolveMechanic(state);
  }
  private mechanicCardPlayed(
    state: ExpeditionState,
    effects: readonly Effect[],
  ) {
    const mechanic = state.mechanic;
    if (!mechanic) return;
    mechanic.roundCards++;
    if (mechanic.id === "fate" && mechanic.roundCards % 2 === 0)
      this.advanceMechanic(state, 1);
    if (mechanic.id === "tempo") this.advanceMechanic(state, 1);
    if (mechanic.id === "mirror") {
      const kind = effects.some((effect) => effect.kind === "damage")
        ? "attack"
        : "skill";
      if (mechanic.lastCardKind === kind) this.advanceMechanic(state, 1);
      else if (mechanic.track > 0) mechanic.track--;
      mechanic.lastCardKind = kind;
    }
  }
  private mechanicCleansed(state: ExpeditionState, actor: number) {
    const mechanic = state.mechanic;
    if (!mechanic) return;
    if (mechanic.id === "fate" && mechanic.track > 0) {
      mechanic.track--;
      this.mechanicEvent(state, "mechanic", "净化拨回命运", {
        side: "hero",
        index: actor,
      });
    }
    if (mechanic.id === "roots") {
      const partner = state.heroes[actor].tether;
      state.heroes[actor].tether = null;
      if (partner !== null && state.heroes[partner]?.tether === actor)
        state.heroes[partner].tether = null;
      mechanic.track = this.linkedPairs(state);
      this.mechanicEvent(state, "break", "根须被净化斩断", {
        side: "hero",
        index: actor,
      });
    }
  }
  private mechanicPartDefeated(state: ExpeditionState, index: number) {
    const mechanic = state.mechanic,
      part = state.enemies[index];
    if (!mechanic) return;
    if (
      mechanic.id === "symbiosis" &&
      (part.role === "boss" || part.part === "twin")
    ) {
      this.mechanicEvent(state, "break", `${part.name}倒下`, {
        side: "enemy",
        index,
      });
      mechanic.track = state.enemies.filter(
        (enemy) =>
          enemy.hp > 0 && (enemy.role === "boss" || enemy.part === "twin"),
      ).length;
      if (mechanic.track === 1) this.enterMechanicPhase(state);
      return;
    }
    if (part.role !== "part") return;
    this.mechanicEvent(state, "break", `${part.name}被击破`, {
      side: "enemy",
      index,
    });
    if (mechanic.id === "trial") {
      if (part.part === "judgment") mechanic.track = 0;
      if (part.part === "seal") {
        const boss = this.mechanicBoss(state);
        if (boss) boss.block = 0;
      }
      if (this.aliveParts(state) === 0) {
        const boss = this.mechanicBoss(state);
        if (boss) boss.stunned = 1;
      }
    }
    if (mechanic.id === "furnace" && part.part === "valve")
      mechanic.track = Math.max(0, mechanic.track - 5);
    if (mechanic.id === "silence" && part.part === "silence-seal") {
      mechanic.track = 0;
      state.heroes.forEach((hero) => {
        hero.silenced = 0;
        hero.hand = hero.hand.filter(
          (instance) => !definition(instance).temporary,
        );
      });
    }
  }
  private spawnMinion(
    state: ExpeditionState,
    sourceIndex: number,
    template: EnemyDefinition,
  ) {
    const slot =
      state.enemies.findIndex(
        (enemy, index) => index !== sourceIndex && enemy.hp <= 0,
      ) >= 0
        ? state.enemies.findIndex(
            (enemy, index) => index !== sourceIndex && enemy.hp <= 0,
          )
        : state.enemies.length < 4
          ? state.enemies.length
          : -1;
    if (slot < 0) return false;
    const enemy: Enemy = {
      name: template.name,
      icon: template.icon,
      role: "minion",
      key: template.key,
      ownerIndex: sourceIndex,
      deathBurst: template.deathBurst,
      traits: [...(template.traits ?? [])],
      stolenGold: 0,
      stolenRelics: [],
      hp: template.hp,
      maxHp: template.hp,
      block: (template.traits ?? []).reduce(
        (total, id) => total + enemyTraits[id].openingBlock,
        0,
      ),
      strength: 0,
      vulnerable: 0,
      poison: 0,
      weak: 0,
      dexterity: 0,
      thorns: this.modifierTotal(state, "enemyThorns"),
      regen: 0,
      intent: structuredClone(template.pattern[0]),
      pattern: structuredClone(template.pattern),
      stunned: 0,
      phase: 0,
    };
    if (slot === state.enemies.length) state.enemies.push(enemy);
    else state.enemies[slot] = enemy;
    this.mechanicEvent(state, "mechanic", `${enemy.name}孵化`, {
      side: "enemy",
      index: slot,
    });
    return true;
  }
  private summonEnemies(state: ExpeditionState) {
    for (const clock of state.summons ?? []) {
      const sourceIndex = state.enemies.findIndex(
        (enemy) =>
          enemy.hp > 0 &&
          enemy.role === "boss" &&
          (enemy.key === clock.rule.source || enemy.name === clock.rule.source),
      );
      if (sourceIndex < 0) {
        clock.queued = false;
        continue;
      }
      clock.cooldown--;
      if (clock.cooldown > 0) continue;
      const owned = state.enemies.filter(
        (enemy) => enemy.hp > 0 && enemy.ownerIndex === sourceIndex,
      ).length;
      if (
        owned < clock.rule.max &&
        this.spawnMinion(state, sourceIndex, clock.rule.template)
      ) {
        clock.cooldown = clock.rule.every;
        clock.queued = false;
      } else {
        clock.cooldown = 1;
        clock.queued = true;
      }
    }
  }
  private cascadeMinions(state: ExpeditionState, sourceIndex: number) {
    const owned = state.enemies.flatMap((enemy, index) =>
      enemy.hp > 0 && enemy.ownerIndex === sourceIndex
        ? [{ enemy, index }]
        : [],
    );
    if (!owned.length) return;
    for (const { enemy, index } of owned) {
      enemy.hp = 0;
      enemy.block = 0;
      this.mechanicEvent(state, "break", `${enemy.name}连锁消散`, {
        side: "enemy",
        index,
      });
    }
  }
  private detonateMinion(state: ExpeditionState, index: number) {
    const enemy = state.enemies[index];
    if (!enemy.deathBurst) return;
    this.mechanicEvent(state, "mechanic", `${enemy.name}爆裂`, {
      side: "enemy",
      index,
    });
    state.heroes.forEach((hero, heroIndex) => {
      if (hero.hp > 0)
        this.hit(
          state,
          { side: "hero", index: heroIndex },
          enemy.deathBurst!,
          undefined,
          false,
          { side: "enemy", index },
        );
    });
  }
  private mechanicRoundStart(state: ExpeditionState) {
    const mechanic = state.mechanic;
    if (!mechanic) return;
    mechanic.roundCards = 0;
    if (mechanic.id === "roots" && this.linkedPairs(state) === 0)
      this.linkHeroes(state);
    if (mechanic.id === "symbiosis") {
      state.heroes.forEach((hero, index) => {
        if (hero.hp > 0 && hero.spore > 0) {
          this.hit(state, { side: "hero", index }, hero.spore, undefined, true);
          hero.spore--;
        }
      });
      const living = state.heroes.flatMap((hero, index) =>
        hero.hp > 0 ? [index] : [],
      );
      if (living.length) {
        const target = living[(state.round + mechanic.phase) % living.length];
        state.heroes[target].spore = Math.min(
          3,
          state.heroes[target].spore + 1 + mechanic.phase,
        );
        this.mechanicEvent(state, "mechanic", "孢子扩散", {
          side: "hero",
          index: target,
        });
      }
    }
  }
  private mechanicEnemyTurnEnd(state: ExpeditionState) {
    const mechanic = state.mechanic,
      boss = this.mechanicBoss(state);
    if (!mechanic || !boss) return;
    if (mechanic.id === "trial") {
      if (this.aliveParts(state, "seal")) boss.block += 5;
      this.advanceMechanic(state, mechanic.phase > 0 ? 3 : 2);
    }
    if (mechanic.id === "fate") {
      const current = structuredClone(boss.intent);
      this.advanceMechanic(state, mechanic.phase > 0 ? 2 : 1);
      mechanic.lastIntent = current;
    }
    if (mechanic.id === "symbiosis") {
      mechanic.track = state.enemies.filter(
        (enemy) =>
          enemy.hp > 0 && (enemy.role === "boss" || enemy.part === "twin"),
      ).length;
      if (mechanic.track === 1) this.enterMechanicPhase(state);
    }
    if (mechanic.id === "roots" && this.linkedPairs(state) === 0)
      this.linkHeroes(state);
    if (mechanic.id === "furnace")
      this.advanceMechanic(state, mechanic.phase > 0 ? 4 : 3);
    if (mechanic.id === "mirror" || mechanic.id === "tide")
      this.advanceMechanic(state, 1);
    if (mechanic.id === "brood") this.advanceMechanic(state, 1);
    if (mechanic.id === "silence") this.advanceMechanic(state, 1);
    if (mechanic.id === "tribute")
      this.advanceMechanic(state, mechanic.phase > 0 ? 2 : 1);
    if (mechanic.id === "tempo" && mechanic.roundCards === 0) {
      const healed = Math.min(
        boss.maxHp - boss.hp,
        mechanic.phase > 0 ? 12 : 8,
      );
      if (healed > 0) {
        boss.hp += healed;
        this.mechanicEvent(state, "mechanic", `停手修复 ${healed}`);
      }
    }
    this.checkMechanicPhase(state);
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
      Object.assign(hero, initialResources());
      if (hero.profession === 7) hero.dice = 2;
      hero.relicUses = {};
      hero.vulnerable = 0;
      hero.energy = 3;
      hero.ready = false;
      hero.shuffles = 0;
      hero.spore = 0;
      hero.tether = null;
      hero.silenced = 0;
      this.draw(state, actor, 5);
    });
    state.enemies = state.scenario[state.encounter].enemies.map((e) => ({
      name: e.name,
      icon: e.icon,
      role: e.role ?? "guard",
      ...(e.part ? { part: e.part } : {}),
      ...(e.key ? { key: e.key } : {}),
      pattern: structuredClone(e.pattern),
      ...(e.phasePattern
        ? { phasePattern: structuredClone(e.phasePattern) }
        : {}),
      ...(e.deathBurst ? { deathBurst: e.deathBurst } : {}),
      traits: [...(e.traits ?? [])],
      stolenGold: 0,
      stolenRelics: [],
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
      stunned: 0,
      phase: 0,
    }));
    const bossIndex = state.enemies.findIndex((enemy) => enemy.role === "boss");
    state.enemies.forEach((enemy) => {
      if (enemy.role === "minion" && bossIndex >= 0)
        enemy.ownerIndex = bossIndex;
    });
    state.summons = (state.scenario[state.encounter].summons ?? []).map(
      (rule) => ({
        rule: structuredClone(rule) as typeof rule,
        cooldown: rule.first,
        queued: false,
      }),
    );
    state.modifiers = [...(state.scenario[state.encounter].modifiers ?? [])];
    const healthIncrease = this.modifierTotal(state, "enemyHealthIncrease"),
      openingBlock = this.modifierTotal(state, "openingBlock"),
      deathBurst = this.modifierTotal(state, "deathBurst"),
      enemyThorns = this.modifierTotal(state, "enemyThorns"),
      heroVulnerable = this.modifierTotal(state, "heroVulnerable");
    state.enemies.forEach((enemy) => {
      enemy.hp = enemy.maxHp = Math.ceil(enemy.maxHp * (1 + healthIncrease));
      enemy.block += openingBlock + this.traitTotal(enemy, "openingBlock");
      enemy.thorns += enemyThorns;
      if (deathBurst && enemy.role !== "boss")
        enemy.deathBurst = Math.max(deathBurst, enemy.deathBurst ?? 0);
    });
    if (state.modifiers.includes("awakened")) {
      const eligible = state.enemies.filter((enemy) => enemy.role !== "boss"),
        target = shuffled(
          eligible.length ? eligible : state.enemies,
          `${state.seed}:awakened:${state.encounter}:${state.battleSerial}`,
        )[0];
      if (target) {
        target.traits ??= [];
        const traits = target.traits;
        const trait = shuffled(
          (Object.keys(enemyTraits) as EnemyTraitId[]).filter(
            (id) => !traits.includes(id),
          ),
          `${state.seed}:awakened-trait:${state.encounter}:${state.battleSerial}`,
        )[0];
        if (trait) traits.push(trait);
        if (trait === "bulwark")
          target.block += enemyTraits.bulwark.openingBlock;
      }
    }
    state.heroes.forEach((hero) => (hero.vulnerable += heroVulnerable));
    state.turnStart = {
      damage: state.metrics.damage,
      blocked: state.metrics.blocked,
      healthLost: state.metrics.healthLost,
      cards: state.metrics.cards,
    };
    state.heroes.forEach((_, actor) => this.relic(state, actor, "start"));
    state.heroes.forEach((_, actor) => this.relic(state, actor, "round"));
    this.startMechanic(state);
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
        ...(allCards(hero).some((c) => c.card === "strike" && canUpgrade(c))
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
    if (hero.silenced > 0) return [{ type: "ready", actor }];
    const actions: ExpeditionAction[] = [];
    for (const instance of hero.hand) {
      const card = definition(instance);
      if (card.unplayable) continue;
      if (card.cost > hero.energy) continue;
      if ((card.diceCost ?? 0) > hero.dice) continue;
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
    linked = false,
  ): number {
    const fighter =
      target.side === "hero"
        ? state.heroes[target.index]
        : state.enemies[target.index];
    const targetHero =
      target.side === "hero" ? state.heroes[target.index] : undefined;
    const wasAlive = fighter.hp > 0;
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
    if (
      targetHero &&
      !linked &&
      damage > 0 &&
      targetHero.tether !== null &&
      state.heroes[targetHero.tether]?.hp > 0
    ) {
      const partner = targetHero.tether,
        shared = Math.ceil(damage / 2);
      this.mechanicEvent(state, "mechanic", "根须传导伤害", {
        side: "hero",
        index: partner,
      });
      this.hit(
        state,
        { side: "hero", index: partner },
        shared,
        source,
        false,
        origin,
        true,
      );
    }
    if (targetHero && fighter.hp <= 0 && targetHero.tether !== null) {
      const partner = targetHero.tether;
      if (state.heroes[partner]?.tether === target.index)
        state.heroes[partner].tether = null;
      targetHero.tether = null;
    }
    if (target.side === "enemy" && wasAlive && fighter.hp <= 0) {
      const enemy = state.enemies[target.index];
      if (enemy.role === "boss") this.cascadeMinions(state, target.index);
      if (enemy.role === "minion") this.detonateMinion(state, target.index);
      this.mechanicPartDefeated(state, target.index);
      this.recoverLoot(state, enemy, target.index);
      const allyDeathHeal = this.modifierTotal(state, "allyDeathHeal");
      state.enemies.forEach((ally, index) => {
        if (index === target.index || ally.hp <= 0) return;
        const strength = this.traitTotal(ally, "allyDeathStrength"),
          healed = Math.min(ally.maxHp - ally.hp, allyDeathHeal);
        ally.strength += strength;
        ally.hp += healed;
        if (strength)
          this.mechanicEvent(state, "mechanic", `${ally.name}复仇强化`, {
            side: "enemy",
            index,
          });
        if (healed)
          this.mechanicEvent(state, "status", `${ally.name}复生 ${healed}`, {
            side: "enemy",
            index,
          });
      });
    }
    if (target.side === "enemy" && fighter.hp > 0)
      this.checkMechanicPhase(state);
    return damage;
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
                  : effect.scale === "heat"
                    ? hero.heat * 2
                    : effect.scale === "turret"
                      ? hero.turret * 2
                      : effect.scale === "dice"
                        ? hero.dice * 2
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
      const amount =
        effect.amount +
        recipient.dexterity +
        (effect.scale === "dice" ? hero.dice * 2 : 0);
      recipient.block += amount;
      state.visuals.push({
        kind: "block",
        target: { side: "hero", index },
        amount,
        source: actor,
      });
    }
    if (effect.kind === "heal") {
      const gain = Math.min(fighter.maxHp - fighter.hp, effect.amount);
      fighter.hp += gain;
      if (target.side === "hero") {
        const recipient = state.heroes[target.index];
        const overflow = Math.min(effect.amount - gain, recipient.blessing);
        recipient.block += overflow;
        recipient.blessing -= overflow;
        if (overflow > 0)
          state.visuals.push({
            kind: "block",
            target,
            amount: overflow,
            source: actor,
          });
      }
      state.metrics.healed += gain;
      state.visuals.push({ kind: "heal", target, amount: gain, source: actor });
    }
    if (effect.kind === "draw" && target.side === "hero")
      this.draw(state, target.index, effect.amount);
    if (effect.kind === "energy" && target.side === "hero")
      state.heroes[target.index].energy += effect.amount;
    if (effect.kind === "dice" && target.side === "hero") {
      const recipient = state.heroes[target.index],
        gain = Math.min(
          expeditionResources.dice.maximum - recipient.dice,
          effect.amount,
        );
      recipient.dice += gain;
      if (gain) {
        state.visuals.push({
          kind: "status",
          target,
          amount: gain,
          source: actor,
        });
      }
    }
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
    if (target.side === "hero") {
      const recipient = state.heroes[target.index];
      if (effect.kind === "cool")
        recipient.heat = Math.max(0, recipient.heat - effect.amount);
      if (effect.kind in resourceEffects) {
        const resource =
          resourceEffects[effect.kind as keyof typeof resourceEffects];
        recipient[resource] = Math.min(
          expeditionResources[resource].maximum,
          recipient[resource] + effect.amount,
        );
        state.visuals.push({
          kind: "status",
          target,
          amount: effect.amount,
          source: actor,
        });
      }
    }
    if (effect.kind === "cleanse") {
      fighter.poison = 0;
      fighter.vulnerable = 0;
      fighter.weak = 0;
      if (target.side === "hero") {
        const recipient = state.heroes[target.index];
        recipient.spore = 0;
        recipient.silenced = 0;
        const sealed = recipient.hand.findIndex(
          (instance) => definition(instance).temporary,
        );
        if (sealed >= 0) recipient.hand.splice(sealed, 1);
        if (recipient.tether !== null) {
          const partner = recipient.tether;
          if (state.heroes[partner]?.tether === target.index)
            state.heroes[partner].tether = null;
          recipient.tether = null;
        }
        this.mechanicCleansed(state, target.index);
      }
    }
  }
  effects(
    state: ExpeditionState,
    actor: number,
    effects: readonly Effect[],
    targets: Target[],
  ) {
    for (const effect of effects) {
      const recipients: Target[] =
        effect.target === "party"
          ? state.heroes.flatMap((h, index) =>
              h.hp > 0 ? [{ side: "hero" as const, index }] : [],
            )
          : effect.target === "self" ||
              ([
                "draw",
                "energy",
                "strength",
                "dexterity",
                "thorns",
                "heat",
                "cool",
                "device",
                "focus",
                "echo",
                "blessing",
              ].includes(effect.kind) &&
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
        for (let hit = 0; hit < (effect.hits ?? 1); hit++) {
          if (fighter.hp <= 0) break;
          this.effect(state, actor, effect, target);
        }
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
      if (relic.goldEnergyPer) {
        const amount = Math.floor(hero.gold / relic.goldEnergyPer);
        if (amount > 0)
          this.effects(
            state,
            actor,
            [{ kind: "energy", amount }],
            [{ side: "hero", index: actor }],
          );
        continue;
      }
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
    if (
      state.phase !== "combat" ||
      !state.heroes[actor] ||
      state.heroes[actor].hp <= 0 ||
      state.heroes[actor].ready ||
      state.heroes[actor].silenced > 0
    )
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
    this.settleActions(next);
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
        hero.hp = Math.ceil(hero.maxHp * (state.revivalFraction ?? 0.25));
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
  private settleActions(state: ExpeditionState) {
    if (
      !this.victory(state) &&
      state.heroes.every((hero) => hero.ready || hero.hp <= 0)
    )
      this.enemiesAct(state);
  }
  private resourceAttack(
    state: ExpeditionState,
    actor: number,
    amount: number,
  ) {
    const living = state.enemies.flatMap((enemy, index) =>
      enemy.hp > 0 ? [{ enemy, index }] : [],
    );
    const target = living.sort((a, b) => a.enemy.hp - b.enemy.hp)[0];
    if (!target) return;
    this.effects(
      state,
      actor,
      [{ kind: "damage", amount }],
      [{ side: "enemy", index: target.index }],
    );
  }
  private sealHand(state: ExpeditionState, actor: number, amount: number) {
    const hero = state.heroes[actor],
      candidates = hero.hand.filter(
        (instance) => !definition(instance).unplayable,
      ),
      chosen = shuffled(
        candidates,
        `${state.seed}:seal:${state.encounter}:${state.round}:${actor}:${state.sequence}`,
      ).slice(0, amount);
    for (const instance of chosen) {
      const index = hero.hand.findIndex((card) => card.id === instance.id);
      if (index < 0) continue;
      const [original] = hero.hand.splice(index, 1);
      hero.discard.push(original);
      hero.hand.splice(index, 0, {
        id: `sealed-${state.nextId++}`,
        card: "sealed_echo",
        upgradeLevel: 0,
        expiresRound: state.round + 2,
      });
    }
    if (chosen.length) {
      state.visuals.push({
        kind: "mechanic",
        target: { side: "hero", index: actor },
        amount: chosen.length,
        label: `${hero.name}的 ${chosen.length} 张牌被封缄`,
      });
      this.log(state, `${hero.name}的 ${chosen.length} 张手牌被替换为废牌`);
      this.relic(state, actor, "sealed");
    }
  }
  private silenceHero(state: ExpeditionState, actor: number, amount: number) {
    const hero = state.heroes[actor];
    if (!hero || hero.hp <= 0) return;
    hero.silenced = Math.max(hero.silenced, amount + 1);
    state.visuals.push({
      kind: "status",
      target: { side: "hero", index: actor },
      amount: hero.silenced,
      label: `${hero.name}被封口`,
    });
    this.log(state, `${hero.name}被封口，下一轮不能出牌`);
    this.relic(state, actor, "silenced");
  }
  private stealGold(
    state: ExpeditionState,
    enemy: Enemy,
    actor: number,
    amount: number,
  ) {
    const hero = state.heroes[actor];
    if (!hero || hero.hp <= 0) return;
    const stolen = Math.min(hero.gold, Math.max(0, amount));
    if (!stolen) return;
    hero.gold -= stolen;
    enemy.stolenGold += stolen;
    enemy.stolenFrom ??= actor;
    state.visuals.push({
      kind: "mechanic",
      target: { side: "hero", index: actor },
      amount: stolen,
      label: `${enemy.name}夺走 ${stolen} 金币`,
    });
    this.log(state, `${enemy.name}从${hero.name}夺走 ${stolen} 金币`);
    this.relic(state, actor, "loot");
  }
  private stealRelic(state: ExpeditionState, enemy: Enemy, actor: number) {
    const hero = state.heroes[actor];
    if (!hero?.relics.length) return;
    const relic = shuffled(
      hero.relics,
      `${state.seed}:steal-relic:${state.encounter}:${state.round}:${actor}`,
    )[0];
    const index = hero.relics.indexOf(relic);
    if (index < 0) return;
    hero.relics.splice(index, 1);
    enemy.stolenRelics.push({ relic, owner: actor });
    enemy.stolenFrom ??= actor;
    state.visuals.push({
      kind: "mechanic",
      target: { side: "hero", index: actor },
      amount: 1,
      label: `${enemy.name}夺走${relics[relic].name}`,
    });
    this.log(state, `${enemy.name}从${hero.name}夺走${relics[relic].name}`);
    this.relic(state, actor, "loot");
  }
  private recoverLoot(state: ExpeditionState, enemy: Enemy, index: number) {
    if (enemy.stolenGold > 0) {
      const owner = enemy.stolenFrom ?? 0,
        hero = state.heroes[owner];
      if (hero) hero.gold += enemy.stolenGold;
      state.visuals.push({
        kind: "heal",
        target: { side: "hero", index: owner },
        amount: enemy.stolenGold,
        label: `夺回 ${enemy.stolenGold} 金币`,
      });
      this.log(state, `${enemy.name}被击败，夺回 ${enemy.stolenGold} 金币`);
      enemy.stolenGold = 0;
      this.relic(state, owner, "loot");
    }
    for (const stolen of enemy.stolenRelics) {
      state.heroes[stolen.owner]?.relics.push(stolen.relic);
      state.visuals.push({
        kind: "break",
        target: { side: "enemy", index },
        amount: 1,
        label: `夺回${relics[stolen.relic].name}`,
      });
      this.log(
        state,
        `${state.heroes[stolen.owner]?.name ?? "队员"}夺回${relics[stolen.relic].name}`,
      );
      this.relic(state, stolen.owner, "loot");
    }
    enemy.stolenRelics = [];
    enemy.stolenFrom = undefined;
  }
  private enemiesAct(state: ExpeditionState) {
    state.heroes.forEach((hero, actor) => {
      if (hero.hp <= 0) return;
      if (hero.turret > 0) this.resourceAttack(state, actor, hero.turret);
      if (hero.heat >= heatRule.threshold)
        this.hit(
          state,
          { side: "hero", index: actor },
          hero.heat - heatRule.residual,
          undefined,
          true,
        );
      hero.heat = Math.max(0, hero.heat - heatRule.cooling);
    });
    if (this.victory(state)) return;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.block = 0;
      enemy.thorns = Math.max(0, enemy.thorns - enemyThornsRule.decay);
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
      if (enemy.stunned > 0) {
        enemy.stunned--;
        this.mechanicEvent(state, "mechanic", `${enemy.name}失衡，跳过行动`, {
          side: "enemy",
          index: state.enemies.indexOf(enemy),
        });
        continue;
      }
      const intent = enemy.intent;
      if (intent.kind === "block") enemy.block += intent.amount;
      if (intent.kind === "strength") enemy.strength += intent.amount;
      if (intent.kind === "thorns")
        enemy.thorns = Math.min(
          enemyThornsRule.maximum,
          enemy.thorns + intent.amount,
        );
      if (intent.kind === "heal")
        state.enemies
          .filter((member) => member.hp > 0)
          .forEach(
            (member) =>
              (member.hp = Math.min(member.maxHp, member.hp + intent.amount)),
          );
      if (intent.kind === "poison" || intent.kind === "weak")
        for (const target of intentTargets(state, intent.target))
          state.heroes[target][intent.kind] +=
            intent.amount + Number(intent.kind === "weak");
      if (intent.kind === "seal")
        for (const target of intentTargets(state, intent.target))
          this.sealHand(state, target, intent.amount);
      if (intent.kind === "silence")
        for (const target of intentTargets(state, intent.target))
          this.silenceHero(state, target, 1);
      if (intent.kind === "steal-gold")
        for (const target of intentTargets(state, intent.target))
          this.stealGold(state, enemy, target, intent.amount);
      if (intent.kind === "steal-relic")
        for (const target of intentTargets(state, intent.target))
          this.stealRelic(state, enemy, target);
      let damageDealt = 0;
      for (const attack of attackPlan(state, enemy))
        for (
          let hit = 0;
          hit < attack.hits && state.heroes[attack.actor].hp > 0;
          hit++
        ) {
          damageDealt += this.hit(
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
      if (enemy.hp > 0 && enemy.intent.kind === "attack") {
        enemy.strength += this.traitTotal(enemy, "attackStrength");
        const attackHeal =
          this.traitTotal(enemy, "attackHeal") +
          this.modifierTotal(state, "attackHeal");
        if (damageDealt > 0 && attackHeal > 0) {
          const healed = Math.min(enemy.maxHp - enemy.hp, attackHeal);
          if (healed > 0) {
            enemy.hp += healed;
            this.mechanicEvent(state, "status", `${enemy.name}汲取 ${healed}`, {
              side: "enemy",
              index: state.enemies.indexOf(enemy),
            });
          }
        }
      }
      if (state.heroes.every((h) => h.hp <= 0)) {
        state.phase = "lost";
        this.finishTurn(state);
        this.log(state, "队伍全部倒地，冒险结束");
        return;
      }
    }
    this.summonEnemies(state);
    const roundStrength = this.modifierTotal(state, "roundStrength");
    state.enemies
      .filter((enemy) => enemy.hp > 0)
      .forEach((enemy) => {
        enemy.strength += roundStrength;
      });
    this.mechanicEnemyTurnEnd(state);
    if (this.victory(state)) return;
    this.finishTurn(state);
    state.round++;
    this.mechanicRoundStart(state);
    state.heroes.forEach((hero, actor) => {
      const retained = hero.hand.filter(
        (instance) =>
          definition(instance).temporary &&
          (instance.expiresRound ?? 0) > state.round,
      );
      hero.discard.push(
        ...hero.hand.filter((instance) => !definition(instance).temporary),
        ...hero.played,
      );
      hero.hand = retained;
      hero.played = [];
      hero.block = 0;
      hero.energy = 3 + hero.focus;
      if (hero.profession === 7)
        hero.dice = Math.min(expeditionResources.dice.maximum, hero.dice + 2);
      hero.focus = 0;
      hero.ready = hero.hp <= 0;
      if (hero.hp > 0 && hero.echo > 0) {
        this.resourceAttack(state, actor, hero.echo);
        hero.echo = 0;
      }
      hero.vulnerable = Math.max(0, hero.vulnerable - 1);
      hero.weak = Math.max(0, hero.weak - 1);
      hero.silenced = Math.max(0, hero.silenced - 1);
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
        this.draw(state, actor, Math.max(0, 5 - retained.length));
        this.relic(state, actor, "round");
      }
    });
    if (state.heroes.every((h) => h.hp <= 0)) {
      state.phase = "lost";
      this.log(state, "队伍全部倒地，冒险结束");
      return;
    }
    if (this.victory(state)) return;
    state.heroes.forEach((hero) => (hero.ready = hero.hp <= 0));
    state.enemies.forEach((enemy) => {
      enemy.vulnerable = Math.max(0, enemy.vulnerable - 1);
      enemy.weak = Math.max(0, enemy.weak - 1);
      const pattern =
        enemy.phase > 0 && enemy.phasePattern
          ? enemy.phasePattern
          : enemy.pattern;
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
      hero.dice = Math.max(0, hero.dice - (card.diceCost ?? 0));
      const healthCost = Math.min(Math.max(0, hero.hp - 1), card.hpCost ?? 0);
      if (healthCost) {
        hero.hp -= healthCost;
        next.metrics.healthLost += healthCost;
        next.visuals.push({
          kind: "damage",
          target: { side: "hero", index: action.actor },
          amount: healthCost,
          source: action.actor,
        });
      }
      (card.exhaust ? hero.exhaust : hero.played).push(instance);
      next.metrics.cards++;
      next.metrics.byCard[instance.card] =
        (next.metrics.byCard[instance.card] ?? 0) + 1;
      this.log(
        next,
        `${hero.name}使用${card.name}（${card.cost} 能量${card.diceCost ? `，${card.diceCost} 骰子` : ""}${healthCost ? `，失去 ${healthCost} 生命` : ""}）`,
      );
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
      if (next.phase === "combat") this.mechanicCardPlayed(next, card.effects);
    }
    if (action.type === "ready" || action.type === "unready") {
      hero.ready = action.type === "ready";
      this.log(next, `${hero.name}${hero.ready ? "结束行动" : "取消结束"}`);
    }
    if (action.type === "reward") {
      this.reward(next, action.actor, action.reward);
      next.rewards[action.actor] = action.reward;
    }
    if (next.phase === "combat") this.settleActions(next);
    return next;
  }
  private reward(state: ExpeditionState, actor: number, reward: Reward) {
    const hero = state.heroes[actor];
    if (reward.kind === "card") {
      hero.discard.push({
        id: `c${state.nextId++}`,
        card: reward.card,
        upgradeLevel: 0,
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
        (c) => c.card === "strike" && canUpgrade(c),
      )!;
      card.upgradeLevel++;
      this.log(
        state,
        `${hero.name}强化${definition(card).name}：${definition(card).effects[0].amount} 伤害`,
      );
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
