import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { ThemeControl } from "../src/client/ThemeControl";
import { gameKinds } from "../src/domain/catalogue";

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
  for (const kind of gameKinds)
    expect(theme).toContain(`[data-game="${kind}"]`);
  expect(theme).not.toContain("invert(");
  const mobile = readFileSync("src/client/ui/mobile-table.css", "utf8");
  expect(mobile).toContain(".mobile-shell.mobile-immersive .room-layout");
  expect(mobile).toContain(".mobile-immersive .game-area > :not(.game-stage)");
  expect(mobile).not.toContain(
    ".mobile-immersive .room-sidebar { display:none",
  );
});
