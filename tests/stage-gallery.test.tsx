import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { StageGallery } from "../src/client/dev/StageGallery";

it("renders the stage acceptance page with achievement preview actions", () => {
  const html = renderToStaticMarkup(<StageGallery />);
  expect(html).toContain("舞台与成就验收");
  expect(html).toContain("三连六");
  expect(html).toContain("传说");
  expect(html).toContain("弹窗");
  expect(html).toContain("卡片");
  expect(html).toContain("舞台");
  expect(html).toContain("轰炸");
});
