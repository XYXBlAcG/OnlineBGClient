import { describe, expect, it } from "vitest";
import { gameCatalogue, gameKinds } from "../src/domain/catalogue";
import {
  defaultLocalHumans,
  localRoomConfig,
} from "../src/client/mobile/local-room";

describe("local room configuration", () => {
  it("creates a valid default room for every game", () => {
    for (const kind of gameKinds) {
      const config = localRoomConfig(kind);
      const game = gameCatalogue[kind];
      expect(config.kind).toBe(kind);
      expect(config.humans).toBe(defaultLocalHumans(kind));
      expect(config.humans + config.ai.length).toBeGreaterThanOrEqual(
        game.minPlayers,
      );
      expect(config.humans + config.ai.length).toBeLessThanOrEqual(
        game.maxPlayers,
      );
    }
  });
});
