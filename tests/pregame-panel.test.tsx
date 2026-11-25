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
        onChatAiSeatChange={() => {}}
        onChatEnabledChange={() => {}}
        onOpenAiSettings={() => {}}
      />,
    );
  expect(html).toContain("pregame-panel");
  expect(html).toContain("pregame-seat-card");
  expect(html).toContain("开始对局");
  expect(html).toContain("聊天 AI");
  expect(html).toContain("AI 驱动");
  expect(html).toContain("启用 AI 聊天");
  expect(html).toContain("准备");
  expect(html).not.toContain("pregame-emblem");
  expect(html).not.toContain("dialog");
});

it("hideLlm 关闭时准备界面不出现任何 AI 聊天或 LLM 驱动入口", () => {
  const room = new Room("pregame-llm-hidden", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "normal", name: "AI 一号" }],
    team: false,
    training: false,
  });
  const token = room.claim("房主");
  const html = renderToStaticMarkup(
    <PregamePanel
      snapshot={room.snapshot(token)}
      starting={false}
      showLlm={false}
      onReady={() => {}}
      onStart={() => {}}
      onSeatChange={() => {}}
      onChatAiSeatChange={() => {}}
      onChatEnabledChange={() => {}}
      onOpenAiSettings={() => {}}
    />,
  );
  expect(html).not.toContain("启用 AI 聊天");
  expect(html).not.toContain("AI 驱动");
  expect(html).not.toContain("接入");
  expect(html).not.toContain("LLM");
});
