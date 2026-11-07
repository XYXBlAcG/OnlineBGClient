import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";

function room(kind: "uno" | "fxq" | "tq" | "graphwar", team = false) {
  const players = kind === "uno" ? 4 : 2;
  const value = new Room(`r-${kind}`, {
    kind,
    humans: players,
    ai: [],
    team,
    training: false,
    ...(kind === "fxq" ? { flight: { mode: "storm" as const } } : {}),
    ...(kind === "tq" ? { checkers: { mode: "siege" as const } } : {}),
    ...(kind === "graphwar"
      ? {
          graphwar: {
            scenario: "storm" as const,
            mode: "classic" as const,
            map: "open" as const,
            size: "standard" as const,
            soldiers: 2,
            preview: true,
            turnSeconds: 0 as const,
          },
        }
      : {}),
  });
  const tokens = Array.from({ length: players }, (_, i) => value.claim(`玩家${i}`));
  tokens.slice(1).forEach((token) => value.setReady(token, true));
  value.start(tokens[0]);
  return { room: value, token: tokens[0] };
}

it("replays UNO team and all three new game modes with their metadata", () => {
  for (const [kind, team] of [
    ["uno", true],
    ["fxq", false],
    ["tq", false],
    ["graphwar", false],
  ] as const) {
    const { room: value, token } = room(kind, team);
    value.end(token);
    const record = value.snapshot(token).replay!;
    const frame = new Replay(record).frame(0);
    if (kind === "uno") expect(frame.kind === "uno" && frame.view.teamMode).toBe(true);
    if (kind === "fxq") expect(frame.kind === "fxq" && frame.view.special?.mode).toBe("storm");
    if (kind === "tq") expect(frame.kind === "tq" && frame.view.special?.mode).toBe("siege");
    if (kind === "graphwar")
      expect(frame.kind === "graphwar" && frame.view.wind).toBeDefined();
  }
});
