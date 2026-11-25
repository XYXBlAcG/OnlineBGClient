import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { ThemeControl } from "../src/client/ThemeControl";

it("shares a labelled manual theme choice with phone and desktop controls", () => {
  const html = renderToStaticMarkup(
    <ThemeControl value="dark" onChange={() => {}} />,
  );
  expect(html).toContain('aria-label="外观主题"');
  expect(html).toContain("深色");
  expect(html).toContain('role="combobox"');
});

it("covers every board with shared theme tokens and keeps phone immersion full-height", () => {
  const theme = readFileSync("src/client/ui/board-themes.css", "utf8");
  const board = readFileSync("src/styles.css", "utf8");
  expect(board).toMatch(
    /\.original-game \{[^}]+background: var\(--board-surface\)/,
  );
  expect(theme).toContain('[data-color-scheme="dark"] .original-game');
  expect(theme).not.toContain("invert(");
  const mobile = readFileSync("src/client/ui/mobile-table.css", "utf8");
  expect(mobile).toContain(".mobile-shell.mobile-immersive .room-layout");
  expect(mobile).toContain(
    ".mobile-immersive .game-area > :not(.room-game-scene,.arcade-progress)",
  );
  expect(mobile).not.toContain(
    ".mobile-immersive .room-sidebar { display:none",
  );
});
