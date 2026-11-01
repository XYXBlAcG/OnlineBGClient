import React, { useRef } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import {
  GameSizeProvider,
  useGameScale,
  useGameSizing,
} from "../src/client/game-sizing/GameSizing";

it("主牌桌与回放独立约束比例，关闭回放恢复主牌桌的范围", () => {
  vi.stubGlobal("window", {
    innerWidth: 2200,
    innerHeight: 1200,
    devicePixelRatio: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("screen", { width: 2200, height: 1200 });
  vi.stubGlobal("matchMedia", () => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  function Board({ id }: { id: string }) {
    const surface = useRef<HTMLDivElement>(null);
    const scale = useGameScale(surface, "scmj");
    return <div ref={surface} data-board={id} data-scale={scale} />;
  }
  function Range() {
    return <output data-max={useGameSizing().max} />;
  }
  const profiles = { "2200x1200@1": 1.8 };
  const render = (replay: boolean) => (
    <GameSizeProvider profiles={profiles}>
      <Board id="main" />
      {replay && <Board id="replay" />}
      <Range />
    </GameSizeProvider>
  );
  let tree: ReturnType<typeof create> | undefined;
  try {
    act(() => {
      tree = create(render(false), {
        createNodeMock: (element) => ({
          parentElement:
            element.props["data-board"] === "main"
              ? { clientWidth: 2100, clientHeight: 1100 }
              : { clientWidth: 900, clientHeight: 500 },
        }),
      });
    });
    expect(
      tree!.root.findByProps({ "data-board": "main" }).props["data-scale"],
    ).toBe(1.8);
    act(() => tree!.update(render(true)));
    expect(
      tree!.root.findByProps({ "data-board": "replay" }).props["data-scale"],
    ).toBe(1);
    expect(
      tree!.root.findByProps({ "data-board": "main" }).props["data-scale"],
    ).toBe(1.8);
    expect(tree!.root.findByType("output").props["data-max"]).toBe(1);
    act(() => tree!.update(render(false)));
    expect(tree!.root.findByType("output").props["data-max"]).toBeGreaterThan(
      1.8,
    );
  } finally {
    if (tree) act(() => tree!.unmount());
    vi.unstubAllGlobals();
  }
});
