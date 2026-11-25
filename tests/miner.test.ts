import { MinerStrategy } from "../src/domain/miner/strategy";
import {
  aimAt,
  MINE_DEPTH,
  PIVOT_Y,
  shopDrop,
  firstHookContact,
  hookReach,
  hookTravelFactor,
} from "../src/domain/miner/geometry";
import { describe, expect, it, vi } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Room } from "../src/domain/room";
import { gameCatalogue } from "../src/domain/catalogue";
import { generateMap } from "../src/domain/expedition/map";
import {
  minerCharacters,
  minerItems,
  minerMechanics,
  minerObjects,
  minerPerks,
  minerSceneFor,
} from "../src/domain/miner/content";
import { generateMinerMap, mapChoices } from "../src/domain/miner/map";
import type { GameState } from "../src/domain/types";
import type { MinerGameState } from "../src/domain/miner/types";

function enterMine(
  engine: GameEngine,
  players = 2,
  seed = "miner:test",
  characterId = "miner",
) {
  let state = engine.create("miner", players, seed, false);
  for (const actor of Array.from({ length: players }, (_, i) => i)) {
    const character = engine
      .candidates(engine.project(state, actor), actor)
      .find((item) => {
        const action = item.action;
        return (
          action.type === "miner-action" &&
          action.move.type === "character" &&
          action.move.character === characterId
        );
      });
    if (!character) throw new Error("没有角色选择");
    state = engine.apply(state, actor, character.action, `character:${actor}`);
  }
  state = engine.resolve(state, "characters");
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

describe("miner capabilities", () => {
  it("declares AI and mobile support", () => {
    expect(gameCatalogue.miner.ai).toBe(true);
    expect(gameCatalogue.miner.mobile).toBe(true);
  });
});

describe("miner modes", () => {
  it("splits 4-player team mode into 2v2", () => {
    const engine = new GameEngine();
    const state = engine.create("miner", 4, "miner:team", true);
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.teams).toEqual([0, 1, 0, 1]);
    expect(gameCatalogue.miner.team).toBe(true);
  });

  it("starts endless with three lives and no six-level cap", () => {
    const engine = new GameEngine();
    const state = engine.create("miner", 2, "miner:endless", false, {
      miner: { mode: "endless", levels: 6 },
    });
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.mode).toBe("endless");
    expect(state.view.lives).toBe(3);
    expect(state.view.levelTarget).toBeGreaterThan(0);
  });

  it("accepts friendly and party mode options", () => {
    const engine = new GameEngine();
    const friendly = engine.create("miner", 2, "miner:friendly", false, {
      miner: { mode: "friendly", levels: 6 },
    });
    const party = engine.create("miner", 2, "miner:party", false, {
      miner: { mode: "party", levels: 6 },
    });
    if (friendly.kind !== "miner" || party.kind !== "miner")
      throw new Error("wrong game");
    expect(friendly.view.mode).toBe("friendly");
    expect(party.view.mode).toBe("party");
  });
});

describe("miner content", () => {
  it("ships the Gold Miner object and item set", () => {
    expect(Object.keys(minerObjects)).toHaveLength(12);
    expect(Object.keys(minerItems)).toHaveLength(7);
    expect(Object.keys(minerCharacters)).toHaveLength(4);
    expect(Object.keys(minerMechanics)).toHaveLength(24);
    expect(Object.keys(minerPerks)).toHaveLength(10);
    expect(minerSceneFor("battle")).toBe("mine");
    expect(minerSceneFor("shop")).toBe("shop");
    expect(minerSceneFor("camp")).toBe("camp");
    expect(minerSceneFor("event")).toBe("event");
  });
});

describe("shared expedition map", () => {
  it("uses the exact expedition topology", () => {
    expect(generateMinerMap("same-seed")).toEqual(
      generateMap("same-seed", 2, 0),
    );
    const nodes = generateMinerMap("same-seed").flat();
    expect(nodes.length).toBeGreaterThan(30);
    expect(
      nodes.some((node) =>
        node.next.some((id) => {
          const target = nodes.find((candidate) => candidate.id === id);
          return target && target.floor > node.floor + 1;
        }),
      ),
    ).toBe(true);
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
    const actor = 0;
    const before = state.view.players[actor]!.score;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (state.kind !== "miner") throw new Error("wrong game");
      const node = state.view.node!;
      const object = node.objects
        .filter(
          (item) =>
            !item.removed &&
            !item.frozen &&
            !item.phantom &&
            item.value > 0 &&
            (node.waterLevel === 0 || item.y < node.waterLevel),
        )
        .sort((a, b) => b.value - a.value)[0];
      if (!object) break;
      state = engine.apply(
        state,
        actor,
        {
          type: "miner-action",
          move: {
            type: "drop",
            angle: aimAt(object, state.view.players[actor]!.hook.pivotX),
          },
        },
        `drop:${attempt}`,
      );
      if (state.kind !== "miner") throw new Error("wrong game");
      for (let tick = 0; tick < 120; tick++) {
        if (
          state.kind !== "miner" ||
          state.view.phase !== "live" ||
          state.view.players[actor]!.score > before
        )
          break;
        state = engine.resolve(state, `tick:${attempt}:${tick}`);
      }
      if (state.kind === "miner" && state.view.players[actor]!.score > before)
        break;
    }
    expect(state.kind).toBe("miner");
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.players[actor]!.score).toBeGreaterThan(before);
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
    const characterRound = room.snapshot(host);
    room.act(
      host,
      "host-character",
      characterRound.version,
      characterRound.candidates[0]!.action,
    );
    const characterSecond = room.snapshot(guest);
    room.act(
      guest,
      "guest-character",
      characterSecond.version,
      characterSecond.candidates[0]!.action,
    );
    expect(room.resolveIfDue(Date.now() + 10_000)).toBe(true);
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
      move: {
        type: "drop",
        angle: aimAt(object, live.state.view.players[actor].hook.pivotX),
      },
    });
    expect(room.snapshot(host).state?.kind).toBe("miner");
    for (let tick = 0; tick < 20; tick++)
      room.resolveIfDue(Date.now() + 10_000 + tick * 1000);
    const ticked = room.snapshot(host).state;
    if (ticked?.kind !== "miner") throw new Error("wrong game");
    expect(ticked.view.phase).toBe("live");
    expect(ticked.view.node!.timeLeftMs).toBeLessThan(60_000);
  });

  it("charges and activates character Specials", () => {
    const engine = new GameEngine();
    let state: GameState = enterMine(engine, 2, "miner:special", "strongman");
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.players[0]!.character).toBe("strongman");
    state.view.players[0]!.specialCharge = 4;
    state = engine.apply(
      state,
      0,
      { type: "miner-action", move: { type: "special" } },
      "special",
    );
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.players[0]!.specialTicks).toBeGreaterThan(0);
  });

  it("runs a six-level Quick Match intermission", () => {
    const engine = new GameEngine();
    let state: GameState = enterMine(engine, 2, "miner:match");
    if (state.kind !== "miner") throw new Error("wrong game");
    state.view.node!.timeLeftMs = 0;
    state = engine.resolve(state, "finish-level");
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.phase).toBe("intermission");
    expect(state.view.levelsPlayed).toBe(1);
    expect(state.view.matchLevels).toBe(6);
    expect(state.view.perkOffers).toHaveLength(3);
    state.view.players[0]!.coins = 1000;
    const perk = engine.candidates(engine.project(state, 0), 0).find((item) => {
      const action = item.action;
      return action.type === "miner-action" && action.move.type === "buy-perk";
    });
    state = engine.apply(state, 0, perk!.action, "buy-perk");
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.perks).toHaveLength(1);
    expect(state.view.perkBought).toBe(true);
    for (const actor of [0, 1]) {
      const ready = engine
        .candidates(engine.project(state, actor), actor)
        .find((item) => {
          const action = item.action;
          return action.type === "miner-action" && action.move.type === "ready";
        });
      state = engine.apply(state, actor, ready!.action, `ready:${actor}`);
    }
    state = engine.resolve(state, "finish-intermission");
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.phase).toBe("map");
  });

  it("supports six-player character selection", () => {
    const engine = new GameEngine();
    const state = engine.create("miner", 6, "miner:six", false);
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.players).toHaveLength(6);
    expect(engine.actors(state)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("creates level mechanics and keeps ticking", () => {
    const engine = new GameEngine();
    let state: GameState = enterMine(engine, 2, "miner:mechanics");
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(Array.isArray(state.view.node!.mechanics)).toBe(true);
    for (let tick = 0; tick < 10; tick++)
      state = engine.resolve(state, `tick:${tick}`);
    expect(state.kind).toBe("miner");
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
    expect([
      "map",
      "intermission",
      "won",
      "lost",
      "shop",
      "camp",
      "event",
    ]).toContain(state.view.phase);
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

function enterShop(engine: GameEngine, players = 2): GameState {
  let state = engine.create("miner", players, "miner:shop-test", false);
  for (const actor of Array.from({ length: players }, (_, index) => index))
    state = engine.apply(
      state,
      actor,
      {
        type: "miner-action",
        move: { type: "character", character: "miner" },
      },
      `character:${actor}`,
    );
  state = engine.resolve(state, "characters");
  const view = engine.project(state, 0);
  if (view.kind !== "miner") throw new Error("wrong game");
  const shop = mapChoices(view.view).find(
    (node) => minerSceneFor(node.kind) === "shop",
  );
  for (const actor of Array.from({ length: players }, (_, index) => index)) {
    const projected = engine.project(state, actor);
    if (projected.kind !== "miner") throw new Error("wrong game");
    const vote = engine.candidates(projected, actor).find((item) => {
      const action = item.action;
      return (
        action.type === "miner-action" &&
        action.move.type === "vote" &&
        action.move.nodeId === shop?.id
      );
    });
    if (!vote) throw new Error("no shop vote");
    state = engine.apply(state, actor, vote.action, `vote:${actor}`);
  }
  state = engine.resolve(state, "enter-shop");
  if (state.kind !== "miner") throw new Error("wrong game");
  if (state.view.phase !== "shop") throw new Error("not in shop");
  return state;
}

describe("miner shop offers", () => {
  it("stock is random, prices swing, and refreshes are partial", () => {
    const engine = new GameEngine();
    let state: GameState = enterShop(engine);
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.shopOffers).toHaveLength(4);
    expect(
      state.view.shopOffers.some(
        (offer) => offer.price !== minerItems[offer.itemId].cost,
      ),
    ).toBe(true);
    state.view.players[0]!.coins = 5000;
    const buy = engine.candidates(engine.project(state, 0), 0).find((item) => {
      const action = item.action;
      return (
        action.type === "miner-action" &&
        action.move.type === "drop" &&
        !!action.move.offer
      );
    });
    if (!buy) throw new Error("no buy candidate");
    state = engine.apply(state, 0, buy.action, "buy");
    if (state.kind !== "miner") throw new Error("wrong game");
    for (let step = 0; step < 20 && state.view.shopOffers.length === 4; step++)
      state = engine.resolve(state, `offer:${step}`) as MinerGameState;
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.shopOffers).toHaveLength(3);
    while (state.view.players[0].hook.phase !== "swing")
      state = engine.resolve(state, "return") as MinerGameState;
    if (state.kind !== "miner") throw new Error("wrong game");
    const refresh = engine
      .candidates(engine.project(state, 0), 0)
      .find((item) => {
        const action = item.action;
        return (
          action.type === "miner-action" && action.move.type === "refresh-shop"
        );
      });
    if (!refresh) throw new Error("no refresh candidate");
    state = engine.apply(state, 0, refresh.action, "refresh");
    if (state.kind !== "miner") throw new Error("wrong game");
    expect(state.view.shopRefreshes).toBe(1);
    expect(state.view.shopOffers).toHaveLength(3);
  });
});

it("keeps elapsed mine time on a fixed clock across room polls and player input", () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(100_000);
    const room = new Room("miner-clock", {
      kind: "miner",
      humans: 2,
      ai: [],
      team: false,
      training: false,
    });
    const a = room.claim("甲"),
      b = room.claim("乙");
    room.setReady(b, true);
    room.start(a);
    for (const token of [a, b])
      room.act(token, "character", room.version, {
        type: "miner-action",
        move: { type: "character", character: "miner" },
      });
    expect(room.resolveIfDue()).toBe(true);
    const map = room.state as MinerGameState;
    const nodeId = mapChoices(map.view).find(
      (node) => minerSceneFor(node.kind) === "mine",
    )!.id;
    for (const token of [a, b])
      room.act(token, "vote", room.version, {
        type: "miner-action",
        move: { type: "vote", nodeId },
      });
    expect(room.resolveIfDue()).toBe(true);
    const view = (room.state as MinerGameState).view;
    const start = view.node!.timeLeftMs;
    view.node!.mechanics = [];
    for (let poll = 1; poll <= 100; poll++) {
      vi.setSystemTime(100_000 + poll * 100);
      if (poll === 1) {
        room.act(a, "drop", room.version, {
          type: "miner-action",
          move: { type: "drop", angle: view.players[0].hook.angle },
        });
      }
      room.resolveIfDue();
    }
    expect(start - (room.state as MinerGameState).view.node!.timeLeftMs).toBe(
      9960,
    );
  } finally {
    vi.useRealTimers();
  }
});

it("rejects a stale shop cast after refreshing its slot without buying the replacement", () => {
  const engine = new GameEngine();
  const state = enterShop(engine) as MinerGameState;
  state.view.players[0].coins = 1000;
  const refresh = engine.apply(
    state,
    0,
    {
      type: "miner-action",
      move: { type: "refresh-shop" },
    },
    "refresh",
  ) as MinerGameState;
  const stale = state.view.shopOffers.find(
    ({ id }) => !refresh.view.shopOffers.some((offer) => offer.id === id),
  )!;
  const crate = state.view.node!.objects.find(({ id }) => id === stale.id)!;
  const move = shopDrop(
    state.view,
    0,
    aimAt(crate, state.view.players[0].hook.pivotX),
  );
  expect(move.offer).toBe(stale.id);
  expect(() =>
    engine.apply(refresh, 0, { type: "miner-action", move }, "stale"),
  ).toThrow("商品已变化");
  expect(refresh.view.players[0].coins).toBe(1000);
});

it("hits a rock edge before the centre reaches the swept segment", () => {
  const engine = new GameEngine();
  const state = enterMine(engine);
  const node = state.view.node!;
  node.mechanics = [];
  node.waterLevel = 0;
  const hook = state.view.players[0].hook;
  node.objects = [
    {
      ...node.objects[0],
      x: hook.pivotX,
      y: (PIVOT_Y + 0.195) / MINE_DEPTH,
      radius: 0.04,
      frozen: false,
    },
  ];
  const dropped = engine.apply(
    state,
    0,
    { type: "miner-action", move: { type: "drop", angle: 0 } },
    "drop",
  );
  const next = engine.resolve(dropped, "step") as MinerGameState;
  expect(next.view.players[0].hook.targetId).toBe(node.objects[0].id);
});

it("detaches another player's destroyed load before scoring or leaving the mine", () => {
  const engine = new GameEngine();
  const state = enterMine(engine);
  const node = state.view.node!;
  node.mechanics = [];
  const [base] = node.objects;
  node.objects = [
    {
      ...base,
      id: "blast",
      kind: "tnt",
      x: 0.5,
      y: 0.5,
      hookedBy: 0,
      value: 0,
    },
    {
      ...base,
      id: "gold",
      kind: "goldLarge",
      x: 0.53,
      y: 0.5,
      hookedBy: 1,
      value: 500,
    },
    { ...base, id: "elsewhere", x: 0.14, y: 0.9, hookedBy: null },
  ];
  Object.assign(state.view.players[0].hook, {
    phase: "reel",
    length: 0.001,
    targetId: "blast",
  });
  Object.assign(state.view.players[1].hook, {
    phase: "reel",
    length: 0.001,
    targetId: "gold",
  });
  const next = engine.resolve(state, "blast") as MinerGameState;
  expect(next.view.players[1].hook.targetId).toBeNull();
  expect(next.view.players[1].score).toBe(0);
  expect(next.view.phase).toBe("live");
});

it("restores a lobby when a saved miner round uses the previous rules", () => {
  const room = new Room("old-miner", {
    kind: "miner",
    humans: 1,
    ai: [{ difficulty: "easy" }],
    team: false,
    training: false,
  });
  const token = room.claim("甲");
  room.start(token);
  const archive = room.export();
  archive.replay!.rulesVersion = "3";
  const restored = Room.restore(archive);
  expect(restored.state).toBeNull();
  expect(restored.claim("甲", token)).toBe(token);
  expect(restored.export().records.at(-1)).toEqual(archive.replay);
  restored.start(token);
  expect(restored.state?.kind).toBe("miner");
});

it("awards a contested rock to the hook with the earliest contact in the step", () => {
  const engine = new GameEngine();
  const state = enterMine(engine);
  const node = state.view.node!;
  node.mechanics = [];
  node.waterLevel = 0;
  const ore = {
    ...node.objects[0],
    x: 0.5,
    y: 0.52,
    radius: 0.04,
    frozen: false,
  };
  node.objects = [ore];
  state.view.players.forEach(({ hook }, seat) => {
    hook.phase = "shoot";
    hook.angle = aimAt(ore, hook.pivotX);
    hook.length =
      Math.hypot(ore.x - hook.pivotX, (ore.y - 0.1) * MINE_DEPTH) -
      ore.radius -
      (seat === 0 ? 0.12 : 0.02);
  });
  const next = engine.resolve(state, "contested") as MinerGameState;
  expect(next.view.node!.objects[0].hookedBy).toBe(1);
  expect(next.view.players[0].hook.targetId).toBeNull();
  expect(next.view.players[1].hook.targetId).toBe(ore.id);
});

it("freezes a solo mine and resumes without spending the paused time", () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(100_000);
    const room = new Room("miner-solo", {
      kind: "miner",
      humans: 1,
      ai: [{ difficulty: "easy" }],
      team: false,
      training: false,
    });
    const token = room.claim("甲");
    room.start(token);
    room.state = enterMine(room.engine);
    const deadline = Date.now();
    const before = structuredClone(room.state);
    room.setMinerPaused(token, true);
    expect(room.snapshot(token).minerPaused).toBe(true);
    expect(room.aiRequest()).toBeNull();
    vi.setSystemTime(deadline + 120_000);
    expect(room.resolveIfDue()).toBe(false);
    expect(room.state).toEqual(before);
    room.setMinerPaused(token, false);
    vi.advanceTimersByTime(119);
    expect(room.resolveIfDue()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(room.resolveIfDue()).toBe(true);
    expect((room.state as MinerGameState).view.tick).toBe(before.view.tick + 1);
  } finally {
    vi.useRealTimers();
  }
});

it("rejects a manual pause when multiple human seats are configured", () => {
  const room = new Room("miner-coop", {
    kind: "miner",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  room.start(a);
  room.state = enterMine(room.engine);
  expect(() => room.setMinerPaused(a, true)).toThrow("仅单人");
  expect(room.paused).toBe(false);
});

it("charges only the first hook to reach a shared shop crate and returns the purchased load", () => {
  const engine = new GameEngine();
  let state = enterShop(engine) as MinerGameState;
  state.view.players.forEach((p) => {
    p.coins = 1000;
  });
  const offer = state.view.shopOffers[0];
  const crate = state.view.node!.objects.find(({ id }) => id === offer.id)!;
  for (const actor of [0, 1])
    state = engine.apply(
      state,
      actor,
      {
        type: "miner-action",
        move: shopDrop(
          state.view,
          actor,
          aimAt(crate, state.view.players[actor].hook.pivotX),
        ),
      },
      `shop-drop:${actor}`,
    ) as MinerGameState;
  for (
    let step = 0;
    step < 20 && state.view.shopOffers.some(({ id }) => id === offer.id);
    step++
  )
    state = engine.resolve(state, `shop:${step}`) as MinerGameState;
  expect(state.view.shopOffers.some(({ id }) => id === offer.id)).toBe(false);
  expect(
    state.view.players.reduce(
      (total, p) => total + (p.items[offer.itemId] ?? 0),
      0,
    ),
  ).toBe(1);
  expect(state.view.players.some((p) => p.hook.targetId === crate.id)).toBe(
    true,
  );
  expect(state.view.players.reduce((total, p) => total + p.coins, 0)).toBe(
    2000 - offer.price,
  );
});

it("returns an empty shop hook if a refresh replaces the quoted crate after casting", () => {
  const engine = new GameEngine();
  const state = enterShop(engine) as MinerGameState;
  state.view.players[0].coins = 1000;
  const move = engine
    .candidates(state, 0)
    .map(({ action }) => action)
    .find(
      (action) =>
        action.type === "miner-action" &&
        action.move.type === "drop" &&
        !!action.move.offer,
    )!;
  if (move.type !== "miner-action" || move.move.type !== "drop")
    throw new Error("expected a crate cast");
  const id = move.move.offer;
  const casting = engine.apply(state, 0, move, "launch") as MinerGameState;
  const replaced = Array.from(
    { length: 24 },
    (_, n) =>
      engine.apply(
        casting,
        1,
        { type: "miner-action", move: { type: "refresh-shop" } },
        `refresh-${n}`,
      ) as MinerGameState,
  ).find(
    (candidate) => !candidate.view.shopOffers.some((offer) => offer.id === id),
  )!;
  const expected = replaced.view.shopOffers.map(({ id }) => id);
  let next = replaced;
  for (
    let step = 0;
    step < 30 && next.view.players[0].hook.phase !== "swing";
    step++
  )
    next = engine.resolve(next, `refresh-cast-step:${step}`) as MinerGameState;
  expect(next.view.players[0].hook.phase).toBe("swing");
  expect(next.view.players[0].hook.targetId).toBeNull();
  expect(next.view.players[0].coins).toBe(1000);
  expect(next.view.shopOffers.map(({ id }) => id)).toEqual(expected);
});

it("waits for a busy shop bot and gives the other AI a legal shop decision", () => {
  vi.useFakeTimers();
  try {
    const room = new Room("miner-shop-ai", {
      kind: "miner",
      humans: 1,
      ai: [{ difficulty: "normal" }, { difficulty: "normal" }],
      team: false,
      training: false,
    });
    const token = room.claim("甲");
    room.start(token);
    const state = enterShop(room.engine, 3) as MinerGameState;
    room.state = state;
    const seller = state.view.players[1];
    seller.coins = 0;
    Object.assign(seller.hook, { phase: "reel", length: 0.2 });
    expect(room.engine.candidates(state, 1)).toEqual([]);
    expect(room.aiRequest()).toBeNull();
    vi.advanceTimersByTime(1500);
    const request = room.aiRequest();
    expect(request?.actor).toBe(2);
    const choice = new MinerStrategy().decide(
      request!.observation,
      2,
      "normal",
      "shop-ai",
    );
    expect(choice.chosen).toEqual({
      type: "miner-action",
      move: { type: "ready" },
    });
    expect(room.acceptDecision(choice, request!.version)).toBe(true);
    expect(room.paused).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});

it("reveals a small gold nugget when a rock is collected from a crystal vein", () => {
  const engine = new GameEngine(),
    state = enterMine(engine);
  const node = state.view.node!;
  node.mechanics = ["crystalVein"];
  const rock = {
    ...node.objects[0],
    id: "vein",
    kind: "rockLarge" as const,
    x: 0.42,
    y: 0.54,
    hookedBy: 0,
    value: 20,
    phantom: false,
  };
  node.objects = [rock];
  Object.assign(state.view.players[0].hook, {
    phase: "reel",
    targetId: rock.id,
    length: 0.001,
  });
  const next = engine.resolve(state, "vein") as MinerGameState;
  expect(next.view.phase).toBe("live");
  expect(
    next.view.node!.objects.filter(({ removed }) => !removed),
  ).toMatchObject([
    { kind: "goldSmall", x: rock.x, y: rock.y, hookedBy: null },
  ]);
});

it("rewards a different teammate's consecutive catch within the relay window", () => {
  const engine = new GameEngine(),
    state = enterMine(engine);
  const node = state.view.node!;
  node.mechanics = ["teamRelay"];
  const gold = {
    ...node.objects[0],
    kind: "goldSmall" as const,
    value: 100,
    frozen: false,
    phantom: false,
  };
  node.objects = [0, 1, 2].map((seat) => ({
    ...gold,
    id: `relay-${seat}`,
    hookedBy: seat < 2 ? seat : null,
  }));
  Object.assign(state.view.players[0].hook, {
    phase: "reel",
    targetId: "relay-0",
    length: 0.001,
  });
  Object.assign(state.view.players[1].hook, {
    phase: "reel",
    targetId: "relay-1",
    length: 0.15,
  });
  let next = engine.resolve(state, "relay-first") as MinerGameState;
  for (let step = 0; step < 5; step++)
    next = engine.resolve(next, `relay-${step}`) as MinerGameState;
  expect(next.view.players.map(({ score }) => score)).toEqual([100, 125]);
  expect(next.view.teamScore).toBe(225);
  expect(next.view.lastAction?.kind).toBe("relay");
});

it("钩子能抓水下矿物，水下收放钩变慢", () => {
  const engine = new GameEngine();
  const state = enterMine(engine);
  const node = state.view.node!;
  const object = {
    ...node.objects[0],
    x: 0.5,
    y: 0.8,
    removed: false,
    hookedBy: null,
  };
  node.objects = [object];
  node.waterLevel = 0.4;
  const hook = { angle: 0, pivotX: 0.5, length: 0.5 };
  expect(firstHookContact(hook, 0, hookReach(hook), node)?.object).toBe(object);
  expect(hookTravelFactor(hook, node)).toBeLessThan(1);
  expect(hookTravelFactor({ ...hook, length: 0.1 }, node)).toBe(1);
});

it("罚时石与充能晶体在收回时影响当前关卡", () => {
  const engine = new GameEngine();
  for (const kind of ["timeTrap", "chargeCrystal"] as const) {
    const state = enterMine(engine);
    const node = state.view.node!;
    node.timeLeftMs = 30000;
    const ore = node.objects[0];
    Object.assign(ore, {
      kind,
      value: 0,
      hookedBy: 0,
      frozen: false,
      removed: false,
      phantom: false,
    });
    Object.assign(state.view.players[0].hook, {
      targetId: ore.id,
      phase: "reel",
      length: 0.001,
    });
    const next = engine.resolve(state, "special");
    if (next.kind !== "miner") throw Error("矿洞类型错误");
    if (kind === "timeTrap")
      expect(next.view.node!.timeLeftMs).toBeLessThan(27000);
    else expect(next.view.players[0].specialCharge).toBe(2);
  }
});

it("矿工 AI 只在钩子当前摆动方向附近挑选落点", () => {
  const engine = new GameEngine();
  const state = enterMine(engine);
  state.view.players[0].hook.angle = 24;
  const strategy = new MinerStrategy();
  for (const [difficulty, spread, count] of [
    ["easy", 0, 1],
    ["normal", 5, 3],
    ["hard", 14, 5],
  ] as const) {
    const angles = strategy
      .candidates({
        observation: state,
        actor: 0,
        difficulty,
        seed: "swing",
        audit: false,
      })
      .flatMap(({ action }) =>
        action.type === "miner-action" && action.move.type === "drop"
          ? [action.move.angle]
          : [],
      );
    expect(angles).toHaveLength(count);
    expect(angles.every((angle) => Math.abs(angle - 24) <= spread)).toBe(true);
  }
});
