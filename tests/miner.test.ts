import { describe, expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Room } from "../src/domain/room";
import {
  minerDynamics,
  minerGems,
  minerItems,
  minerNodeDefinitions,
  minerRelics,
} from "../src/domain/miner/content";
import type { MinerGameState, MinerMove } from "../src/domain/miner/types";

function play(players: number) {
  const engine = new GameEngine();
  let state = engine.create("miner", players, `miner:test:${players}`, false, {
    miner: { floors: 9 },
  });
  let actions = 0;
  while (!engine.finished(state) && actions < 300) {
    if (engine.needsResolution(state)) {
      state = engine.resolve(state, `resolve:${actions}`);
      actions++;
      continue;
    }
    const actors = engine.actors(state);
    let best:
      | {
          actor: number;
          move: MinerMove;
          score: number;
        }
      | undefined;
    for (const actor of actors) {
      const view = engine.project(state, actor);
      for (const candidate of engine.candidates(view, actor)) {
        if (candidate.action.type !== "miner-action") continue;
        const move = candidate.action.move;
        let score = 0;
        if (view.kind === "miner" && view.view.phase === "map") {
          if (move.type !== "vote") continue;
          const node = view.view.map[view.view.floor]?.find(
            (item) => item.id === move.nodeId,
          );
          score =
            node?.kind === "rich"
              ? 100
              : node?.kind === "crystal"
                ? 95
                : node?.kind === "common"
                  ? 90
                  : node?.kind === "contested"
                    ? 80
                    : node?.kind === "shop"
                      ? 60
                      : node?.kind === "rest"
                        ? 50
                        : 20;
        } else if (view.kind === "miner" && move.type === "mine") {
          const deposit = view.view.node?.deposits.find(
            (item) => item.id === move.depositId,
          );
          score =
            100 +
            (deposit?.owner === actor ? 70 : 0) +
            (deposit?.gem?.value ?? 0);
        } else if (move.type === "rest") score = 45;
        else if (move.type === "use-item") score = 30;
        else if (move.type === "event") score = 35;
        else score = 10;
        if (!best || score > best.score) best = { actor, move, score };
      }
    }
    if (!best) throw new Error("没有可用动作");
    state = engine.apply(
      state,
      best.actor,
      { type: "miner-action", move: best.move },
      `move:${actions}`,
    );
    actions++;
  }
  expect(engine.finished(state)).toBe(true);
  expect(state.kind).toBe("miner");
  return state as MinerGameState;
}

describe("miner content", () => {
  it("ships the MVP content counts", () => {
    expect(minerGems).toHaveLength(18);
    expect(Object.keys(minerItems)).toHaveLength(16);
    expect(Object.keys(minerRelics)).toHaveLength(12);
    expect(Object.keys(minerDynamics)).toHaveLength(6);
    expect(Object.keys(minerNodeDefinitions)).toHaveLength(10);
  });
});

describe("miner rules", () => {
  it("votes, enters a node and projects hidden bags", () => {
    const engine = new GameEngine();
    let state = engine.create("miner", 2, "miner:flow", false, {
      miner: { floors: 9 },
    });
    expect(engine.actors(state)).toEqual([0, 1]);
    for (const actor of [0, 1]) {
      const view = engine.project(state, actor);
      const vote = engine
        .candidates(view, actor)
        .find((candidate) => candidate.action.type === "miner-action");
      expect(vote).toBeDefined();
      state = engine.apply(state, actor, vote!.action, `vote:${actor}`);
    }
    expect(engine.needsResolution(state)).toBe(true);
    state = engine.resolve(state, "enter");
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.phase).not.toBe("map");
    expect(state.view.node).not.toBeNull();
    expect(state.view.activeActor).toBeGreaterThanOrEqual(0);
    const view = engine.project(state, 0);
    if (view.kind !== "miner") throw new Error("wrong game");
    expect(view.view.players[1]?.bag).toEqual([]);
  });

  it("mines, steals and keeps going", () => {
    const engine = new GameEngine();
    let state = engine.create("miner", 2, "miner:mine", false, {
      miner: { floors: 9 },
    });
    for (const actor of [0, 1]) {
      const view = engine.project(state, actor);
      if (view.kind !== "miner") throw new Error("wrong game");
      const candidates = engine.candidates(view, actor);
      const vote =
        candidates.find((candidate) => {
          const action = candidate.action;
          if (action.type !== "miner-action") return false;
          if (action.move.type !== "vote") return false;
          const move = action.move;
          const node = view.view.map[view.view.floor]?.find(
            (item) => item.id === move.nodeId,
          );
          return !!node && !["rest", "event", "shop"].includes(node.kind);
        }) ?? candidates[0]!;
      state = engine.apply(state, actor, vote.action, `vote:${actor}`);
    }
    state = engine.resolve(state, "enter");
    if (state.kind !== "miner" || !state.view.node)
      throw new Error("no miner node");
    const actor = state.view.activeActor;
    const deposit = state.view.node.deposits.find((item) => !item.completed);
    expect(deposit).toBeDefined();
    const mine = engine
      .candidates(engine.project(state, actor), actor)
      .find((candidate) => {
        const action = candidate.action;
        return (
          action.type === "miner-action" &&
          action.move.type === "mine" &&
          action.move.depositId === deposit!.id
        );
      });
    expect(mine).toBeDefined();
    state = engine.apply(state, actor, mine!.action, "mine");
    expect(state.kind).toBe("miner");
    if (state.kind !== "miner") throw new Error("wrong game");
    const nextActor = state.view.activeActor;
    const steal = engine
      .candidates(engine.project(state, nextActor), nextActor)
      .find((candidate) => {
        const action = candidate.action;
        return action.type === "miner-action" && action.move.type === "steal";
      });
    if (steal) state = engine.apply(state, nextActor, steal.action, "steal");
    expect(engine.finished(state)).toBe(false);
  });

  it("accepts simultaneous map votes through the room authority", () => {
    const room = new Room("miner-room", {
      kind: "miner",
      humans: 2,
      ai: [],
      team: false,
      training: false,
    });
    const host = room.claim("甲");
    const guest = room.claim("乙");
    room.setReady(guest, true);
    room.start(host);
    const first = room.snapshot(host);
    const firstMove = first.candidates[0]!.action;
    room.act(host, "host-vote", first.version, firstMove);
    const second = room.snapshot(guest);
    const secondMove = second.candidates[0]!.action;
    expect(() =>
      room.act(guest, "guest-vote", second.version, secondMove),
    ).not.toThrow();
    expect(room.resolveIfDue(Date.now() + 10_000)).toBe(true);
    const state = room.snapshot(host).state;
    expect(state?.kind).toBe("miner");
    if (state?.kind === "miner") expect(state.view.phase).not.toBe("map");
  });

  it("plays complete 2/3/4 player runs without illegal states", () => {
    for (const players of [2, 3, 4]) {
      const state = play(players);
      expect(["won", "lost"]).toContain(state.view.phase);
      expect(state.view.result).toBeDefined();
      expect(state.view.result?.ranking).toHaveLength(players);
    }
  });
});
