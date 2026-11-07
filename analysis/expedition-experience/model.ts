export interface ExpeditionRunSample {
  style: string;
  ascension: number;
  players: number;
  seed: number;
  won: boolean;
  chapter: number;
  floor: number;
  heroHp: number;
  heroMaxHp: number;
  gold: number;
  cards: number;
  upgrades: number;
  relics: number;
  companions: number;
  companionsLost: number;
  shopSealed: boolean;
  compass: number;
  healthLost: number;
  battlesWon: number;
  rounds: number;
  nodeValues: number[];
  routeKinds: string[];
}

export interface ExpeditionRunScore {
  reward: number;
  risk: number;
  utility: number;
  survival: number;
  progress: number;
  volatility: number;
}

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

export function evaluateExpeditionRun(
  sample: ExpeditionRunSample,
  riskWeight = 0.35,
): ExpeditionRunScore {
  const survival = clamp(
      sample.heroMaxHp > 0 ? sample.heroHp / sample.heroMaxHp : 0,
    ),
    progress = clamp((sample.chapter * 12 + sample.floor + 1) / 48),
    deckGrowth = clamp((sample.cards - 10) / 20),
    upgradeGrowth = clamp(sample.upgrades / 20),
    relicGrowth = clamp(sample.relics / 12),
    companionValue = clamp(sample.companions / 2),
    economy = clamp(sample.gold / 300),
    reward = clamp(
      (0.27 * survival +
        0.13 * deckGrowth +
        0.08 * upgradeGrowth +
        0.17 * relicGrowth +
        0.08 * companionValue +
        0.09 * economy +
        0.18 * progress) *
        100 +
        (sample.won ? 12 : 0),
      0,
      112,
    ),
    attrition = clamp(
      sample.healthLost / Math.max(1, sample.heroMaxHp + sample.healthLost),
    ),
    irreversible = clamp(
      Number(sample.shopSealed) * 0.55 +
        clamp(sample.companionsLost / 2) * 0.45,
    ),
    mean =
      sample.nodeValues.reduce((sum, value) => sum + value, 0) /
      Math.max(1, sample.nodeValues.length),
    variance =
      sample.nodeValues.reduce(
        (sum, value) => sum + (value - mean) ** 2,
        0,
      ) / Math.max(1, sample.nodeValues.length),
    volatility = clamp(
      Math.sqrt(variance) / Math.max(8, Math.abs(mean) + 8),
    ),
    risk = clamp(
      (0.36 * (1 - survival) +
        0.24 * attrition +
        0.20 * Number(!sample.won) +
        0.10 * volatility +
        0.10 * irreversible) *
        100,
      0,
      100,
    );
  return {
    reward,
    risk,
    utility: reward - riskWeight * risk,
    survival,
    progress,
    volatility,
  };
}

export function conditionalValueAtRisk(
  values: readonly number[],
  alpha = 0.25,
) {
  if (!values.length) return 0;
  const count = Math.max(1, Math.ceil(values.length * alpha)),
    worst = [...values].sort((left, right) => left - right).slice(0, count);
  return -worst.reduce((sum, value) => sum + value, 0) / count;
}

export function summarizeExpeditionRuns(
  samples: readonly ExpeditionRunSample[],
  riskWeight = 0.35,
) {
  const scored = samples.map((sample) => ({
      sample,
      score: evaluateExpeditionRun(sample, riskWeight),
    })),
    utilities = scored.map((entry) => entry.score.utility),
    meanUtility =
      utilities.reduce((sum, value) => sum + value, 0) /
      Math.max(1, utilities.length),
    winRate =
      samples.filter((sample) => sample.won).length /
      Math.max(1, samples.length),
    meanReward =
      scored.reduce((sum, entry) => sum + entry.score.reward, 0) /
      Math.max(1, scored.length),
    meanRisk =
      scored.reduce((sum, entry) => sum + entry.score.risk, 0) /
      Math.max(1, scored.length),
    efficiency =
      samples.reduce((sum, sample) => sum + sample.rounds, 0) /
      Math.max(1, samples.filter((sample) => sample.battlesWon).length);
  return {
    samples,
    scored,
    meanUtility,
    cvar: conditionalValueAtRisk(utilities),
    winRate,
    meanReward,
    meanRisk,
    efficiency,
  };
}
