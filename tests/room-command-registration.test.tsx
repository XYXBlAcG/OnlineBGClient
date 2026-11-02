import React from "react";
import { expect, it } from "vitest";
import { RoomToolbar } from "../src/client/RoomToolbar";
import { Room } from "../src/domain/room";
import { CommandRegistry } from "../src/client/commands";
import { defaultPreferences } from "../src/client/preferences";
it("preserves game shortcut registration while the room menu is closed", async () => {
  const { create, act } = await import("react-test-renderer");
  const { vi } = await import("vitest");
  const room = new Room("keys", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
  });
  const token = room.claim("我");
  room.start(token);
  const registry = new CommandRegistry();
  vi.stubGlobal("document", { querySelector: () => null });
  let tree: ReturnType<typeof create>;
  try {
    act(() => {
      tree = create(
        <RoomToolbar
          snapshot={room.snapshot(token)}
          mobile={false}
          focused={false}
          onFocus={() => {}}
          preferences={defaultPreferences}
          onTheme={() => {}}
          network={false}
          invite={() => {}}
          inviteCopied={false}
          onInvite={() => {}}
          send={() => {}}
          onError={() => {}}
          act={() => {}}
          registry={registry}
          pending={false}
          guideAvailable={false}
          guideShown={false}
          onGuide={() => {}}
        />,
      );
    });
    expect(registry.list().map((command) => command.id)).toContain(
      "uno.actions",
    );
    act(() => tree!.unmount());
    expect(registry.list()).toHaveLength(0);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("游戏菜单在客户端内打开，确认当前合法动作并阻止待响应时重复提交", async () => {
  const { GameCommands } = await import("../src/client/GameCommands");
  const { create, act } = await import("react-test-renderer");
  const { vi } = await import("vitest");
  const room = new Room("menu", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
  });
  const token = room.claim("我");
  room.start(token);
  const snapshot = room.snapshot(token),
    registry = new CommandRegistry(),
    send = vi.fn(),
    reveal = vi.fn();
  const input = {
    key: "F2",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    editing: false,
  };
  let tree!: ReturnType<typeof create>;
  const render = (pending = false) => (
    <GameCommands
      snapshot={snapshot}
      registry={registry}
      bindings={{}}
      act={send}
      pending={pending}
      onReveal={reveal}
    />
  );
  act(() => {
    tree = create(render());
  });
  act(() => {
    expect(registry.dispatch(input, "uno")).toBe(true);
  });
  expect(reveal).toHaveBeenCalledOnce();
  expect(tree.root.findAllByType("button")[0].props["aria-pressed"]).toBe(true);
  act(() => {
    tree.update(render(true));
  });
  expect(registry.dispatch({ ...input, key: "Enter" }, "uno.menu")).toBe(false);
  expect(send).not.toHaveBeenCalled();
  act(() => {
    tree.update(render());
  });
  expect(snapshot.candidates.length).toBeGreaterThan(0);
  act(() => {
    expect(registry.dispatch({ ...input, key: "Enter" }, "uno.menu")).toBe(true);
  });
  expect(send).toHaveBeenCalledWith(snapshot.candidates[0].action);
  act(() => tree.unmount());
  expect(registry.list()).toHaveLength(0);
});
