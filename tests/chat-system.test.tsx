import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ChatMessageView } from "../src/client/social/ChatMessageView";
import type { ChatMessage } from "../src/domain/social";

it("renders legacy achievement system messages without a player byline", () => {
  const message: ChatMessage = {
    type: "system",
    text: "甲 达成了「纯色胜利」成就",
    id: "system-1",
    sequence: 1,
    sender: "system",
    name: "系统",
    time: 1,
  };
  const html = renderToStaticMarkup(
    <ChatMessageView message={message} ownId="player" serverTime={1} />,
  );
  expect(html).toContain("chat-system-message");
  expect(html).toContain("甲 达成了「纯色胜利」成就");
  expect(html).not.toContain("chat-message-meta");
});

it("renders achievement broadcasts as rarity cards", () => {
  const message: ChatMessage = {
    type: "achievement",
    text: "甲 达成了「纯色胜利」成就",
    achievementId: "uno.pure-color",
    title: "纯色胜利",
    symbol: "🃏",
    rarity: "legendary",
    game: "uno",
    id: "achievement-1",
    sequence: 2,
    sender: "player",
    name: "甲",
    time: 2,
  };
  const html = renderToStaticMarkup(
    <ChatMessageView message={message} ownId="player" serverTime={2} />,
  );
  expect(html).toContain("chat-achievement");
  expect(html).toContain('data-rarity="legendary"');
  expect(html).toContain("纯色胜利");
  expect(html).toContain("甲 达成成就");
});
