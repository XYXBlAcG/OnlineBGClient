import React from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { OriginalGame } from "../src/client/OriginalGame";
import { Room } from "../src/domain/room";
it("renders replay without end controls and targets game avatars", () => {
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    createElement: () => ({ setAttribute: () => {}, clientWidth: 16 }),
    body: { appendChild: () => {}, removeChild: () => {} },
  });
  try {
    for (const kind of ["uno", "sgs", "dy", "fxq", "tq", "ddz", "ktd", "ccbs"] as const) {
      const room = new Room("surface", {
        kind,
        humans: 3,
        ai: [],
        team: false,
        training: false,
      });
      const owner = room.claim("甲");
      room.claim("乙");
      room.claim("丙");
      room.seats.forEach((s) => (s.ready = true));
      room.start(owner);
      const html = renderToString(
        <OriginalGame
          snapshot={room.snapshot(owner)}
          act={() => {}}
          end={() => {}}
          replay
        />,
      );
      expect(html).not.toContain("结束游戏");
      expect(html).not.toContain("送出鸡蛋");
      const live = renderToString(
        <OriginalGame
          snapshot={room.snapshot(owner)}
          act={() => {}}
          end={() => {}}
          onPhrase={() => {}}
          onInteract={() => {}}
        />,
      );
      expect(live).toContain('data-game-avatar="0"');
      expect(live).toContain(`data-game="${kind}"`);
      if (kind === "dy") expect(live).toContain("poison-pots");
      if (kind === "ktd") {
        expect(live).toContain('class="map-viewport"');
        expect(live).toContain('aria-label="放大地图"');
        expect(live).toContain('catan-actions');
      }
    }
  } finally {
    vi.unstubAllGlobals();
  }
});
