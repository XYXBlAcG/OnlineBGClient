import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MotionControls } from "../src/client/MotionControls";
it("renders two independent animation switches", () => {
  const html = renderToStaticMarkup(
    <MotionControls
      preferences={{ motion: true, enhancedGameMotion: false }}
      onChange={() => {}}
    />,
  );
  expect((html.match(/role="switch"/g) || []).length).toBe(2);
  expect(html).toContain("界面动画");
  expect(html).toContain("增强游戏动画");
  expect(html).toContain('data-state="checked"');
});
