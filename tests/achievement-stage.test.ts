import { expect, it } from "vitest";
import type { ChatMessage } from "../src/domain/social";
import { achievementStageEvents } from "../src/client/party/achievement-stage";
import { resolvePartyArt } from "../src/domain/party/stage";

const achievement = (
  id: string,
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic",
  time = 1000,
): ChatMessage => ({
  type: "achievement",
  id,
  sequence: 1,
  sender: "player-1",
  name: "甲",
  time,
  text: "甲 达成了「纯色胜利」成就",
  achievementId: "uno.pure-color",
  title: "纯色胜利",
  symbol: "🃏",
  rarity,
  game: "uno",
});

it("maps achievement rarity to a deterministic stage event", () => {
  const [event] = achievementStageEvents([achievement("one", "mythic")], 2000);
  expect(event).toMatchObject({
    id: "achievement-stage:one",
    item: "meteors",
    from: "player-1",
    target: "player-1",
    audience: "table",
    caption: "甲 · 神话",
    plugin: { id: "achievement", version: "1", effect: "mythic" },
    visual: {
      scope: "room",
      scene: "achievementMythic",
      particle: "emoji",
      name: "纯色胜利",
      emoji: "🃏",
      color: "#8957c6",
    },
  });
  expect(resolvePartyArt(event)).toMatchObject({
    scene: "achievementMythic",
    glyph: "emoji",
    shader: "bloom",
  });
  expect(
    achievementStageEvents([achievement("one", "mythic")], 2000)[0].seed,
  ).toBe(event.seed);
});

it("only stages epic and above, ignores old messages, and spaces recent ones", () => {
  expect(
    achievementStageEvents([achievement("old", "mythic", 0)], 30_000),
  ).toEqual([]);
  expect(
    achievementStageEvents(
      [achievement("common", "common"), achievement("rare", "rare")],
      2000,
    ),
  ).toEqual([]);
  const [first, second] = achievementStageEvents(
    [achievement("one", "epic", 1000), achievement("two", "mythic", 1000)],
    2000,
  );
  expect(second.time).toBeGreaterThanOrEqual(first.time + first.duration);
});
