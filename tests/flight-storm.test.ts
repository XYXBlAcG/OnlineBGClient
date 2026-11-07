import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { configSchema } from "../src/domain/protocol";
import { flightMovePreview, flightWeatherEffect } from "../src/domain/flight";

it("creates storm-route metadata and exposes tactical energy actions", () => {
  const engine = new GameEngine();
  const state = engine.create("fxq", 2, "storm-flight", false, {
    flight: { mode: "storm" },
  });
  if (state.kind !== "fxq") throw new Error("wrong game");
  expect(state.view.special).toMatchObject({
    mode: "storm",
    round: 1,
    maxEnergy: 3,
    checkpoints: [13, 31, 49],
  });
  state.view.special!.energy[0] = 1;
  const action = engine
    .candidates(state, 0)
    .map((candidate) => candidate.action)
    .find(
      (candidate) =>
        candidate.type === "fxq-special" && candidate.ability === "shield",
    );
  expect(action).toBeDefined();
  if (action?.type !== "fxq-special") throw new Error("missing action");
  const next = engine.apply(state, 0, action, "ability");
  if (next.kind !== "fxq") throw new Error("wrong game");
  expect(next.view.special?.energy[0]).toBe(0);
  expect(next.view.special?.shield[0]).toBe(1);
  expect(next.view.special?.lastAbility).toMatchObject({
    actor: 0,
    ability: "shield",
    round: 1,
  });
});

function stormMove(weather: "tailwind" | "headwind" | "crosswind" | "storm") {
  const engine = new GameEngine();
  const state = engine.create("fxq", 2, `storm-${weather}`, false, {
    flight: { mode: "storm" },
  });
  if (state.kind !== "fxq") throw new Error("wrong game");
  const view = state.view;
  view.special!.weather = weather;
  view.special!.shield[0] = 0;
  view.planePositionList[0] = 10;
  view.state = 4;
  view.lastDice = 5;
  const candidate = engine
    .candidates(state, 0)
    .find((item) => item.action.type === "fxq-move");
  if (candidate?.action.type !== "fxq-move") throw new Error("missing move");
  return { engine, state, view, plane: candidate.action.plane };
}

it("previews and applies weather distance with visible feedback", () => {
  expect(flightWeatherEffect("tailwind").move).toBe(1);
  expect(flightWeatherEffect("headwind").move).toBe(-1);
  expect(flightWeatherEffect("storm").move).toBe(-2);
  expect(flightWeatherEffect("crosswind").move).toBe(-1);
  const { engine, state, view, plane } = stormMove("crosswind");
  const preview = flightMovePreview(view, 0, plane);
  expect(preview).not.toBeNull();
  expect(preview!.weatherMove).toBe(-1);
  expect(preview!.to).toBe(preview!.baseTo - 1);
  expect(preview!.energyGain).toBe(1);
  expect(preview!.shielded).toBe(false);
  const next = engine.apply(
    state,
    0,
    { type: "fxq-move", plane },
    "weather-move",
  );
  if (next.kind !== "fxq") throw new Error("wrong game");
  expect(next.view.planePositionList[plane]).toBe(preview!.to);
  expect(next.view.special!.energy[0]).toBe(1);
  expect(next.view.special!.lastEffect).toMatchObject({
    plane,
    weather: "crosswind",
    weatherMove: -1,
    energyGain: 1,
  });
});

it("lets a shield cancel crosswind without granting energy", () => {
  const { engine, state, view, plane } = stormMove("crosswind");
  view.special!.shield[0] = 1;
  const preview = flightMovePreview(view, 0, plane);
  expect(preview!.shielded).toBe(true);
  expect(preview!.weatherMove).toBe(0);
  expect(preview!.to).toBe(preview!.baseTo);
  expect(preview!.energyGain).toBe(0);
  const next = engine.apply(
    state,
    0,
    { type: "fxq-move", plane },
    "shielded-move",
  );
  if (next.kind !== "fxq") throw new Error("wrong game");
  expect(next.view.special!.shield[0]).toBe(0);
  expect(next.view.special!.energy[0]).toBe(0);
  expect(next.view.special!.lastEffect?.shielded).toBe(true);
});

it("keeps classic flight available and validates its option payload", () => {
  const cfg = configSchema.parse({
    kind: "fxq",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  expect(cfg.flight.mode).toBe("classic");
});

it("offers every parked plane when an even roll allows takeoff", () => {
  const engine = new GameEngine();
  const state = engine.create("fxq", 2, "even-takeoff");
  if (state.kind !== "fxq") throw new Error("wrong game");
  state.view.state = 4;
  state.view.lastDice = 4;
  state.view.sixTimes = 0;
  state.view.planePositionList[0] = 0;
  state.view.planePositionList[1] = 0;
  state.view.planePositionList[2] = 0;
  state.view.planePositionList[3] = 0;
  const moves = engine
    .candidates(state, 0)
    .filter((candidate) => candidate.action.type === "fxq-move");
  expect(moves.map((candidate) => candidate.action)).toEqual([
    { type: "fxq-move", plane: 0 },
    { type: "fxq-move", plane: 1 },
    { type: "fxq-move", plane: 2 },
    { type: "fxq-move", plane: 3 },
  ]);
  for (const candidate of moves)
    expect(() =>
      engine.apply(
        state,
        0,
        candidate.action,
        `takeoff-${JSON.stringify(candidate.action)}`,
      ),
    ).not.toThrow();
});
