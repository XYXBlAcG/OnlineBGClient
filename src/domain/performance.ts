import { z } from "zod";
export const performanceSchema = z.object({
  mode: z.enum(["auto", "single", "multi"]).default("auto"),
  threads: z.number().int().min(1).max(32).default(8),
});
export type PerformanceSettings = z.infer<typeof performanceSchema>;
export function computeThreads(
  settings: PerformanceSettings,
  cores: number,
): number {
  const available = Math.max(1, Math.min(32, Math.floor(cores) || 1));
  return settings.mode === "single"
    ? 1
    : settings.mode === "multi"
      ? Math.min(available, settings.threads)
      : Math.max(1, Math.min(16, available - 2));
}

export interface ComputeProgress {
  elapsedMs: number;
  simulations: number;
  scoredCandidates: number;
  threads: number;
  status: "computing" | "completed";
}
export interface AiComputation extends ComputeProgress {
  actor: number;
  version: number;
  completedDecisions: number;
  totalElapsedMs: number;
  totalSimulations: number;
}
