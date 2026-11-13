import { describe, expect, it } from "vitest";
import { gameCatalogue, gameKinds } from "../src/domain/catalogue";
import {
  defaultLocalHumans,
  localAiRange,
  localRoomConfig,
  localRoomConfigFromParams,
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

  it("allows one human against multiple AI", () => {
    const config = localRoomConfig("uno", {
      humans: 1,
      difficulty: "hard",
      requestedAi: 5,
    });
    expect(config.humans).toBe(1);
    expect(config.ai).toHaveLength(5);
    expect(config.ai.every((seat) => seat.difficulty === "hard")).toBe(true);
    expect(config.humans + config.ai.length).toBe(6);
  });

  it("clamps AI count to the game seat range", () => {
    expect(
      localRoomConfig("uno", { humans: 1, requestedAi: 0 }).ai,
    ).toHaveLength(1);
    expect(
      localRoomConfig("uno", { humans: 1, requestedAi: 99 }).ai,
    ).toHaveLength(7);
    expect(
      localRoomConfig("ddz", { humans: 3, requestedAi: 2 }).ai,
    ).toHaveLength(0);
  });

  it("passes expedition legacy into the local room config", () => {
    const config = localRoomConfig("expedition", {
      humans: 1,
      requestedAi: 1,
      expeditionLegacy: ["supply1", "supply2"],
    });
    expect(config.expedition.legacy).toEqual(["supply1", "supply2"]);
  });

  it("reports the AI range for one human", () => {
    expect(localAiRange("uno", 1)).toEqual({ min: 1, max: 7 });
    expect(localAiRange("expedition", 1)).toEqual({ min: 0, max: 3 });
    expect(localAiRange("ddz", 3)).toEqual({ min: 0, max: 0 });
  });

  it("reads native table setup from the URL", () => {
    const config = localRoomConfigFromParams(
      "uno",
      new URLSearchParams(
        "humans=1&ai=5&difficulty=hard&aiDelayMs=2500&expeditionDifficulty=challenge",
      ),
    );
    expect(config.humans).toBe(1);
    expect(config.ai).toHaveLength(5);
    expect(config.ai[0].difficulty).toBe("hard");
    expect(config.aiDelayMs).toBe(2500);
    expect(config.expedition.difficulty).toBe("challenge");
    expect(
      localRoomConfigFromParams("uno", new URLSearchParams()).ai,
    ).toHaveLength(1);
  });
});
