import { gameCatalogue } from "../domain/catalogue";
import { Room } from "../domain/room";
import type { RoomConfig } from "../domain/protocol";

export function createPracticeSession(source: RoomConfig) {
  const game = gameCatalogue[source.kind];
  const targetPlayers = Math.max(
    2,
    game.team && source.team ? Math.min(4, game.maxPlayers) : game.minPlayers,
  );
  const aiCount = Math.max(0, targetPlayers - 1);
  const config: RoomConfig = {
    ...structuredClone(source),
    humans: 1,
    ai: Array.from({ length: aiCount }, () => ({
      difficulty: "easy",
      name: "",
    })),
    team: game.team && source.team && [4, 6].includes(targetPlayers),
    aiDelayMs: 0,
    training: false,
  };
  const room = new Room(
    `practice-${source.kind}`,
    config,
    `practice-${source.kind}-${source.mahjong?.mode ?? source.flight?.mode ?? "standard"}`,
  );
  const token = room.claim("你");
  room.setReady(token, true);
  room.start(token);
  return { room, token, config };
}
