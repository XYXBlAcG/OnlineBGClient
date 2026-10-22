import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { roomReadiness } from "../src/client/room-readiness";
import { Room } from "../src/domain/room";
it("derives start blockers from real human seats and ignores AI seats", () => {
  const room = new Room("ready", {
    kind: "uno",
    humans: 2,
    ai: [{ difficulty: "normal", name: "青竹" }],
    team: false,
    training: false,
  });
  const owner = room.claim("甲");
  expect(roomReadiness(room.snapshot(owner).seats)).toEqual({
    canStart: false,
    message: "等待席位 2 加入",
  });
  const other = room.claim("乙");
  room.setReady(other, false);
  expect(roomReadiness(room.snapshot(owner).seats)).toEqual({
    canStart: false,
    message: "等待乙准备",
  });
  room.setReady(other, true);
  expect(roomReadiness(room.snapshot(owner).seats)).toEqual({
    canStart: true,
    message: "所有玩家已准备",
  });
  room.disconnect(other);
  expect(roomReadiness(room.snapshot(owner).seats).message).toContain(
    "乙重新连接",
  );
});
it("keeps catalogue icons and menu focus rules independent of upstream card styles", () => {
  const lobby = readFileSync("src/client/Lobby.tsx", "utf8"),
    css = readFileSync("src/styles.css", "utf8");
  expect(lobby).not.toContain("className={`game-symbol ${key}`}");
  expect(css).toContain(".ui-select-menu .ui-select-item:focus-visible");
  expect(css).toContain(".about-links a");
});
it("places the sidebar close action after both section tabs in document order", () => {
  const main = readFileSync("src/main.tsx", "utf8"),
    start = main.indexOf('<nav className="sidebar-tabs"'),
    navigation = main.slice(start, main.indexOf("</nav>", start));
  expect(start).toBeGreaterThan(-1);
  expect(navigation.indexOf('className="sidebar-close"')).toBeGreaterThan(
    navigation.indexOf("{guideEnabled &&"),
  );
});
