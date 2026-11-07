import { expect, it } from "vitest";
import { configSchema } from "../src/domain/protocol";
import { gameCatalogue, gameKinds, type GameKind } from "../src/domain/catalogue";
import { createPracticeSession } from "../src/client/practice-room";

function source(kind: GameKind, extra: Record<string, unknown> = {}) {
  const game = gameCatalogue[kind];
  return configSchema.parse({
    kind,
    humans: game.minPlayers,
    ai: [],
    team: false,
    training: false,
    ...extra,
  });
}

it("creates an isolated practice room for every AI-enabled game", () => {
  for (const kind of gameKinds) {
    if (!gameCatalogue[kind].ai) continue;
    const { room, token, config } = createPracticeSession(source(kind));
    expect(room.state, kind).not.toBeNull();
    expect(config.humans, kind).toBe(1);
    expect(config.ai.length, kind).toBeGreaterThan(0);
    const snapshot = room.snapshot(token);
    expect(snapshot.state, kind).not.toBeNull();
    expect(snapshot.seats[0].name, kind).toBe("你");
  }
});

it("keeps special practice modes and team seats", () => {
  const cases: [GameKind, Record<string, unknown>][] = [
    ["scmj", { mahjong: { mode: "riichi", cap: 3, selfDraw: "base" } }],
    ["scmj", { mahjong: { mode: "washizu", cap: 3, selfDraw: "base" } }],
    ["fxq", { flight: { mode: "storm" } }],
    ["tq", { checkers: { mode: "siege" } }],
    ["graphwar", { graphwar: { scenario: "storm" } }],
    ["uno", { team: true, humans: 4 }],
    ["expedition", { expedition: { difficulty: "standard", ascension: 0 } }],
  ];
  for (const [kind, extra] of cases) {
    const { room, token, config } = createPracticeSession(source(kind, extra));
    expect(room.snapshot(token).state, kind).not.toBeNull();
    if (kind === "uno") {
      expect(config.team).toBe(true);
      expect(config.humans + config.ai.length).toBe(4);
    }
    if (kind === "tq") expect(config.checkers.mode).toBe("siege");
    if (kind === "fxq") expect(config.flight.mode).toBe("storm");
    if (kind === "graphwar") expect(config.graphwar.scenario).toBe("storm");
    if (kind === "scmj")
      expect(config.mahjong.mode).toBe(
        (extra.mahjong as { mode?: string } | undefined)?.mode,
      );
  }
});
