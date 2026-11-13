import type { ExpeditionRun, ExpeditionMove } from "./adventure-types";
import type { EncounterDefinition } from "./content";
import type { ExpeditionState } from "./types";
export const advancedBalance = {
  shield: 3,
  contract: 3,
  supply: { compass: 1, heal: 12, gold: 20 },
} as const;
export interface TeamContract {
  status: "offered" | "active" | "declined" | "completed";
  round: number;
  attack: number[];
  defend: number[];
}
export function advancedEncounter(
  encounter: EncounterDefinition,
  enabled: boolean,
  chapter: number,
): EncounterDefinition {
  if (!enabled || encounter.enemies.length >= 4) return encounter;
  return {
    ...encounter,
    subtitle: `${encounter.subtitle}；屏障机关每轮给其他敌人 ${advancedBalance.shield} 格挡`,
    enemies: [
      ...encounter.enemies,
      {
        name: "屏障机关",
        key: "advanced-shield",
        hp: 18 + chapter * 4,
        icon: "⬡",
        role: "part",
        pattern: [{ kind: "block", amount: 0, target: 0 }],
      },
    ],
  };
}
export function grantSceneShield(state: ExpeditionState): void {
  if (
    state.phase !== "combat" ||
    !state.enemies.some(
      (enemy) => enemy.key === "advanced-shield" && enemy.hp > 0,
    )
  )
    return;
  state.enemies.forEach((enemy) => {
    if (enemy.hp > 0 && enemy.key !== "advanced-shield")
      enemy.block += advancedBalance.shield;
  });
}
export function advanceTeamContract(
  run: ExpeditionRun,
  before: ExpeditionState,
  actor: number,
  move: ExpeditionMove,
): void {
  const contract = run.teamContract;
  if (!contract) return;
  if (contract.status === "offered" && move.type === "card")
    contract.status = "declined";
  if (run.combat.round !== before.round) {
    contract.round = run.combat.round;
    contract.attack = [];
    contract.defend = [];
    grantSceneShield(run.combat);
  }
  if (
    contract.status !== "active" ||
    move.type !== "card" ||
    run.combat.phase !== "combat"
  )
    return;
  if (
    run.combat.metrics.damage > before.metrics.damage &&
    !contract.attack.includes(actor)
  )
    contract.attack.push(actor);
  if (
    run.combat.heroes.some(
      (hero, index) => hero.block > before.heroes[index].block,
    ) &&
    !contract.defend.includes(actor)
  )
    contract.defend.push(actor);
  const solo = run.combat.heroes.filter((hero) => hero.hp > 0).length === 1;
  if (
    contract.attack.some((attacker) =>
      contract.defend.some((defender) => solo || attacker !== defender),
    )
  ) {
    contract.status = "completed";
    run.combat.heroes.forEach((hero, index) => {
      if (hero.hp > 0) {
        hero.block += advancedBalance.contract;
        run.combat.visuals.push({
          kind: "block",
          target: { side: "hero", index },
          amount: advancedBalance.contract,
          label: "协作契约",
        });
      }
    });
  }
}
