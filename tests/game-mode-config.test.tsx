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

it("shows pool modes inside gameplay options and creates the selected nine-ball game", async () => {
  const { gameCatalogue } = await import("../src/domain/catalogue");
  const onCreate = vi.fn(),
    tree = renderLobby(onCreate);
  selectGame(tree, gameCatalogue.pool.name);
  expect(gameCatalogue.pool.name).toBe("台球");
  const options = tree.root.findByProps({ "aria-label": "玩法选项" });
  const selector = options.findAll(
    (node) =>
      node.props["aria-label"] === "台球玩法" &&
      typeof node.props.onValueChange === "function",
  )[0];
  expect(selector).toBeDefined();
  act(() => selector.props.onValueChange("nine-ball"));
  createRoom(tree);
  expect(onCreate.mock.calls[0][0].pool.mode).toBe("nine-ball");
  act(() => tree.unmount());
});

it("places the expedition archive in the selected game heading", () => {
  const tree = renderLobby(vi.fn());
  selectGame(tree, "秘塔远征");
  const heading = tree.root.findByProps({ className: "club-setup-heading" });
  expect(
    heading
      .findAllByType("button")
      .some((button) => button.props.children === "远征档案"),
  ).toBe(true);
  act(() => tree.unmount());
});
