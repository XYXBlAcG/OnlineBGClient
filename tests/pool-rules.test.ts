import { expect, it } from "vitest";
import { gameCatalogue } from "../src/domain/catalogue";
import { GameEngine } from "../src/domain/engine";
import { configSchema } from "../src/domain/protocol";
import { PoolRules, applyOutcome } from "../src/domain/pool/rules";
import type { PoolShot, PoolView } from "../src/domain/pool/types";

const rules = new PoolRules(() => 0.42);
const view = (mode: "eight-ball" | "nine-ball" = "eight-ball") =>
  rules.create(2, false, { pool: { mode, shotSeconds: 60, assist: true } })
    .view;

const shot = (base: PoolView, patch: Partial<PoolShot> = {}): PoolShot => ({
  actor: base.turn,
  aim: 0,
  power: 0.6,
  spin: { x: 0, y: 0 },
  cueBefore: { x: -0.56, y: 0 },
  frames: [],
  impacts: [],
  pocketed: [],
  firstHit: 1,
  railAfterContact: true,
  cuePocketed: false,
  finalBalls: base.balls.map((ball) => ({ ...ball })),
  ...patch,
});

const pocket = (
  view: PoolView,
  ids: number[],
  patch: Partial<PoolShot> = {},
) => {
  const finalBalls = view.balls.map((ball) =>
    ids.includes(ball.id) ? { ...ball, pocketed: true } : ball,
  );
  return shot(view, {
    pocketed: ids.map((id) => ({ id, t: 1000 })),
    finalBalls,
    ...patch,
  });
};

it("registers pool in the sports category with default room options", () => {
  const config = configSchema.parse({
    kind: "pool",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  expect(gameCatalogue.pool.category).toBe("体育");
  expect(config.pool.mode).toBe("eight-ball");
  expect(config.pool.shotSeconds).toBe(60);
  expect(
    configSchema.parse({
      kind: "pool",
      humans: 1,
      ai: [{ difficulty: "normal", name: "" }],
      team: false,
      training: false,
    }).ai,
  ).toHaveLength(1);
});

it("creates through the shared game engine and exposes the pool options", () => {
  const state = new GameEngine().create("pool", 2, "engine", false, {
    pool: { mode: "nine-ball", shotSeconds: 45, assist: true },
  });
  expect(state.kind).toBe("pool");
  if (state.kind !== "pool") throw new Error("状态错误");
  expect(state.view.mode).toBe("nine-ball");
  expect(state.view.balls).toHaveLength(10);
  expect(state.view.options.shotSeconds).toBe(45);
});

it("only allows cue placement when the player has ball in hand", () => {
  const state = rules.create(2, false, {
    pool: { mode: "eight-ball", shotSeconds: 60, assist: true },
  });
  expect(() =>
    rules.apply(state, 0, {
      type: "pool-shot",
      aim: 0,
      power: 0.5,
      spin: { x: 0, y: 0 },
      cue: { x: 0, y: 0 },
    }),
  ).toThrow("当前不能放置白球");
  const inHand = structuredClone(state);
  inHand.view.ballInHand = true;
  inHand.view.phase = "ball-in-hand";
  const next = rules.apply(inHand, 0, {
    type: "pool-shot",
    aim: 0,
    power: 0.5,
    spin: { x: 0, y: 0 },
    cue: { x: 0, y: 0 },
  });
  expect(next.view.lastShot?.cueBefore).toEqual({ x: 0, y: 0 });
});

it("creates a two-player break with the selected mode", () => {
  const eight = view("eight-ball");
  const nine = view("nine-ball");
  expect(eight.mode).toBe("eight-ball");
  expect(eight.balls).toHaveLength(16);
  expect(eight.phase).toBe("break");
  expect(nine.mode).toBe("nine-ball");
  expect(nine.balls).toHaveLength(10);
});

it("assigns groups on the first legal open-table pocket and keeps the turn", () => {
  const base = view();
  base.shotNumber = 1;
  const next = applyOutcome(base, 0, pocket(base, [3]));
  expect(next.openTable).toBe(false);
  expect(next.groups).toEqual([0, 1]);
  expect(next.turn).toBe(0);
  expect(next.ballInHand).toBe(false);
});

it("passes the turn after a legal miss and gives ball in hand after a scratch", () => {
  const base = view();
  base.shotNumber = 1;
  const miss = applyOutcome(base, 0, shot(base, { firstHit: 1 }));
  expect(miss.turn).toBe(1);
  expect(miss.foul).toBeNull();

  const scratch = applyOutcome(
    base,
    0,
    pocket(base, [0], { cuePocketed: true, firstHit: 1 }),
  );
  expect(scratch.turn).toBe(1);
  expect(scratch.ballInHand).toBe(true);
  expect(scratch.foul).toBe("白球落袋");
});

it("re-spots the eight on the break but loses on an early eight", () => {
  const base = view();
  const breakEight = applyOutcome(base, 0, pocket(base, [8]));
  expect(breakEight.phase).not.toBe("finished");
  expect(breakEight.balls.find((ball) => ball.id === 8)?.pocketed).toBe(false);

  const early = view();
  early.shotNumber = 1;
  const loss = applyOutcome(early, 0, pocket(early, [8], { firstHit: 8 }));
  expect(loss.phase).toBe("finished");
  expect(loss.winner).toBe(1);
});

it("wins with the eight after clearing the group", () => {
  const base = view();
  base.shotNumber = 1;
  base.groups = [0, 1];
  base.balls = base.balls.map((ball) =>
    ball.id !== 0 && ball.id !== 8 && ball.id <= 7
      ? { ...ball, pocketed: true }
      : ball,
  );
  const win = applyOutcome(
    base,
    0,
    pocket(base, [8], { firstHit: 8, railAfterContact: false }),
  );
  expect(win.phase).toBe("finished");
  expect(win.winner).toBe(0);
});

it("enforces the lowest-ball rule in nine-ball", () => {
  const base = view("nine-ball");
  base.shotNumber = 1;
  const legal = applyOutcome(base, 0, pocket(base, [1], { firstHit: 1 }));
  expect(legal.turn).toBe(0);
  expect(legal.foul).toBeNull();

  const foul = applyOutcome(base, 0, pocket(base, [2], { firstHit: 2 }));
  expect(foul.turn).toBe(1);
  expect(foul.ballInHand).toBe(true);
});

it("pockets nine early for a casual nine-ball win", () => {
  const base = view("nine-ball");
  base.shotNumber = 1;
  const win = applyOutcome(base, 0, pocket(base, [9], { firstHit: 1 }));
  expect(win.phase).toBe("finished");
  expect(win.winner).toBe(0);
});

it("re-spots a fouled nine and permits the opponent to finish the rack", () => {
  const base = view("nine-ball");
  base.shotNumber = 1;
  base.balls = base.balls.map((ball) =>
    ball.id > 0 && ball.id !== 9 ? { ...ball, pocketed: true } : ball,
  );
  const foul = applyOutcome(
    base,
    0,
    pocket(base, [0, 9], { firstHit: 9, cuePocketed: true }),
  );
  expect(foul.balls.find((ball) => ball.id === 9)?.pocketed).toBe(false);
  expect(foul.ballInHand).toBe(true);
  const win = applyOutcome(foul, 1, pocket(foul, [9], { firstHit: 9 }));
  expect(win.winner).toBe(1);
});

it("keeps re-spotted balls on the table when the foot-side line is occupied", () => {
  const base = view();
  let i = 0;
  base.balls = base.balls.map((ball) =>
    ball.id !== 8 && ball.id !== 0
      ? { ...ball, x: 0.56 + i++ * 0.061, y: 0 }
      : ball,
  );
  const next = applyOutcome(base, 0, pocket(base, [8]));
  const eight = next.balls.find((ball) => ball.id === 8)!;
  expect(Math.abs(eight.x)).toBeLessThan(1.12 - 0.031);
  expect(
    next.balls
      .filter((ball) => ball.id !== 8 && !ball.pocketed)
      .every((ball) => Math.hypot(ball.x - eight.x, ball.y - eight.y) >= 0.062),
  ).toBe(true);
});

it("re-spots a scratched cue without overlapping an object at the head spot", () => {
  const base = view();
  base.shotNumber = 1;
  base.balls.find((ball) => ball.id === 1)!.x = -0.56;
  base.balls.find((ball) => ball.id === 1)!.y = 0;
  const next = applyOutcome(base, 0, pocket(base, [0], { cuePocketed: true }));
  const cue = next.balls.find((ball) => ball.id === 0)!;
  expect(
    next.balls
      .filter((ball) => ball.id !== 0 && !ball.pocketed)
      .every((ball) => Math.hypot(ball.x - cue.x, ball.y - cue.y) >= 0.062),
  ).toBe(true);
});

it("uses the same playback speed for the room action delay and client animation", async () => {
  const { POOL_PLAYBACK_RATE } = await import("../src/client/pool/frames");
  const { POOL_OPPONENT_LEAD_IN } = await import("../src/domain/pool/types");
  const state = rules.create(2, false);
  state.view.lastShot = shot(state.view, {
    frames: [
      { t: 0, balls: [] },
      { t: 3000, balls: [] },
    ],
  });
  expect(rules.actionDelay(state)).toBe(
    3000 / POOL_PLAYBACK_RATE + POOL_OPPONENT_LEAD_IN,
  );
});
