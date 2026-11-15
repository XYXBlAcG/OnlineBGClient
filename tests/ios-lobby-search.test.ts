import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

it("keeps the lobby game search below the navigation header", () => {
  const source = readFileSync(
    "ios-native/OnlineBGShell/ShellRootView.swift",
    "utf8",
  );
  expect(source).not.toContain(".searchable(");
  expect(source).toContain('Image(systemName: "magnifyingglass")');
  expect(source).toContain('TextField("搜索游戏", text: $search)');
});
