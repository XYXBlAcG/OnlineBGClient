import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { PregamePanel } from "../src/client/PregamePanel";

it("所有游戏共用带房间摘要、席位卡和准备操作的准备界面", () => {
  const room = new Room("pregame-panel", {
      kind: "expedition",
      humans: 1,
      ai: [{ difficulty: "hard", name: "远征 AI" }],
      team: false,
      training: false,
    }),
    token = room.claim("房主"),
    html = renderToStaticMarkup(
      <PregamePanel
        snapshot={room.snapshot(token)}
        starting={false}
        onReady={() => {}}
        onStart={() => {}}
        onSeatChange={() => {}}
      />,
    );
  expect(html).toContain("pregame-panel");
  expect(html).toContain("pregame-seat-card");
  expect(html).toContain("开始对局");
  expect(html).toContain("准备");
  expect(html).not.toContain("pregame-emblem");
  expect(html).not.toContain("dialog");
});
