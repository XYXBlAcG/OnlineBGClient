import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SearchField } from "../src/client/ui/Controls";
import { searchSettingsSections } from "../src/client/settings-search";

it("finds settings sections by labels and keywords", () => {
  expect(
    searchSettingsSections("帧率", true).map((item) => item.label),
  ).toEqual(["界面显示"]);
  expect(searchSettingsSections("fps", true).map((item) => item.label)).toEqual(
    ["界面显示"],
  );
  expect(
    searchSettingsSections("显示帧率", true).map((item) => item.label),
  ).toEqual(["界面显示"]);
  expect(
    searchSettingsSections("三连六", true).map((item) => item.label),
  ).toEqual([]);
  expect(
    searchSettingsSections("成就", true).map((item) => item.label),
  ).toEqual(["成就"]);
});

it("keeps desktop-only settings out of browser search", () => {
  expect(
    searchSettingsSections("更新", false).map((item) => item.label),
  ).not.toContain("软件更新");
  expect(
    searchSettingsSections("更新", true).map((item) => item.label),
  ).toContain("软件更新");
  expect(searchSettingsSections("不存在的设置", true)).toEqual([]);
});

it("renders search fields without the floating text-field label", () => {
  const html = renderToStaticMarkup(
    createElement(SearchField, {
      label: "搜索设置",
      value: "帧率",
      readOnly: true,
    }),
  );
  expect(html).toContain("ui-search-field");
  expect(html).toContain('placeholder="搜索设置"');
  expect(html).not.toContain("ui-field-label");
  expect(html).not.toContain("ui-field-summary");
});

it("wires the settings search into the panel and navigation", () => {
  const settings = readFileSync("src/client/Settings.tsx", "utf8");
  expect(settings).toContain('label="搜索设置"');
  expect(settings).toContain("<SearchField");
  expect(settings).toContain("searchSettingsSections");
  expect(settings).toContain("settings-search-empty");
  expect(settings).toContain('label="大厅切换动画"');
  expect(readFileSync("src/styles.css", "utf8")).toContain(
    ".ui-search-field::before",
  );
  expect(readFileSync("src/styles.css", "utf8")).toContain("padding: 8px 36px");
});
