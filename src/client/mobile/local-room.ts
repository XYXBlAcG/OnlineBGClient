import { gameCatalogue, type GameKind } from "../../domain/catalogue";
import { configSchema, type RoomConfig } from "../../domain/protocol";
import type { Difficulty } from "../../domain/types";

export function defaultLocalHumans(kind: GameKind): number {
  const game = gameCatalogue[kind];
  return game.ai ? 1 : game.minPlayers;
}

export function localRoomConfig(
  kind: GameKind,
  humans = defaultLocalHumans(kind),
  difficulty: Difficulty = "normal",
): RoomConfig {
  const game = gameCatalogue[kind];
  const aiCount = game.ai ? Math.max(0, game.minPlayers - humans) : 0;
  return configSchema.parse({
    kind,
    humans,
    ai: Array.from({ length: aiCount }, () => ({
      difficulty,
      name: "",
    })),
    team: false,
    training: false,
  });
}
