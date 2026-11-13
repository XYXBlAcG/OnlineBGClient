import type { GameKind } from "./catalogue";

export type AchievementRarity =
  "common" | "rare" | "epic" | "legendary" | "mythic";
export type AchievementGame = GameKind | "app";

export const achievementRarityNames: Record<AchievementRarity, string> = {
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
  mythic: "神话",
};

export const achievementRarityColors: Record<AchievementRarity, string> = {
  common: "#758195",
  rare: "#3f87c7",
  epic: "#279a84",
  legendary: "#bf861c",
  mythic: "#8957c6",
};
