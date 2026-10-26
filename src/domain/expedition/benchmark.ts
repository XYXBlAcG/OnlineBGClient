import { runTrial, policyNames, type Policy, type Trial } from "./strategy";
export interface BenchmarkRow {
  policy: Policy;
  name: string;
  runs: number;
  wins: number;
  winRate: number;
  meanHp: number;
  meanRounds: number;
  meanBlocked: number;
  meanCards: number;
  actions: number;
  elapsedMs: number;
}
export interface BenchmarkReport {
  seedPrefix: string;
  seedStart: number;
  holdout?: BenchmarkReport;
  sampleCount: number;
  rows: BenchmarkRow[];
  environment: string;
  rulesHash?: string;
  generatedAt?: string;
}
export function benchmark(
  count: number,
  progress?: (done: number, total: number) => void,
  seedStart = 0,
): BenchmarkReport {
  const rows: BenchmarkRow[] = [],
    policies: Policy[] = ["random", "attack", "balanced"];
  let done = 0;
  for (const policy of policies) {
    const results: Trial[] = [],
      start = performance.now();
    for (let i = 0; i < count; i++) {
      results.push(
        runTrial(
          `expedition-v1-${String(i + seedStart).padStart(3, "0")}`,
          policy,
        ),
      );
      progress?.(++done, count * policies.length);
    }
    const mean = (key: "remainingHp" | "rounds" | "blocked" | "cards") =>
      results.reduce((sum, r) => sum + r[key], 0) / count;
    const wins = results.filter((r) => r.outcome === "won").length;
    rows.push({
      policy,
      name: policyNames[policy],
      runs: count,
      wins,
      winRate: wins / count,
      meanHp: mean("remainingHp"),
      meanRounds: mean("rounds"),
      meanBlocked: mean("blocked"),
      meanCards: mean("cards"),
      actions: results.reduce((sum, r) => sum + r.actions, 0),
      elapsedMs: performance.now() - start,
    });
  }
  return {
    seedPrefix: "expedition-v1-",
    seedStart,
    sampleCount: count,
    rows,
    environment: "浏览器 Worker",
  };
}
