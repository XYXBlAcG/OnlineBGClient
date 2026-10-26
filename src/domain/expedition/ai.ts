import { Strategy, type SearchRequest } from "../strategy";
import type { Candidate, DecisionCandidate, GameState } from "../types";
import { ExpeditionRules, allCards, incoming } from "./rules";
import { cards, definition, type CardId } from "./content";
import { relics, potions, storyEvents } from "./world";
import { mapChoices } from "./map";
import { shuffled } from "./random";
const combat = new ExpeditionRules();
export class ExpeditionStrategy extends Strategy {
  static readonly version = "expedition-team-1";
  readonly version = ExpeditionStrategy.version;
  budget(request: SearchRequest) {
    return {
      easy: { samples: 0, depth: 0, shortlist: 0 },
      normal: { samples: 3, depth: 3, shortlist: 3 },
      hard: { samples: 8, depth: 6, shortlist: 4 },
    }[request.difficulty];
  }
  protected evaluate(
    observation: GameState,
    actor: number,
    candidate: Candidate,
    seed: string,
    audit = true,
  ): DecisionCandidate {
    if (
      observation.kind !== "expedition" ||
      candidate.action.type !== "expedition-action"
    )
      throw new Error("策略游戏不匹配");
    const run = observation.view,
      hero = run.combat.heroes[actor],
      move = candidate.action.move;
    const cardValue = (id: CardId) => {
      const card = cards[id];
      return (
        card.effects.reduce(
          (sum, e) =>
            sum +
            e.amount *
              {
                damage: 1,
                block: 0.8,
                draw: 4,
                energy: 6,
                heal: 2,
                strength: 5,
                poison: 2,
                vulnerable: 3,
                weak: 4,
                dexterity: 5,
                thorns: 4,
                regen: 4,
                cleanse: 2,
              }[e.kind],
          0,
        ) /
          (card.cost + 0.7) -
        Math.max(0, allCards(hero).length - 14) * 1.2
      );
    };
    let score = -100;
    const features: DecisionCandidate["features"] = [];
    if (move.type === "profession")
      score =
        10 +
        ((run.combat.heroes.length === 2 && actor === 1 ? 2 : actor % 3) ===
        move.profession
          ? 5
          : 0);
    if (move.type === "ready" || move.type === "done") score = 0;
    if (move.type === "card" || move.type === "potion") {
      const next =
        move.type === "card"
          ? combat.preview(run.combat, {
              type: "play",
              actor,
              instance: move.instance,
              ...(move.target ? { target: move.target } : {}),
            })
          : combat.potion(run.combat, actor, move.index, move.target);
      const afterHeroes = next.heroes,
        afterEnemies = next.enemies;
      score = run.combat.enemies.reduce(
        (sum, e, i) =>
          sum +
          (e.hp - afterEnemies[i].hp) +
          (e.hp > 0 && afterEnemies[i].hp <= 0 ? 14 : 0),
        0,
      );
      run.combat.heroes.forEach((h, i) => {
        const threat = incoming(run.combat, i);
        score +=
          Math.min(
            Math.max(0, threat - h.block),
            Math.max(0, afterHeroes[i].block - h.block),
          ) *
            1.6 +
          (afterHeroes[i].hp - h.hp) * 2;
        if (
          threat - h.block >= h.hp &&
          threat - afterHeroes[i].block < afterHeroes[i].hp
        )
          score += 55;
      });
      const effects =
        move.type === "card"
          ? definition(hero.hand.find((c) => c.id === move.instance)!).effects
          : potions[hero.potions[move.index]].effects;
      score += effects.reduce(
        (sum, e) =>
          sum +
          e.amount *
            {
              damage: 0,
              block: 0,
              draw: hero.energy > 1 ? 4 : 1,
              energy: 6,
              heal: 0,
              strength: 5,
              poison: 2,
              vulnerable: 2,
              weak: 4,
              dexterity: 4,
              thorns: 3,
              regen: 3,
              cleanse: hero.poison + hero.weak + hero.vulnerable,
            }[e.kind],
        0,
      );
      score -= move.type === "potion" ? 9 : 0.5;
      if (audit) {
        const damage = run.combat.enemies.reduce(
            (sum, e, i) => sum + e.hp - afterEnemies[i].hp,
            0,
          ),
          healing = run.combat.heroes.reduce(
            (sum, h, i) => sum + afterHeroes[i].hp - h.hp,
            0,
          );
        features.push(
          {
            name: "对敌实际伤害",
            value: damage,
            weight: 1,
            contribution: damage,
          },
          {
            name: "全队实际治疗",
            value: healing,
            weight: 2,
            contribution: healing * 2,
          },
          {
            name: "保护、击杀、状态与资源收益",
            value: score - damage - healing * 2,
            weight: 1,
            contribution: score - damage - healing * 2,
          },
        );
      }
    }
    if (move.type === "reward")
      score =
        move.choice === "heal"
          ? Math.min(8, hero.maxHp - hero.hp) * 2
          : move.choice === "skip"
            ? 0
            : cardValue(move.choice as CardId);
    if (move.type === "rest")
      score = Math.min(Math.ceil(hero.maxHp * 0.35), hero.maxHp - hero.hp) * 2;
    if (move.type === "upgrade")
      score =
        8 + cardValue(allCards(hero).find((c) => c.id === move.instance)!.card);
    if (move.type === "remove") {
      const card = allCards(hero).find((c) => c.id === move.instance)!;
      score =
        ["strike", "defend"].includes(card.card) && allCards(hero).length > 10
          ? 12
          : -5;
    }
    if (move.type === "buy") {
      const item = run.shop[actor].find((i) => i.id === move.item)!;
      score =
        item.kind === "card"
          ? cardValue(item.card) - 3
          : item.kind === "relic"
            ? 22
            : hero.hp < hero.maxHp / 2
              ? 12
              : 4;
    }
    if (move.type === "vote" || move.type === "tie") {
      const phase = run.phase === "tie" ? run.votePhase : run.phase;
      if (phase === "map") {
        const node = mapChoices(run).find((n) => n.id === move.choice)!;
        const health =
          run.combat.heroes.reduce((sum, h) => sum + h.hp / h.maxHp, 0) /
          run.combat.heroes.length;
        score = {
          battle: 14,
          elite: health > 0.8 ? 17 : -5,
          boss: 20,
          camp: 35,
          treasure: 30,
          event: 16,
          shop: hero.gold >= 65 ? 23 : 3,
        }[node.kind];
      } else if (phase === "event") {
        score =
          move.choice === "leave"
            ? 0
            : storyEvents[run.event!].choices[
                Number(move.choice)
              ].effects.reduce(
                (sum, e) =>
                  sum +
                  (e.kind === "gold"
                    ? e.amount * 0.25
                    : e.kind === "hurt"
                      ? -e.amount * 1.5
                      : e.kind === "heal"
                        ? Math.min(e.amount, hero.maxHp - hero.hp) * 2
                        : e.kind === "relic"
                          ? 30
                          : e.kind === "card"
                            ? cardValue(e.card)
                            : e.kind === "maxHp"
                              ? e.amount * 3
                              : 12),
                0,
              );
      } else if (phase === "holder")
        score = 20 - run.combat.heroes[Number(move.choice)].relics.length * 3;
      else if (phase === "treasure")
        score = relics[move.choice as keyof typeof relics].effects.reduce(
          (sum, e) => sum + e.amount * 3,
          10,
        );
      score += this.engine.seed(`${seed}:${move.choice}`)() * 0.01;
    }
    return {
      ...candidate,
      score,
      features: audit
        ? features.length
          ? features
          : [
              {
                name: candidate.label,
                value: score,
                weight: 1,
                contribution: score,
              },
            ]
        : [],
    };
  }
  score(request: SearchRequest, candidates: Candidate[]): DecisionCandidate[] {
    return candidates.map((candidate) => {
      const result = this.evaluate(
        request.observation,
        request.actor,
        candidate,
        request.seed,
        request.audit,
      );
      if (request.difficulty === "easy")
        result.score +=
          this.engine.seed(
            `${request.seed}:${JSON.stringify(candidate.action)}`,
          )() * 8;
      return result;
    });
  }
  sample(observation: GameState, _actor: number, seed: string): GameState {
    if (observation.kind !== "expedition") throw new Error("策略游戏不匹配");
    const next = structuredClone(observation);
    next.view.seed = seed;
    next.view.combat.seed = seed;
    next.view.combat.heroes.forEach(
      (hero, i) => (hero.deck = shuffled(hero.deck, `${seed}:deck:${i}`)),
    );
    return next;
  }
  position(state: GameState, _actor: number): number {
    if (state.kind !== "expedition") throw new Error("策略游戏不匹配");
    const run = state.view;
    if (run.phase === "won") return 2000;
    if (run.phase === "lost") return -2000;
    return (
      run.floor * 30 +
      run.combat.heroes.reduce(
        (sum, h) =>
          sum +
          h.hp * 2 +
          Math.min(
            h.block,
            incoming(run.combat, run.combat.heroes.indexOf(h)),
          ) *
            1.2 +
          h.strength * 5 +
          h.dexterity * 5,
        0,
      ) -
      run.combat.enemies.reduce(
        (sum, e) => sum + e.hp + e.block * 0.4 - e.poison * 2,
        0,
      )
    );
  }
}
