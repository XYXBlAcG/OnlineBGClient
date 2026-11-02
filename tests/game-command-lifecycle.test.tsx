import React from "react";
import { create, act } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import {
  GameCommandProvider,
  useGameCommands,
} from "../src/client/use-game-commands";
import { CommandRegistry } from "../src/client/commands";
it("阶段切换替换命令集合，数字和 Enter 不同时控制地图与战斗，保留自定义绑定", () => {
  const registry = new CommandRegistry(),
    run = vi.fn();
  function Phase({ phase }: { phase: string }) {
    useGameCommands([
      {
        id: `expedition.${phase}`,
        title: phase,
        scope: "expedition",
        binding: "Enter",
        enabled: () => true,
        run: () => run(phase),
      },
    ]);
    return null;
  }
  const bindings = { "expedition.map": "V" };
  const view = (phase: string) => (
    <GameCommandProvider registry={registry} bindings={bindings}>
      <Phase phase={phase} />
    </GameCommandProvider>
  );
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(view("battle"));
  });
  act(() => tree.update(view("map")));
  expect(registry.list().map((c) => [c.id, c.binding])).toEqual([
    ["expedition.map", "V"],
  ]);
  const input = {
    key: "Enter",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    editing: false,
  };
  expect(registry.dispatch(input, "expedition")).toBe(false);
  expect(registry.dispatch({ ...input, key: "v" }, "expedition")).toBe(true);
  expect(run).toHaveBeenCalledWith("map");
  act(() => tree.unmount());
  expect(registry.list()).toEqual([]);
});
