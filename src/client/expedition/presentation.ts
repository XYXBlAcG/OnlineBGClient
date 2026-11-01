import { enemyThornsRule } from "../../domain/expedition/resources";
import {
  cardText,
  canUpgrade,
  definition,
  type CardInstance,
} from "../../domain/expedition/content";
import { attackPlan, intentTargets } from "../../domain/expedition/rules";
import type { ExpeditionState } from "../../domain/expedition/types";

export function cardComparison(instance: CardInstance) {
  const available = canUpgrade(instance);
  const upgraded = {
    ...instance,
    upgradeLevel: instance.upgradeLevel + Number(available),
  };
  return {
    upgraded,
    available,
    before: cardText(instance),
    after: cardText(upgraded),
    costBefore: definition(instance).cost,
    costAfter: definition(upgraded).cost,
  };
}

export function enemyIntents(state: ExpeditionState, names: string[] = []) {
  return state.enemies.map((enemy, index) => {
    const plan = attackPlan(state, enemy);
    const target =
      enemy.intent.kind === "heal"
        ? "敌方全体"
        : ["strength", "block", "thorns"].includes(enemy.intent.kind)
          ? "自身"
          : enemy.intent.target === "all"
            ? "全队"
            : intentTargets(state, enemy.intent.target)
                .map((actor) => names[actor] ?? state.heroes[actor].name)
                .join("、");
    const hits = [
      ...new Set(
        plan.map(
          (hit) => `${hit.amount}${hit.hits > 1 ? ` × ${hit.hits}` : ""}`,
        ),
      ),
    ].join(" / ");
    return {
      index,
      kind: enemy.intent.kind,
      name: enemy.name,
      target,
      summary:
        enemy.hp <= 0
          ? "已击败"
          : enemy.intent.kind === "attack"
            ? `⚔ ${hits || "0"}`
            : enemy.intent.kind === "block"
              ? `◈ ${enemy.intent.amount}`
              : `${{ strength: "力量", poison: "中毒", weak: "虚弱", heal: "治疗全体", thorns: "反伤" }[enemy.intent.kind]} ${enemy.intent.amount}`,
      description:
        enemy.hp <= 0
          ? "本场不再行动"
          : enemy.intent.kind === "attack"
            ? `攻击${target || "无存活目标"}`
            : enemy.intent.kind === "block"
              ? "准备格挡"
              : enemy.intent.kind === "strength"
                ? "准备增强力量"
                : enemy.intent.kind === "heal"
                  ? "恢复所有存活敌人的生命"
                  : enemy.intent.kind === "thorns"
                    ? `反伤层数增加，上限 ${enemyThornsRule.maximum}；每轮行动前衰减 ${enemyThornsRule.decay}`
                    : `向${target}施加${enemy.intent.kind === "poison" ? "中毒" : "虚弱"}`,
      details: plan
        .map(
          (hit) =>
            `${names[hit.actor] ?? state.heroes[hit.actor].name}：${hit.amount} 伤害${hit.hits > 1 ? `，连续 ${hit.hits} 次` : ""}`,
        )
        .join("；"),
    };
  });
}
