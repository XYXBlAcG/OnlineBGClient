import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { focusPresentation } from "../src/client/focus-presentation";
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
  const html = renderToStaticMarkup(
    <FocusControls onExit={() => {}} onChat={() => {}} unread={3} />,
  );
  expect(html).toContain("退出专注");
  expect(html).toContain("聊天 · 3");
  expect(html).not.toContain("新手引导");
});
