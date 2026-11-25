import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { Room } from "../src/domain/room";
import { gameKinds, gameCatalogue } from "../src/domain/catalogue";
import { OriginalGame } from "../src/client/OriginalGame";
beforeEach(() =>
  vi.stubGlobal("document", {
    createElement: () => ({ setAttribute: () => {}, clientWidth: 16 }),
    body: { appendChild: () => {}, removeChild: () => {} },
  }),
);
afterEach(() => vi.unstubAllGlobals());

it("手机标题不继承桌面横向的 230px flex 基准尺寸", () => {
  const css = readFileSync("src/client/ui/social-experience.css", "utf8");
  const mobile = css.slice(css.indexOf(".mobile-shell .room-heading {"));
  expect(mobile.slice(0, mobile.indexOf("}"))).toContain("flex: none");
});
it("手机麻将保留可读大手牌和横向浏览，不再把全部牌压到 22px", () => {
  const css = readFileSync("src/client/ui/mobile-usability.css", "utf8");
  expect(css).toContain("--mobile-mahjong-tile: 38px");
  expect(css).toContain("justify-content: flex-start");
  expect(css).toContain("overflow-x: auto");
});
for (const kind of gameKinds)
  it(`手机适配覆盖真实 ${gameCatalogue[kind].name} 牌桌`, () => {
    const game = gameCatalogue[kind];
    const room = new Room("mobile-audit", {
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
    if (kind === "miner") {
      expect(html).toContain('class="miner-table"');
      const styles = readFileSync("src/client/miner/miner.css", "utf8");
      expect(styles).toContain("@media (max-width: 640px)");
      expect(styles).toContain("@media (orientation: landscape)");
    } else if (kind === "drawguess" || kind === "golf") {
      expect(html).toContain(kind === "drawguess" ? "绘画画布" : "果岭");
      const styles = readFileSync("src/client/ui/party-games.css", "utf8");
      expect(styles).toContain("@media (max-width: 640px) and (orientation: portrait)");
      expect(styles).toContain("@media (orientation: landscape)");
      expect(styles).toContain("grid-area: board;");
      expect(styles).toContain("touch-action: none");
      expect(html).toContain('class="party-board"');
    } else {
      expect(
        readFileSync("src/client/ui/mobile-usability.css", "utf8"),
      ).toContain(`[data-game="${kind}"]`);
    }
  });
