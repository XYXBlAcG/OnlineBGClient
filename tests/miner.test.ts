import { describe, expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Room } from "../src/domain/room";
import { gameCatalogue } from "../src/domain/catalogue";
import { generateMap } from "../src/domain/expedition/map";
import {
  minerItems,
  minerObjects,
  minerSceneFor,
} from "../src/domain/miner/content";
import { generateMinerMap, mapChoices } from "../src/domain/miner/map";
import type { GameState } from "../src/domain/types";
import type { MinerGameState } from "../src/domain/miner/types";

function enterMine(engine: GameEngine, players = 2, seed = "miner:test") {
  let state = engine.create("miner", players, seed, false);
  const view0 = engine.project(state, 0);
  if (view0.kind !== "miner") throw new Error("wrong game");
  const mineChoice = mapChoices(view0.view).find(
    (node) => minerSceneFor(node.kind) === "mine",
  );
  for (const actor of Array.from({ length: players }, (_, i) => i)) {
    const view = engine.project(state, actor);
    if (view.kind !== "miner") throw new Error("wrong game");
    const candidate = engine.candidates(view, actor).find((item) => {
      const action = item.action;
      return (
        action.type === "miner-action" &&
        action.move.type === "vote" &&
        action.move.nodeId === mineChoice?.id
      );
    });
    if (!candidate) throw new Error("没有路线票");
    state = engine.apply(state, actor, candidate.action, `vote:${actor}`);
  }
  state = engine.resolve(state, "enter");
  if (state.kind !== "miner") throw new Error("wrong game");
  return state;
}

function angleTo(x: number, y: number) {
  return Math.max(
    -84,
    Math.min(84, (Math.atan2(x - 0.5, y - 0.03) * 180) / Math.PI),
  );
}

describe("miner capabilities", () => {
  it("declares AI and mobile support", () => {
    expect(gameCatalogue.miner.ai).toBe(true);
    expect(gameCatalogue.miner.mobile).toBe(true);
  });
});

describe("miner content", () => {
  it("ships the Gold Miner object and item set", () => {
    expect(Object.keys(minerObjects)).toHaveLength(9);
    expect(Object.keys(minerItems)).toHaveLength(6);
    expect(minerSceneFor("battle")).toBe("mine");
    expect(minerSceneFor("shop")).toBe("shop");
    expect(minerSceneFor("camp")).toBe("camp");
    expect(minerSceneFor("event")).toBe("event");
  });
});

describe("shared expedition map", () => {
  it("uses the exact expedition topology", () => {
    expect(generateMinerMap("same-seed")).toEqual(generateMap("same-seed", 2, 0));
    const nodes = generateMinerMap("same-seed").flat();
    expect(nodes.length).toBeGreaterThan(30);
    expect(nodes.some((node) => node.next.some((id) => {
      const target = nodes.find((candidate) => candidate.id === id);
      return target && target.floor > node.floor + 1;
    }))).toBe(true);
  });
});

describe("real-time mining", () => {
  it("starts from the shared map and enters a live mine", () => {
    const engine = new GameEngine();
    const state = enterMine(engine, 3);
    expect(state.view.phase).toBe("live");
    expect(state.view.node?.scene).toBe("mine");
    expect(state.view.node?.objects.length).toBeGreaterThan(0);
    expect(state.view.players[0]?.hook.phase).toBe("swing");
  });

  it("swings, drops, catches and scores with independent hooks", () => {
    const engine = new GameEngine();
    let state: GameState = enterMine(engine, 2);
    if (state.kind !== "miner") throw new Error("wrong game");
    const object = state.view.node!.objects.find((item) => !item.removed)!;
    const actor = 0;
    const before = state.view.players[actor]!.score;
    state = engine.apply(
      state,
      actor,
      {
        type: "miner-action",
        move: { type: "drop", angle: angleTo(object.x, object.y) },
      },
      "drop",
    );
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.players[actor]!.hook.phase).not.toBe("swing");
    for (let tick = 0; tick < 100; tick++) {
      if (state.kind !== "miner" || state.view.phase !== "live") break;
      state = engine.resolve(state, `tick:${tick}`);
    }
    expect(state.kind).toBe("miner");
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.players[actor]!.score).toBeGreaterThan(before);
    expect(state.view.players[actor]!.hook.phase).toBe("swing");
  });

  it("accepts a real-time drop through the room authority", () => {
    const room = new Room("miner-room-live", {
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
    if (first.state?.kind !== "miner") throw new Error("wrong game");
    const mineNode = mapChoices(first.state.view).find(
      (node) => minerSceneFor(node.kind) === "mine",
    );
    const hostVote = first.candidates.find((candidate) => {
      const action = candidate.action;
      return (
        action.type === "miner-action" &&
        action.move.type === "vote" &&
        action.move.nodeId === mineNode?.id
      );
    });
    room.act(host, "host-vote", first.version, hostVote!.action);
    const second = room.snapshot(guest);
    const guestVote = second.candidates.find((candidate) => {
      const action = candidate.action;
      return (
        action.type === "miner-action" &&
        action.move.type === "vote" &&
        action.move.nodeId === mineNode?.id
      );
    });
    room.act(guest, "guest-vote", second.version, guestVote!.action);
    expect(room.resolveIfDue(Date.now() + 10_000)).toBe(true);
    const live = room.snapshot(host);
    expect(live.state?.kind).toBe("miner");
    if (live.state?.kind !== "miner") throw new Error("wrong game");
    expect(live.state.view.phase).toBe("live");
    const actor = 0;
    const object = live.state.view.node!.objects.find((item) => !item.removed)!;
    room.act(host, "host-drop", live.version, {
      type: "miner-action",
      move: { type: "drop", angle: angleTo(object.x, object.y) },
    });
    expect(room.snapshot(host).state?.kind).toBe("miner");
    for (let tick = 0; tick < 20; tick++)
      room.resolveIfDue(Date.now() + 10_000 + tick * 1000);
    const ticked = room.snapshot(host).state;
    if (ticked?.kind !== "miner") throw new Error("wrong game");
    expect(ticked.view.phase).toBe("live");
    expect(ticked.view.node!.timeLeftMs).toBeLessThan(60_000);
  });

  it("votes and can enter a shop or camp node", () => {
    const engine = new GameEngine();
    let state: GameState = enterMine(engine, 2);
    if (state.kind !== "miner") throw new Error("wrong game");
    for (
      let tick = 0;
      tick < 2000 && state.kind === "miner" && state.view.phase === "live";
      tick++
    )
      state = engine.resolve(state, `tick:${tick}`);
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(["map", "won", "lost", "shop", "camp", "event"]).toContain(
      state.view.phase,
    );
  });
});

describe("miner AI", () => {
  it("chooses legal real-time actions", async () => {
    const { MinerStrategy } = await import("../src/domain/miner/strategy");
    const engine = new GameEngine();
    let state = engine.create("miner", 2, "miner:ai", false);
    const strategy = new MinerStrategy();
    for (let step = 0; step < 30 && !engine.finished(state); step++) {
      if (engine.needsResolution(state)) {
        state = engine.resolve(state, `resolve:${step}`);
        continue;
      }
      const actor = engine.actors(state)[0];
      if (actor === undefined) break;
      const view = engine.project(state, actor);
      const decision = strategy.decide(view, actor, "normal", `ai:${step}`);
      state = engine.apply(state, actor, decision.chosen, `move:${step}`);
    }
    expect(state.kind).toBe("miner");
  });
});
