import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { unoCardLabel } from "../src/domain/table-mind/perspectives/uno";
import { Room } from "../src/domain/room";
import { Strategies } from "../src/domain/strategies";
import { Replay } from "../src/domain/replay";
import { parseCandidateChoice } from "../src/server/llm-seat";

it("uses the authoritative decoder for every UNO card", () => {
  const original = new GameEngine().uno;
  for (let card = 0; card < 108; card++) {
    const type = original.Vz(card);
    const name = type === 14 ? "万能" : type === 15 ? "+4" : original.uj[type];
    expect(unoCardLabel(card)).toContain(name);
    if (card < 100)
      expect(unoCardLabel(card)).toContain(original.SV[Math.floor(card / 25)]);
  }
});

it.each(["-1", "+1", "0.8", "选择 1", "0.8，最终选择 2", "1\n2", "1e0"])(
  "rejects noncanonical choice %s",
  (text) => {
    expect(parseCandidateChoice(text, 3)).toBeNull();
  },
);
it("accepts only a whole candidate index in range", () => {
  expect(parseCandidateChoice(" 2\n", 3)).toBe(2);
  expect(parseCandidateChoice("3", 3)).toBeNull();
});

it("records exactly the seed used by an AI action and replays the resulting state", () => {
  const room = new Room("seed-test", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy" }],
    team: false,
    training: false,
  });
  const token = room.claim("甲");
  room.seats.forEach((seat) => {
    seat.ready = true;
  });
  room.start(token);
  const version = room.version;
  const decision = new Strategies().decide(
    room.engine.project(room.state!, 0),
    0,
    "easy",
    "seed",
  );
  expect(
    room.acceptDecision(
      {
        actor: 0,
        chosen: decision.chosen,
        difficulty: "easy",
        simulations: 0,
        audit: decision,
      },
      version,
    ),
  ).toBe(true);
  const record = room.export().replay!;
  expect(room.version).toBe(version + 1);
  expect(record.events.at(-1)?.seed).toBe(`${room.seed}:move:${version}`);
  expect(new Replay(record).frames().at(-1)).toEqual(room.state);
});

it("keeps AI exchange cards out of public events even with audit enabled", () => {
  const room = new Room("exchange-test", {
    kind: "scmj",
    humans: 1,
    ai: Array.from({ length: 3 }, () => ({ difficulty: "easy" })),
    team: false,
    training: false,
    auditEnabled: true,
  });
  const token = room.claim("甲");
  room.seats.forEach((seat) => {
    seat.ready = true;
  });
  room.start(token);
  room.drainTableEvents();
  const request = room.aiRequest()!;
  const decision = new Strategies().decide(
    request.observation,
    request.actor,
    "easy",
    "exchange",
  );
  room.acceptDecision(
    {
      actor: request.actor,
      chosen: decision.chosen,
      difficulty: "easy",
      simulations: 0,
      audit: decision,
    },
    request.version,
  );
  const event = room
    .drainTableEvents()
    .find((event) => event.kind === "action")!;
  expect(event.label).not.toMatch(/[一二三四五六七八九1-9][万筒条]/);
  expect(event.payload).toBeUndefined();
});

it("provides lean LLM choices without building or persisting an audit", async () => {
  const { SearchCoordinator, ComputePool } =
    await import("../src/domain/compute");
  const { executeSearchTask } = await import("../src/domain/strategy");
  const engine = new GameEngine(),
    strategies = new Strategies();
  const pool = new ComputePool(() => {
    let receive!: (
      output: import("../src/domain/compute").ComputeOutput,
    ) => void;
    return {
      send: ({ id, task }) =>
        receive({
          id,
          output: executeSearchTask(
            strategies.select(task.request.observation.kind),
            task,
          ),
        }),
      receive: (callback) => {
        receive = callback;
      },
      error() {},
      close() {},
    };
  }, 1);
  try {
    let state = engine.create("uno", 2, "lean");
    state = engine.apply(state, 0, { type: "uno-start" }, "lean-start");
    const actor = engine.actors(state)[0];
    const result = await new SearchCoordinator(pool).decide(
      {
        observation: engine.project(state, actor),
        actor,
        difficulty: "easy",
        seed: "lean-choice",
        audit: false,
        choices: true,
      },
      1,
    );
    expect(result.audit).toBeUndefined();
    expect(result.choices?.length).toBeGreaterThan(0);
    expect(
      result.choices?.every((choice) => choice.features.length === 0),
    ).toBe(true);
  } finally {
    pool.close();
  }
});
