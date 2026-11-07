import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { Lobby } from "../src/client/Lobby";
import { defaultPreferences } from "../src/client/preferences";

afterEach(() => vi.unstubAllGlobals());

function renderLobby(onCreate: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("window", { clearTimeout, setTimeout });
  vi.stubGlobal("HTMLFormElement", class {});
  vi.stubGlobal("localStorage", { getItem: () => null });
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <Lobby
        service="http://localhost:8787"
        initialRoom=""
        busy={false}
        onCreate={onCreate}
        onJoin={() => {}}
        preferences={defaultPreferences}
        onPreferencesChange={() => {}}
      />,
    );
  });
  return tree;
}

function selectGame(tree: ReturnType<typeof create>, name: string) {
  act(() =>
    tree.root
      .findAllByType("button")
      .find((button) => button.props["aria-label"] === `选择${name}`)!
      .props.onClick(),
  );
}

function selectRadio(tree: ReturnType<typeof create>, value: string) {
  act(() =>
    tree.root
      .findAllByType("input")
      .find(
        (input) => input.props.type === "radio" && input.props.value === value,
      )!
      .props.onChange(),
  );
}

function createRoom(tree: ReturnType<typeof create>) {
  act(() =>
    tree.root
      .findAllByType("button")
      .find((button) => button.props.className?.startsWith("primary-button"))!
      .props.onClick(),
  );
}

it("creates storm flight with the selected mode", () => {
  const onCreate = vi.fn();
  const tree = renderLobby(onCreate);
  selectGame(tree, "飞行棋");
  selectRadio(tree, "storm");
  createRoom(tree);
  expect(onCreate).toHaveBeenCalledOnce();
  expect(onCreate.mock.calls[0][0].flight.mode).toBe("storm");
  act(() => tree.unmount());
});

it("creates two-seat siege checkers instead of failing on the default seats", () => {
  const onCreate = vi.fn();
  const tree = renderLobby(onCreate);
  selectGame(tree, "跳棋");
  selectRadio(tree, "siege");
  createRoom(tree);
  expect(onCreate).toHaveBeenCalledOnce();
  const config = onCreate.mock.calls[0][0];
  expect(config.checkers.mode).toBe("siege");
  expect(config.humans + config.ai.length).toBe(2);
  act(() => tree.unmount());
});
