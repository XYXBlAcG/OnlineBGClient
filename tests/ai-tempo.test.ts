import { afterEach, expect, it, vi } from "vitest";
import { AiTempo } from "../src/domain/ai-tempo";
import { gameCatalogue, gameKinds } from "../src/domain/catalogue";
import { GameEngine } from "../src/domain/engine";
import { GolfStrategy } from "../src/domain/golf/strategy";
import { Room } from "../src/domain/room";

afterEach(() => vi.useRealTimers());
const start = 10_000;
const playTempo = { humans: 1, aiDelayMs: 0 };
const engine = new GameEngine();

it.each(gameKinds.filter((kind) => gameCatalogue[kind].ai))(
  "reserves observation time for %s even with the fastest room setting",
  (kind) => {
    const state = engine.create(kind, gameCatalogue[kind].minPlayers, "tempo");
    const tempo = new AiTempo();
    tempo.reset(state, start);
    expect(tempo.readyAt(state, 0, playTempo, start, start)).toBeGreaterThan(
      start,
    );
    expect(
      tempo.readyAt(state, 0, { ...playTempo, aiDelayMs: 3000 }, start, start),
    ).toBeGreaterThanOrEqual(start + 3000);
  },
);

it("does not throttle live hook angles or an all-AI performance run", () => {
  const miner = engine.create("miner", 2, "tempo", false, {
    arcadeScenario: {
      kind: "miner",
      durationMs: 45_000,
      target: 100,
      boss: false,
    },
  });
  expect(miner).toMatchObject({ view: { phase: "live" } });
  const tempo = new AiTempo();
  tempo.reset(miner, start);
  expect(tempo.readyAt(miner, 0, playTempo, start + 120, start)).toBe(start);
  const checkers = engine.create("tq", 2, "benchmark");
  expect(
    tempo.readyAt(checkers, 0, { humans: 0, aiDelayMs: 0 }, start, start),
  ).toBe(start);
});

it("honors the golf queue delay and waits for the last putt to play before the same AI continues", () => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
  const room = new Room(
    "golf-tempo",
    {
      kind: "golf",
      humans: 1,
      ai: [{ name: "陪练", difficulty: "easy" }],
      team: false,
      training: false,
      aiDelayMs: 0,
    },
    "golf-tempo",
  );
  const host = room.claim("房主");
  room.start(host);
  const first = room.aiRequest()!;
  const decision = new GolfStrategy().decide(
    first.observation,
    first.actor,
    first.difficulty,
    first.seed,
  );
  const putt = {
    type: "golf-putt" as const,
    hole: 0,
    previousStrokes: 0,
    aim: 0,
    power: 0.55,
  };
  expect(room.queueDecision({ ...decision, chosen: putt }, first.version)).toBe(
    true,
  );
  expect(room.commitIfDue(start + 400)).toBe(false);
  vi.setSystemTime(start + 2600);
  expect(room.commitIfDue()).toBe(true);
  const reply = room.aiRequest()!;
  expect(
    room.queueDecision(
      {
        ...decision,
        chosen: { ...putt, previousStrokes: 1 },
      },
      reply.version,
    ),
  ).toBe(true);
  expect(room.commitIfDue(start + 3700)).toBe(false);
  vi.setSystemTime(start + 6600);
  expect(room.commitIfDue()).toBe(true);
  expect(room.snapshot(host).state).toMatchObject({
    view: { players: [{ strokes: 0 }, { strokes: 2 }] },
  });
});

it.each(["easy", "normal"] as const)(
  "uses an approach shot on the first hole with the %s golf AI",
  (difficulty) => {
    const strategy = new GolfStrategy();
    for (let seed = 0; seed < 8; seed++) {
      const initial = engine.create("golf", 2, `opening-${seed}`);
      const { chosen } = strategy.decide(
        initial,
        1,
        difficulty,
        `opening-${seed}`,
      );
      const next = engine.apply(initial, 1, chosen, "opening");
      expect(next).toMatchObject({
        view: { players: [{ strokes: 0 }, { strokes: 1, sunk: false }] },
      });
    }
  },
);
