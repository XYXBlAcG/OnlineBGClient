import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ChatMessageView } from "../src/client/social/ChatMessageView";
import type { ChatMessage } from "../src/domain/social";

it("renders achievement system messages without a player byline", () => {
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
