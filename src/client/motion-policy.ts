import type { Preferences } from "./preferences";
export type GameMotion = "baseline" | "enhanced" | "reduced";
export function motionPolicy(
  preferences: Pick<Preferences, "motion" | "enhancedGameMotion">,
  reduced: boolean,
  visible: boolean,
): { ui: boolean; game: GameMotion } {
  const allowed = !reduced && visible;
  return {
    ui: allowed && preferences.motion,
    game: allowed
      ? preferences.enhancedGameMotion
        ? "enhanced"
        : "baseline"
      : "reduced",
  };
}
