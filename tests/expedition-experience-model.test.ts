import { expect, it } from "vitest";
import {
  conditionalValueAtRisk,
  evaluateExpeditionRun,
  type ExpeditionRunSample,
} from "../analysis/expedition-experience/model";

const base: ExpeditionRunSample = {
  style: "balanced",
  ascension: 0,
  players: 1,
  seed: 1,
  won: true,
  chapter: 3,
  floor: 11,
  heroHp: 40,
  heroMaxHp: 50,
  gold: 120,
  cards: 18,
  upgrades: 4,
  relics: 6,
  companions: 1,
  companionsLost: 0,
  shopSealed: false,
  compass: 2,
  healthLost: 20,
  battlesWon: 8,
  rounds: 32,
  nodeValues: [12, 18, 14, 25, 20, 30],
  routeKinds: ["battle", "camp", "elite", "shop"],
};

it("高成长低损耗路线拥有更高收益和更低风险", () => {
  const safe = evaluateExpeditionRun(base),
    risky = evaluateExpeditionRun({
      ...base,
      won: false,
      heroHp: 0,
      healthLost: 160,
      shopSealed: true,
      companionsLost: 2,
      nodeValues: [40, -30, 18, -25, 10, -40],
    });
  expect(safe.reward).toBeGreaterThan(risky.reward);
  expect(safe.risk).toBeLessThan(risky.risk);
  expect(safe.utility).toBeGreaterThan(risky.utility);
});

it("CVaR 只惩罚最差结果集合", () => {
  expect(conditionalValueAtRisk([-40, -20, 10, 30, 50], 0.4)).toBe(30);
});
