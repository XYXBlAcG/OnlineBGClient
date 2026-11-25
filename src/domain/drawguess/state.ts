import type { FayuState } from "../fayu/types";
import type { DrawMode, DrawState } from "./types";

export type DrawGameState = DrawState | FayuState;

export function isFayuState(state: unknown): state is FayuState {
  if (!state || typeof state !== "object") return false;
  const candidate = state as { kind?: string; mode?: string };
  return candidate.kind === "drawguess" && candidate.mode === "fayu";
}

export function isClassicDrawState(state: unknown): state is DrawState {
  if (!state || typeof state !== "object") return false;
  const candidate = state as { kind?: string; mode?: string };
  return candidate.kind === "drawguess" && candidate.mode !== "fayu";
}

export function drawModeOf(config: { kind?: string; drawguess?: { mode?: DrawMode } }): DrawMode {
  return config.drawguess?.mode === "fayu" ? "fayu" : "classic";
}
