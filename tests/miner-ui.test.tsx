import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { create, act } from "react-test-renderer";
import { GameEngine } from "../src/domain/engine";
import type { MinerGameState } from "../src/domain/miner/types";
import { GameCommandProvider } from "../src/client/use-game-commands";
import { CommandRegistry } from "../src/client/commands";
import { MinerLive } from "../src/client/miner/MinerLive";
import { mapChoices } from "../src/domain/miner/map";
import { minerSceneFor } from "../src/domain/miner/content";
import { Room } from "../src/domain/room";
import { MinerTable } from "../src/client/miner/MinerTable";
import { toGameSnapshot } from "../src/client/game-snapshot";

it("renders the shared route map and HUD", () => {
  const room = new Room("miner-ui", {
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
  const snapshot = toGameSnapshot(room.snapshot(host));
  const html = renderToStaticMarkup(
    <MinerTable
      snapshot={snapshot}
      act={() => {}}
      pending={false}
      replay={false}
    />,
  );
  expect(html).toContain("黄金矿脉");
  expect(html).toContain("团队目标");
  expect(html).toContain("选择角色");
  expect(html).toContain("矿工");
  expect(html).toContain("疾速下钩");
  expect(html).not.toContain("8 秒内摆钩与回收速度提升");
  expect(html).toContain("档案");
  expect(html).toContain("团队目标");
});

it("renders the route map without stale titles or internal node ids", () => {
  const room = new Room("miner-map-ui", {
    kind: "miner",
    humans: 2,
    ai: [],
    team: false,
    training: false,
    miner: { mode: "friendly", levels: 6, quota: 6900 },
  });
  const host = room.claim("甲");
  const guest = room.claim("乙");
  room.setReady(guest, true);
  room.start(host);
  for (const [token, character] of [
    [host, "miner"],
    [guest, "merchant"],
  ] as const) {
    const snapshot = room.snapshot(token);
    room.act(token, `character-${character}`, snapshot.version, {
      type: "miner-action",
      move: { type: "character", character },
    });
  }
  for (let index = 0; index < 5; index += 1)
    room.resolveIfDue(Date.now() + 60_000);
  expect(room.state?.kind).toBe("miner");
  if (room.state?.kind === "miner") expect(room.state.view.phase).toBe("map");
  const html = renderToStaticMarkup(
    <MinerTable
      snapshot={toGameSnapshot(room.snapshot(host))}
      act={() => {}}
      pending={false}
      replay={false}
    />,
  );
  expect(html).toContain("黄金矿脉");
  expect(html).not.toContain("秘塔矿脉");
  expect(html).not.toMatch(/>library</);
  expect(html).not.toMatch(/>shop</);
  expect(html).not.toContain("矿灯亮起");
  expect(html).toMatch(
    /<button[^>]*data-available="true"[^>]*aria-pressed="false"/,
  );
  expect(html).not.toContain("mining-choice");
});

it("renders named rigs and the loaded ore in the live mine, then stable offers in the shop", () => {
  const room = new Room("miner-scenes", {
    kind: "miner",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const host = room.claim("甲队长"),
    guest = room.claim("乙同伴");
  room.setReady(guest, true);
  room.start(host);
  for (const token of [host, guest])
    room.act(token, "character", room.version, {
      type: "miner-action",
      move: { type: "character", character: "miner" },
    });
  room.resolveIfDue();
  const map = room.state;
  if (map?.kind !== "miner") throw new Error("expected route");
  const nodeId = mapChoices(map.view).find(
    (node) => minerSceneFor(node.kind) === "mine",
  )!.id;
  for (const token of [host, guest])
    room.act(token, "vote", room.version, {
      type: "miner-action",
      move: { type: "vote", nodeId },
    });
  room.resolveIfDue();
  if (room.state?.kind !== "miner") throw new Error("expected mine");
  const { view } = room.state;
  const ore = view.node!.objects[0];
  ore.hookedBy = 0;
  Object.assign(view.players[0].hook, {
    phase: "reel",
    targetId: ore.id,
    length: 0.4,
  });
  const render = () =>
    renderToStaticMarkup(
      <MinerTable
        snapshot={toGameSnapshot(room.snapshot(host))}
        act={() => {}}
        pending={false}
        replay={false}
      />,
    );
  expect(render()).toMatch(
    /data-rig="0"[^>]*><line[^>]*><\/line><g[^>]*><g[^>]*><image/,
  );
  expect(render()).toContain("乙同伴");
  view.node!.timeLeftMs = 1;
  room.resolveIfDue(Date.now() + 200);
  const shop = render();
  expect(shop).toContain('aria-label="补给坑道与实时矿钩"');
  expect(shop).toContain('class="miner-crate"');
  expect(shop).toContain("data-offer=");
  expect(shop).not.toContain('class="miner-stock-item"');
  expect(shop).not.toContain("mining-choice");
});

it("uses the configured key for the same cast as the visible button and blocks repeated or editing input", () => {
  const registry = new CommandRegistry();
  const engine = new GameEngine();
  const initial = engine.create(
    "miner",
    2,
    "shortcut",
    false,
  ) as MinerGameState;
  initial.view.phase = "map";
  const node = mapChoices(initial.view).find(
    (choice) => minerSceneFor(choice.kind) === "mine",
  )!;
  initial.view.votes = { 0: node.id, 1: node.id };
  const { view } = engine.resolve(initial, "shortcut-entry") as MinerGameState;
  const send = vi.fn();
  const key = {
    key: "k",
    editing: false,
    repeat: false,
    isComposing: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
  };
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  let tree!: ReturnType<typeof create>;
  try {
    act(() => {
      tree = create(
        <GameCommandProvider
          registry={registry}
          bindings={{ "miner.drop": "K" }}
        >
          <MinerLive
            view={view}
            actor={0}
            names={["甲", "乙"]}
            send={send}
            pending={false}
            frozen={false}
          />
        </GameCommandProvider>,
      );
    });
    expect(registry.dispatch({ ...key, key: " " }, "miner")).toBe(false);
    expect(registry.dispatch({ ...key, repeat: true }, "miner")).toBe(false);
    expect(registry.dispatch({ ...key, editing: true }, "miner")).toBe(false);
    expect(registry.dispatch(key, "miner")).toBe(true);
    tree.root.findByProps({ className: "miner-drop" }).props.onClick();
    expect(send.mock.calls).toEqual([
      [{ type: "drop", angle: view.players[0].hook.angle }],
    ]);
    expect(tree.root.findByType("kbd").children).toContain("K");
  } finally {
    if (tree) act(() => tree.unmount());
    vi.unstubAllGlobals();
  }
});
