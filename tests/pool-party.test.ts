import { expect, it } from "vitest";
import { PoolRules } from "../src/domain/pool/rules";
import { poolLayout, standardPoolLayout } from "../src/domain/pool/table";
import type { PoolShot, PoolView } from "../src/domain/pool/types";
import { PoolStrategy } from "../src/domain/pool/strategy";
import type { SearchRequest } from "../src/domain/strategy";

const rules = new PoolRules(() => 0.42);
const view = (players: 3 | 4) =>
  rules.create(players, false, { pool: { mode: "party", shotSeconds: 60, assist: true } })
    .view;

const shot = (base: PoolView, ids: number[], patch: Partial<PoolShot> = {}): PoolShot => ({
  actor: base.turn,
  aim: 0,
  power: 0.6,
  spin: { x: 0, y: 0 },
  cueBefore: { x: -0.5, y: 0 },
  frames: [],
  impacts: [],
  pocketed: ids.map((id) => ({ id, t: 1000 })),
  firstHit: ids[0] ?? 1,
  railAfterContact: true,
  cuePocketed: false,
  finalBalls: base.balls.map((ball) =>
    ids.includes(ball.id) ? { ...ball, pocketed: true } : ball,
  ),
  ...patch,
});

it("racks a larger party table with owned balls and two specials", () => {
  expect(poolLayout("party").table.width).toBeGreaterThan(
    standardPoolLayout.table.width,
  );
  for (const players of [3, 4] as const) {
    const state = view(players);
    expect(state.players).toBe(players);
    expect(state.balls).toHaveLength(1 + players * 3 + 2);
    expect(state.party?.owners).toHaveLength(players);
    expect(state.party?.specials.map((special) => special.kind)).toEqual([
      "bolt",
      "gold",
    ]);
    expect(state.balls.filter((ball) => !ball.pocketed)).toHaveLength(
      1 + players * 3 + 2,
    );
  }
  expect(() =>
    rules.create(2, false, {
      pool: { mode: "party", shotSeconds: 60, assist: true },
    }),
  ).toThrow();
});

it("treats potting an opponent ball as a foul", () => {
  const base = view(3),
    other = base.party!.owners[1][0];
  const next = rules.apply(
    { kind: "pool", view: base },
    0,
    { type: "pool-shot", aim: 0, power: 0.5, spin: { x: 0, y: 0 } },
    shot(base, [other], { firstHit: other }),
  );
  expect(next.view.foul).toBe("打进对手的球");
  expect(next.view.turn).toBe(1);
  expect(next.view.ballInHand).toBe(true);
});

it("keeps the turn on own balls and passes it on misses", () => {
  const base = view(3),
    own = base.party!.owners[0][0],
    other = base.party!.owners[1][0];
  const kept = rules.apply(
    { kind: "pool", view: base },
    0,
    { type: "pool-shot", aim: 0, power: 0.5, spin: { x: 0, y: 0 } },
    shot(base, [own]),
  );
  expect(kept.view.turn).toBe(0);
  expect(kept.view.foul).toBeNull();
  const passed = rules.apply(
    { kind: "pool", view: base },
    0,
    { type: "pool-shot", aim: 0, power: 0.5, spin: { x: 0, y: 0 } },
    shot(base, [], { firstHit: own, railAfterContact: true }),
  );
  expect(passed.view.turn).toBe(1);
});

it("gives ball in hand to the next player after a scratch", () => {
  const base = view(4);
  const next = rules.apply(
    { kind: "pool", view: base },
    0,
    { type: "pool-shot", aim: 0, power: 0.5, spin: { x: 0, y: 0 } },
    shot(base, [0], { cuePocketed: true }),
  );
  expect(next.view.turn).toBe(1);
  expect(next.view.ballInHand).toBe(true);
  expect(next.view.foul).toBe("白球落袋");
});

it("uses the gold special to clear one of your own balls", () => {
  const base = view(3),
    own = base.party!.owners[0],
    gold = base.party!.specials.find((special) => special.kind === "gold")!.id;
  const next = rules.apply(
    { kind: "pool", view: base },
    0,
    {
      type: "pool-shot",
      aim: 0,
      power: 0.5,
      spin: { x: 0, y: 0 },
    },
    shot(base, [gold], { firstHit: gold }),
  );
  expect(next.view.turn).toBe(0);
  expect(
    next.view.balls.filter((ball) => own.includes(ball.id) && ball.pocketed),
  ).toHaveLength(1);
});

it("finishes when a player clears all owned balls", () => {
  const base = view(3),
    own = base.party!.owners[0];
  base.balls = base.balls.map((ball) =>
    own.includes(ball.id) && ball.id !== own[0]
      ? { ...ball, pocketed: true }
      : ball,
  );
  const next = rules.apply(
    { kind: "pool", view: base },
    0,
    { type: "pool-shot", aim: 0, power: 0.5, spin: { x: 0, y: 0 } },
    shot(base, [own[0]]),
  );
  expect(next.view.phase).toBe("finished");
  expect(next.view.winner).toBe(0);
});

it("produces legal party shots through the shared AI", () => {
  const state = rules.create(3, false, {
    pool: { mode: "party", shotSeconds: 60, assist: true },
  });
  const strategy = new PoolStrategy();
  const request: SearchRequest = {
    observation: state,
    actor: 0,
    difficulty: "normal",
    seed: "party-ai",
    audit: true,
  };
  const candidates = strategy.candidates(request);
  expect(candidates.length).toBeGreaterThan(0);
  const decision = strategy.decide(state, 0, "normal", "party-ai");
  expect(decision.chosen.type).toBe("pool-shot");
  if (decision.chosen.type !== "pool-shot") throw new Error("动作错误");
  expect(rules.apply(state, 0, decision.chosen).kind).toBe("pool");
});
