import React from "react";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { OriginalGame } from "../src/client/OriginalGame";
import { guideTarget } from "../src/client/guide-targets";

function flight(mode: "classic" | "storm") {
  const room = new Room(
    `flight-${mode}`,
    {
      kind: "fxq",
      humans: 4,
      ai: [],
      team: false,
      training: false,
      aiDelayMs: 0,
      flight: { mode },
    },
    `flight-${mode}`,
  );
  const tokens = ["甲", "乙", "丙", "丁"].map((name) => room.claim(name));
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  return room.snapshot(tokens[0]);
}

it("renders a classic flight board with a sizeable map canvas", () => {
  const snapshot = flight("classic");
  const html = renderToString(
    <OriginalGame snapshot={snapshot} act={() => {}} end={() => {}} />,
  );
  expect(html).toContain('data-game="fxq"');
  expect(html).toContain('class="map-scroll');
  expect(html).toContain('viewBox="-88,-92,176,184"');
  expect(html).toContain("fitted-map");
  expect(html).toContain("flight-status-panel is-classic");
  expect(html).toContain('data-flight-players="expanded"');
  expect(html).toContain("flight-player-toggle");
  expect(html).toContain('data-guide-target="fxq.mode"');
  expect(html).toContain('data-guide-target="fxq.forecast"');
  expect(html).toContain("flight-finish-marker");
  expect(html).toContain("flight-board-overlay");
});

it("renders the storm panel and keeps the board mounted", () => {
  const snapshot = flight("storm");
  const html = renderToString(
    <OriginalGame snapshot={snapshot} act={() => {}} end={() => {}} />,
  );
  expect(html).toContain('data-guide-target="fxq.weather"');
  expect(html).toContain('data-guide-target="fxq.energy"');
  expect(html).toContain('data-guide-target="fxq.shield"');
  expect(html).toContain('data-guide-target="fxq.boost"');
  expect(html).toContain("flight-weather-layer");
  expect(html).toContain("flight-checkpoint-marker");
  expect(html).toContain('viewBox="-88,-92,176,184"');
});

it("shows the weather formula and landing markers after a roll", () => {
  const room = new Room(
    "flight-preview",
    {
      kind: "fxq",
      humans: 2,
      ai: [],
      team: false,
      training: false,
      aiDelayMs: 0,
      flight: { mode: "storm" },
    },
    "flight-preview",
  );
  const tokens = [room.claim("甲"), room.claim("乙")];
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  if (room.state?.kind !== "fxq") throw new Error("wrong game");
  room.state.view.special!.weather = "tailwind";
  room.state.view.planePositionList[0] = 10;
  room.state.view.state = 4;
  room.state.view.lastDice = 5;
  room.version++;
  const html = renderToString(
    <OriginalGame
      snapshot={room.snapshot(tokens[0])}
      act={() => {}}
      end={() => {}}
    />,
  );
  expect(html).toContain("flight-forecast-row");
  expect(html).toContain("flight-landing-marker");
  expect(html).toContain("顺风");
  expect(html).toContain("flight-delta is-up");
});

it("locates precise upstream flight elements instead of the whole table", () => {
  const snapshot = flight("classic");
  expect(guideTarget("fxq.players", snapshot).selector).toBe(
    ".flex.justify-evenly .game-avatar",
  );
  expect(guideTarget("fxq.roll", snapshot).selector).toBe(
    ".text-center button.primary",
  );
  expect(guideTarget("fxq.plane", snapshot).selector).toBe(
    ".fxq-selectable-plane",
  );
  expect(guideTarget("fxq.landing", snapshot).selector).toBe(
    ".flight-landing-marker circle",
  );
});
