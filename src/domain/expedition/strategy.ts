import { definition, type CardInstance, type CardId } from "./content";
import { ExpeditionRules, incoming, allCards } from "./rules";
import { shuffled } from "./random";
import type { ExpeditionState, ExpeditionAction } from "./types";
export type Policy = "random" | "attack" | "balanced";
export const policyNames: Record<Policy, string> = {
  random: "随机合法",
  attack: "进攻优先",
  balanced: "团队生存",
};
const rewardValues: Partial<Record<CardId, number>> = {
  sweep: 20,
  fortress: 17,
  power: 19,
  heal: 10,
  venom: 21,
  volley: 20,
  rush: 22,
};
const rules = new ExpeditionRules();
export interface RankedAction {
  action: ExpeditionAction;
  score: number;
  reason: string;
}
export function rankActions(
  state: ExpeditionState,
  actor: number,
  policy: Policy,
): RankedAction[] {
  const possible = rules
    .candidates(state, actor)
    .filter((a) => a.type !== "unready");
  if (policy === "random")
    return shuffled(
      possible,
      `${state.seed}:policy:${state.sequence}:${actor}`,
    ).map((action, index) => ({
      action,
      score: possible.length - index,
      reason: "在当前合法动作中按固定种子洗牌",
    }));
  return possible
    .map((action) => {
      let score = -20,
        reason = "保留后续行动";
      if (action.type === "ready") {
        score = -5;
        reason = "当前手牌没有更高收益的动作";
      }
      if (action.type === "reward") {
        const reward = action.reward,
          hero = state.heroes[actor];
        score =
          reward.kind === "heal"
            ? (hero.maxHp - hero.hp) * (policy === "balanced" ? 2 : 0.25)
            : reward.kind === "upgrade"
              ? 13
              : reward.kind === "card"
                ? (rewardValues[reward.card] ?? 12) -
                  Math.max(0, allCards(hero).length - 12) * 4
                : -10;
        reason =
          reward.kind === "heal"
            ? `缺失 ${hero.maxHp - hero.hp} 生命，治疗最多 8 点`
            : reward.kind === "upgrade"
              ? "提升基础打击 3 点伤害，牌库张数不增加"
              : "按当前职业的构筑收益选择";
      }
      if (action.type === "play") {
        const instance = state.heroes[actor].hand.find(
            (c) => c.id === action.instance,
          ) as CardInstance,
          card = definition(instance),
          next = rules.preview(state, action);
        const damage = state.enemies.reduce(
          (sum, e, i) => sum + e.hp - next.enemies[i].hp,
          0,
        );
        const kills = state.enemies.reduce(
          (sum, e, i) => sum + (e.hp > 0 && next.enemies[i].hp <= 0 ? 1 : 0),
          0,
        );
        let protection = 0,
          urgency = 0;
        state.heroes.forEach((hero, index) => {
          if (hero.hp <= 0) return;
          const threat = incoming(state, index),
            needed = Math.max(0, threat - hero.block),
            absorbed = Math.min(
              needed,
              Math.max(0, next.heroes[index].block - hero.block),
            );
          protection += absorbed;
          if (needed >= hero.hp && threat - next.heroes[index].block < hero.hp)
            urgency += 55;
        });
        const heal = state.heroes.reduce(
          (sum, h, i) => sum + next.heroes[i].hp - h.hp,
          0,
        );
        const utility = card.effects.reduce(
          (sum, e) =>
            sum +
            (e.kind === "draw"
              ? e.amount *
                (state.heroes[actor].energy - card.cost > 0 ? 3.5 : 0.5)
              : e.kind === "energy"
                ? e.amount * 5
                : e.kind === "strength"
                  ? e.amount * 5
                  : e.kind === "poison"
                    ? Math.min(
                        e.amount * 1.6,
                        state.enemies[action.target?.index ?? 0]?.hp ?? 0,
                      )
                    : e.kind === "vulnerable"
                      ? e.amount *
                        (state.heroes.some((h) => !h.ready && h.energy > 0)
                          ? 4
                          : 1)
                      : 0),
          0,
        );
        score =
          damage +
          (policy === "balanced"
            ? protection * 1.6 + urgency + heal * 1.6
            : protection * 0.15 + heal * 0.2) +
          kills * 13 +
          utility -
          card.cost * 0.4;
        if (card.effects.every((e) => e.kind === "block") && protection === 0)
          score = -8;
        if (card.effects.every((e) => e.kind === "heal") && heal === 0)
          score = -9;
        reason = `实际伤害 ${damage} · 击杀 ${kills} · 本轮有效保护 ${protection} · 治疗 ${heal}${urgency ? " · 避免队友倒地" : ""}`;
      }
      return { action, score, reason };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        JSON.stringify(a.action).localeCompare(JSON.stringify(b.action)),
    );
}
export function chooseAction(
  state: ExpeditionState,
  actor: number,
  policy: Policy,
): ExpeditionAction | null {
  return rankActions(state, actor, policy)[0]?.action ?? null;
}
export interface Trial {
  seed: string;
  policy: Policy;
  outcome: "won" | "lost";
  remainingHp: number;
  rounds: number;
  damage: number;
  blocked: number;
  healthLost: number;
  cards: number;
  actions: number;
  battlesWon: number;
}
export function runTrial(seed: string, policy: Policy): Trial {
  let state = rules.create(seed),
    actions = 0;
  while (state.phase !== "won" && state.phase !== "lost") {
    if (actions++ >= 1500) throw new Error(`决策超过上限：${seed}/${policy}`);
    if (
      state.phase === "reward" &&
      state.heroes.every((_, i) => state.rewards[i])
    ) {
      state = rules.apply(state, { type: "continue" });
      continue;
    }
    const actor = state.heroes.findIndex((h, i) =>
      state.phase === "reward" ? !state.rewards[i] : h.hp > 0 && !h.ready,
    );
    const action = chooseAction(state, actor, policy);
    if (!action) throw new Error(`没有推进动作：${seed}/${actor}`);
    state = rules.apply(state, action);
  }
  return {
    seed,
    policy,
    outcome: state.phase,
    remainingHp: state.heroes.reduce((sum, h) => sum + h.hp, 0),
    rounds: state.metrics.rounds,
    damage: state.metrics.damage,
    blocked: state.metrics.blocked,
    healthLost: state.metrics.healthLost,
    cards: state.metrics.cards,
    actions,
    battlesWon: state.metrics.battlesWon,
  };
}
