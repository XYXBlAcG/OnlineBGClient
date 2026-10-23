import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { OriginalGame } from "../src/client/OriginalGame";
import { gameCatalogue, gameKinds } from "../src/domain/catalogue";
import { Room } from "../src/domain/room";
import { Switch } from "../src/client/ui/Controls";
beforeEach(() =>
  vi.stubGlobal("document", {
    createElement: () => ({ setAttribute: () => {}, clientWidth: 16 }),
    body: { appendChild: () => {}, removeChild: () => {} },
  }),
);
afterEach(() => vi.unstubAllGlobals());
for (const kind of gameKinds)
  it(`renders the real ${kind} table and supplies a scoped landscape layout`, () => {
    const game = gameCatalogue[kind];
    const room = new Room("layout", {
      kind,
      humans: game.minPlayers,
      ai: [],
      team: false,
      training: false,
    });
    const tokens = Array.from({ length: game.minPlayers }, (_, index) =>
      room.claim(`玩家${index + 1}`),
    );
    tokens.slice(1).forEach((token) => room.setReady(token, true));
    room.start(tokens[0]);
    const html = renderToStaticMarkup(
      <OriginalGame
        snapshot={room.snapshot(tokens[0])}
        act={() => {}}
        end={() => {}}
      />,
    );
    expect(html).toContain(`data-game="${kind}"`);
    expect(html.length).toBeGreaterThan(200);
    const css = readFileSync("src/client/ui/mobile-landscape.css", "utf8");
    expect(css).toContain(`[data-game="${kind}"]`);
    if (kind === "uno") expect(html).toContain('data-table-region="hand"');
    if (kind === "ktd") expect(html).toContain('class="map-viewport"');
  });
it("renders the same labelled switch in a popover and gives its track a fixed independent size", () => {
  const html = renderToStaticMarkup(
    <div className="ui-popover">
      <Switch
        checked
        label="本机显示横幅与全屏表情"
        onCheckedChange={() => {}}
      />
    </div>,
  );
  expect(html).toContain('role="switch"');
  expect(html).toContain('aria-checked="true"');
  const css = readFileSync("src/styles.css", "utf8");
  expect(css).toContain(".ui-popover,.native-window-root) .ui-switch");
  expect(css).toContain("flex:0 0 36px");
});
