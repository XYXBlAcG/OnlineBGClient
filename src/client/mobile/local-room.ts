import type { DrawMode } from "../../domain/drawguess/types";
import type { GameOptions } from "../../domain/game-options";
import { gameSeatMinimum, gameCatalogue, type GameKind } from "../../domain/catalogue";
import { configSchema, type RoomConfig } from "../../domain/protocol";
import type { Difficulty } from "../../domain/types";
import type { LegacyNodeId } from "../../domain/expedition/legacy";

export interface LocalRoomOptions {
  gameOptions?: Pick<
    GameOptions,
    "pool" | "mahjong" | "expedition" | "dominion" | "flight" | "checkers" | "drawguess" | "golf"
  >;
  humans?: number;
  difficulty?: Difficulty;
  requestedAi?: number;
  aiDelayMs?: number;
  expeditionDifficulty?: "story" | "standard" | "challenge";
  expeditionLegacy?: LegacyNodeId[];
}

export function defaultLocalHumans(kind: GameKind, drawMode?: DrawMode): number {
  const game = gameCatalogue[kind];
  return game.ai ? 1 : gameSeatMinimum(kind, drawMode);
}

export function localAiRange(
  kind: GameKind,
  humans: number,
): { min: number; max: number } {
  const game = gameCatalogue[kind];
  if (!game.ai) return { min: 0, max: 0 };
  return {
    min: Math.max(0, game.minPlayers - humans),
    max: Math.max(0, game.maxPlayers - humans),
  };
}

export function localRoomConfig(
  kind: GameKind,
  options: LocalRoomOptions = {},
): RoomConfig {
  const game = gameCatalogue[kind],
    humans = options.humans ?? defaultLocalHumans(kind, options.gameOptions?.drawguess?.mode),
    range = localAiRange(kind, humans),
    aiCount = game.ai
      ? Math.min(
          Math.max(options.requestedAi ?? range.min, range.min),
          range.max,
        )
      : 0;
  return configSchema.parse({
    ...options.gameOptions,
    kind,
    humans,
    ai: Array.from({ length: aiCount }, () => ({
      difficulty: options.difficulty ?? "normal",
      name: "",
    })),
    team: false,
    training: false,
    aiDelayMs: Math.min(
      5000,
      Math.max(0, Math.round(options.aiDelayMs ?? 1500)),
    ),
    expedition: {
      difficulty: options.expeditionDifficulty ?? "standard",
      ...options.gameOptions?.expedition,
      ...(options.expeditionLegacy ? { legacy: options.expeditionLegacy } : {}),
    },
  });
}

export function localRoomConfigFromParams(
  kind: GameKind,
  params: URLSearchParams,
): RoomConfig {
  const humans = Number.parseInt(params.get("humans") ?? "", 10);
  const ai = Number.parseInt(params.get("ai") ?? "", 10);
  const aiDelayMs = Number.parseInt(params.get("aiDelayMs") ?? "", 10);
  const expeditionDifficulty = params.get("expeditionDifficulty");
  const difficulty = params.get("difficulty");
  return localRoomConfig(kind, {
    gameOptions: params.has("gameOptions")
      ? JSON.parse(params.get("gameOptions")!)
      : undefined,
    humans: Number.isFinite(humans) ? humans : undefined,
    difficulty:
      difficulty === "easy" || difficulty === "hard" ? difficulty : "normal",
    requestedAi: Number.isFinite(ai) ? ai : undefined,
    aiDelayMs: Number.isFinite(aiDelayMs) ? aiDelayMs : undefined,
    expeditionDifficulty:
      expeditionDifficulty === "story" || expeditionDifficulty === "challenge"
        ? expeditionDifficulty
        : "standard",
  });
}
