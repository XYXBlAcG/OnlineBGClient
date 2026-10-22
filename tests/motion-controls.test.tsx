import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MotionControls } from "../src/client/MotionControls";
it("renders exactly two independent Boolean checkboxes with baseline wording", () => {
  const html = renderToStaticMarkup(
    <MotionControls
      preferences={{ motion: true, enhancedGameMotion: false }}
      onChange={() => {}}
    />,
  );
  expect((html.match(/type="checkbox"/g) || []).length).toBe(2);
  expect((html.match(/checked=""/g) || []).length).toBe(1);
  expect(html).toContain("未勾选：当前版；勾选：增强版");
});
