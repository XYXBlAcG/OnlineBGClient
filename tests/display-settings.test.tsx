import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { DisplaySettings } from "../src/client/game-sizing/DisplaySettings";
import { gameSizing } from "../src/client/game-sizing/model";
import { defaultPreferences } from "../src/client/preferences";

it("offers interface font, interface scale and table scale in display settings", () => {
  const html = renderToStaticMarkup(
    <DisplaySettings
      preferences={defaultPreferences}
      info={gameSizing({ width: 1400, height: 900, kind: "uno" })}
      onChange={() => {}}
    />,
  );
  expect(html).toContain("界面显示");
  expect(html).toContain("界面字体大小");
  expect(html).toContain("界面元素大小");
  expect(html).toContain("牌桌元素大小");
  expect(html).toContain("标准");
  expect(html).toContain("舒适");
  expect(html).toContain("大");
  expect(html).toContain("恢复默认");
  expect(html).not.toContain(
    "字体调整正文、按钮、输入框和下拉菜单；元素大小调整控件高度与间距。牌桌尺寸单独设置。",
  );
});
