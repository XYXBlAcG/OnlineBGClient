import React from "react";
import { create, act } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  focusPresentation,
  useTableFocus,
  focusToggleBinding,
} from "../src/client/focus-presentation";
import { FocusControls } from "../src/client/FocusControls";
it("focus hides application chrome only while a live table is active and retains exit and chat", () => {
  expect(focusPresentation({ focused: true, playing: true, tab: "game" })).toBe(
    true,
  );
  expect(
    focusPresentation({ focused: true, playing: false, tab: "game" }),
  ).toBe(false);
  expect(
    focusPresentation({ focused: true, playing: true, tab: "audit" }),
  ).toBe(false);
  expect(focusToggleBinding).toBe("F");
  const html = renderToStaticMarkup(
    <FocusControls onExit={() => {}} onChat={() => {}} unread={3} />,
  );
  expect(html).toContain("退出沉浸");
  expect(html).toContain("Esc");
  expect(html).toContain("聊天 · 3");
  expect(html).not.toContain("新手引导");
});

it("keeps a manual immersive exit for the current round and re-enters on the next one", () => {
  let api!: ReturnType<typeof useTableFocus>;
  function Round({ id, automatic }: { id: string | null; automatic: boolean }) {
    api = useTableFocus(id, automatic);
    return null;
  }
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<Round id={null} automatic />);
  });
  expect(api[0]).toBe(false);
  act(() => tree.update(<Round id="room:one" automatic />));
  expect(api[0]).toBe(true);
  act(() => api[1](false));
  act(() => tree.update(<Round id="room:one" automatic />));
  expect(api[0]).toBe(false);
  act(() => tree.update(<Round id={null} automatic />));
  expect(api[0]).toBe(false);
  act(() => tree.update(<Round id="room:two" automatic />));
  expect(api[0]).toBe(true);
  act(() => tree.unmount());
});
