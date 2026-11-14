// @vitest-environment jsdom
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { defaultPreferences } from "../src/client/preferences";
import { ChatComposer } from "../src/client/social/ChatComposer";
import { Room } from "../src/domain/room";

const renderComposer = async () => {
  const room = new Room("chat-composer", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
  });
  const token = room.claim("我");
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <ChatComposer
        snapshot={room.snapshot(token)}
        preferences={defaultPreferences}
        onText={vi.fn()}
      />,
    );
  });
  return renderer!;
};

const input = (renderer: ReactTestRenderer) =>
  renderer.root.findByProps({ "aria-label": "消息" });

const change = async (renderer: ReactTestRenderer, value: string) => {
  await act(async () => {
    input(renderer).props.onChange({
      currentTarget: { value, selectionStart: value.length },
    });
  });
};

const press = async (renderer: ReactTestRenderer, key: string) => {
  const preventDefault = vi.fn();
  await act(async () => {
    input(renderer).props.onKeyDown({ key, preventDefault });
  });
  return preventDefault;
};

it("fills a player mention with arrows and Tab", async () => {
  const renderer = await renderComposer();
  await change(renderer, "@");

  const options = renderer.root.findByProps({ role: "listbox" }).findAllByProps({
    role: "option",
  });
  expect(options.map((option) => option.props.children[0].props.children)).toEqual([
    "@我",
    "@青竹",
  ]);

  await press(renderer, "ArrowDown");
  const tab = await press(renderer, "Tab");
  expect(tab).toHaveBeenCalled();
  expect(input(renderer).props.value).toBe("@青竹 ");
  act(() => renderer.unmount());
});

it("fills a command with Tab", async () => {
  const renderer = await renderComposer();
  await change(renderer, "/r");
  const tab = await press(renderer, "Tab");
  expect(tab).toHaveBeenCalled();
  expect(input(renderer).props.value).toBe("/roll ");
  act(() => renderer.unmount());
});
