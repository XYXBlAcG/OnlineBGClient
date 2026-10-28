import type { Preferences } from "./preferences";
export type GameMotion = "baseline" | "enhanced" | "reduced";
export function motionPolicy(
  preferences: Pick<Preferences, "motion" | "enhancedGameMotion">,
  reduced: boolean,
  visible: boolean,
): { ui: boolean; game: GameMotion; social: boolean } {
  const allowed = !reduced && visible;
  return {
    ui: allowed && preferences.motion,
    social: allowed,
    game: allowed
      ? preferences.enhancedGameMotion
        ? "enhanced"
        : "baseline"
      : "reduced",
  };
}
