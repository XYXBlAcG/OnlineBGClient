import React from "react";
import { act, create } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { GameLibrary } from "../src/client/lobby/GameLibrary";
import { FlightOptionsControl } from "../src/client/flight/FlightOptionsControl";
import { RadioChoice, TextField } from "../src/client/ui/Controls";
import { preferencesSchema } from "../src/client/preferences";

it("renders an animated floating label and clean option cards", () => {
  const empty = renderToStaticMarkup(
    <TextField label="邀请链接" value="" readOnly />,
  );
  const filled = renderToStaticMarkup(
    <TextField label="昵称" value="我" onChange={() => {}} />,
  );
  const radios = renderToStaticMarkup(
    <RadioChoice
      label="显示方式"
      value="focus"
      onValueChange={() => {}}
      options={[
        { value: "focus", label: "专注" },
        { value: "full", label: "完整" },
      ]}
    />,
  );
  expect(empty).toContain('data-filled="false"');
  expect(filled).toContain('data-filled="true"');
  expect(filled).toContain("ui-field-summary-value");
  expect(filled).toContain("· 我");
  expect(empty).not.toContain("placeholder");
  expect(radios.match(/type="radio"/g)).toHaveLength(2);
  expect(radios).toContain('data-selected="true"');
  expect(radios).not.toContain("<small");
});

it("measures the floating label so the focus ring leaves a real gap", () => {
  const setProperty = vi.fn();
  const field = { clientWidth: 300, style: { setProperty } };
  const caption = { offsetLeft: 12, offsetWidth: 80 };
  act(() => {
    create(<TextField label="邀请链接" value="abc" readOnly />, {
      createNodeMock: (element) =>
        element.type === "label"
          ? field
          : element.type === "span"
            ? caption
            : null,
    });
  });
  expect(setProperty).toHaveBeenCalledWith("--ui-field-notch-start", "6px");
  expect(setProperty).toHaveBeenCalledWith("--ui-field-notch-end", "98px");
});

it("keeps gameplay options free of subtitles and icons", () => {
  const html = renderToStaticMarkup(
    <FlightOptionsControl value={{ mode: "classic" }} onChange={() => {}} />,
  );
  expect(html).toContain("经典航线");
  expect(html).toContain("风暴航线");
  expect(html).not.toContain("<small");
  expect(html).not.toContain("沿用原有竞速规则");
});

it("puts frequently played games before untouched games", () => {
  const html = renderToStaticMarkup(
    <GameLibrary
      selected="uno"
      favorites={[]}
      recent={["graphwar", "uno"]}
      onSelect={() => {}}
      onFavorite={() => {}}
    />,
  );
  expect(html.indexOf("选择Graphwar")).toBeLessThan(html.indexOf("选择UNO"));
});

it("keeps the lobby form stable and the expedition drawer large enough for details", () => {
  const lobby = readFileSync("src/client/Lobby.tsx", "utf8");
  const social = readFileSync("src/client/ui/social-experience.css", "utf8");
  const expedition = readFileSync("src/client/expedition/table.css", "utf8");
  expect(lobby).not.toContain('data-scene-size="form"');
  expect(lobby).not.toContain('data-scene-layout="setup"');
  expect(social).not.toContain("background: #1c1234e6");
  expect(social).not.toContain("background: #161a28ce");
  expect(expedition).toContain("width: min(680px, calc(100vw - 16px))");
  expect(expedition).toContain("min-height: 300px");
  const preferences = preferencesSchema.parse({});
  expect(preferences.uiFontScale).toBe(1);
  expect(preferences.uiScale).toBe(1);
});

it("uses stable settings, neutral buttons and readable shortcut chips", () => {
  const css = readFileSync("src/styles.css", "utf8");
  const settings = readFileSync("src/client/ui/experience.css", "utf8");
  const lobby = readFileSync("src/client/lobby/lobby.css", "utf8");
  const tokens = readFileSync("src/client/ui/design-tokens.css", "utf8");
  expect(css).toContain(".ui-panel.room-menu-panel");
  expect(css).toContain(".room-drawer-section");
  expect(css).toMatch(
    /background: var\(--accent\);\s*border: 3px solid var\(--surface\)/,
  );
  expect(css).toContain(".ui-field-label");
  expect(css).toContain(".ui-field-summary");
  expect(css).toContain(".ui-field:focus-within .ui-field-label");
  expect(css).toContain(".ui-field::after");
  expect(css).toContain("--ui-field-notch-start");
  expect(css).toContain("button kbd");
  expect(css).not.toContain(
    'button[aria-pressed="true"][aria-haspopup="dialog"]',
  );
  expect(css).not.toContain('button[data-button-variant="navigation"]');
  expect(css).not.toContain('button[data-button-variant="social"]');
  expect(css).not.toContain('button[data-button-variant="host"]');
  expect(css).not.toContain('button[data-button-variant="tool"]');
  expect(settings).toContain("height: min(760px, calc(100dvh - 48px))");
  expect(settings).toContain("overflow-y: auto");
  expect(css).toContain("border-radius: 999px");
  expect(lobby).toContain(".club-empty button");
  expect(tokens).toContain("--font-ui");
  expect(tokens).toContain("--font-size-control");
  expect(tokens).toContain("--font-size-body");
});

it("animates disclosure blocks and keeps expanded spacing consistent", () => {
  const css = readFileSync("src/styles.css", "utf8");
  expect(css).toContain("interpolate-size: allow-keywords");
  expect(css).toContain("details::details-content");
  expect(css).toContain("details[open] > summary");
  expect(css).toContain("--details-content-gap");
});

it("keeps the focused text field compact and vertically balanced", () => {
  const css = readFileSync("src/styles.css", "utf8");
  expect(css).toContain("min-height: calc(46px * var(--ui-scale))");
  expect(css).toContain(
    "padding: calc(23px * var(--ui-scale)) 12px calc(1px * var(--ui-scale))",
  );
});

it("keeps the flight map canvas and UNO card motion measurable", () => {
  const css = readFileSync("src/styles.css", "utf8");
  const experience = readFileSync("src/client/ui/experience.css", "utf8");
  const flight = readFileSync("src/client/flight/flight.css", "utf8");
  expect(flight).toContain(".flight-weather-layer");
  expect(flight).toContain(".flight-board-overlay *");
  expect(flight).toContain("pointer-events: none");
  expect(css).toMatch(/\.guide-highlight,\s*\.guide-highlight \*/);
  expect(css).toMatch(
    /\[data-flight-players="collapsed"\]\s*>\s*\.flex\s*\{[^}]*display:\s*none/,
  );
  expect(css).toMatch(
    /\.original-game\[data-game="fxq"\]\s*\.fitted-map\s*>\s*\.absolute\s*\{[^}]*z-index:\s*2/,
  );
  expect(flight).toContain("@keyframes flight-wind-right");
  expect(flight).toContain("@keyframes flight-rain-fall");
  expect(flight).toContain("prefers-reduced-motion");
  expect(flight).toContain(".flight-forecast");
  expect(css).toMatch(
    /\.map-scroll \{[^}]*flex: 1;[^}]*min-height: 180px;[^}]*overflow: auto;[^}]*position: relative;/,
  );
  expect(css).toMatch(
    /\.map-canvas \{[^}]*min-width: 100%;[^}]*min-height: 100%;[^}]*height: 100%;/,
  );
  expect(css).toContain(
    '.playing-room .original-game[data-game="fxq"] > .map-viewport',
  );
  expect(experience).toContain("top 200ms");
  expect(experience).toContain(
    '.original-game:not([data-game-motion="reduced"]) .uno:active',
  );
});
