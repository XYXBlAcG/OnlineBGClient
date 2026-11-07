import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { OriginalGame } from "../src/client/OriginalGame";
import { Room } from "../src/domain/room";

afterEach(() => vi.unstubAllGlobals());

function startRoom(
  kind: "fxq" | "tq",
  options: { flight?: { mode: "storm" }; checkers?: { mode: "siege" } },
) {
  const room = new Room(
    `mode-${kind}`,
    {
      kind,
      humans: 2,
      ai: [],
      team: false,
      training: false,
      aiDelayMs: 0,
      ...options,
    },
    `mode-seed-${kind}`,
  );
  const tokens = [room.claim("甲"), room.claim("乙")];
  for (const seat of room.seats)
    if (seat.token) room.setReady(seat.token, true);
  room.start(tokens[0]);
  return { room, tokens };
}

function playOut(room: Room, tokens: string[], limit = 1000) {
  for (
    let turn = 0;
    turn < limit && !room.engine.finished(room.state!);
    turn++
  ) {
    const actor = room.engine.actors(room.state!)[0];
    if (actor === undefined) throw new Error("no actor");
    const candidate = room.engine.candidates(room.state!, actor)[0];
    if (!candidate) throw new Error("no candidate");
    room.act(tokens[actor], `turn:${turn}`, room.version, candidate.action);
  }
  expect(room.engine.finished(room.state!)).toBe(true);
}

it("plays a complete storm flight round with its special actions", () => {
  const { room, tokens } = startRoom("fxq", { flight: { mode: "storm" } });
  const state = room.state!;
  if (state.kind !== "fxq") throw new Error("wrong game");
  expect(state.view.special?.mode).toBe("storm");
  playOut(room, tokens);
});

it("plays a complete checkers siege round with its special objectives", () => {
  const { room, tokens } = startRoom("tq", { checkers: { mode: "siege" } });
  const state = room.state!;
  if (state.kind !== "tq") throw new Error("wrong game");
  expect(state.view.special?.mode).toBe("siege");
  playOut(room, tokens);
});

it("renders the storm and siege status panels inside the real table", () => {
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    createElement: () => ({ setAttribute: () => {}, clientWidth: 16 }),
    body: { appendChild: () => {}, removeChild: () => {} },
  });
  const flight = startRoom("fxq", { flight: { mode: "storm" } });
  const checkers = startRoom("tq", { checkers: { mode: "siege" } });
  expect(
    renderToString(
      <OriginalGame
        snapshot={flight.room.snapshot(flight.tokens[0])}
        act={() => {}}
        end={() => {}}
      />,
    ),
  ).toContain("风暴航线");
  expect(
    renderToString(
      <OriginalGame
        snapshot={checkers.room.snapshot(checkers.tokens[0])}
        act={() => {}}
        end={() => {}}
      />,
    ),
  ).toContain("据点攻防");
});
