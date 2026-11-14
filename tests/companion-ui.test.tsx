import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ChatMessageView } from "../src/client/social/ChatMessageView";
import { AiSettings } from "../src/client/AiSettings";
import { defaultCompanionConfig } from "../src/domain/companion";
import type { ChatMessage } from "../src/domain/social";

it("marks companion chat messages as AI", () => {
  const message: ChatMessage = {
    id: "companion:m1",
    sequence: 2,
    sender: "companion:table-companion",
    name: "桌搭子",
    time: 1000,
    type: "text",
    text: "你好呀",
    source: "ai",
  };
  const html = renderToStaticMarkup(
    <ChatMessageView message={message} ownId="me" serverTime={1100} />,
  );
  expect(html).toContain("桌搭子");
  expect(html).toContain("AI");
});

it("renders the AI settings controls", () => {
  const html = renderToStaticMarkup(
    <AiSettings
      config={defaultCompanionConfig}
      status={{
        enabled: false,
        name: "青竹",
        avatar: "🤖",
        configured: true,
        available: true,
      }}
      onChange={() => {}}
      onSaveProvider={() => {}}
      onError={() => {}}
    />,
  );
  expect(html).toContain("启用 AI 聊天");
  expect(html).toContain("青竹");
  expect(html).toContain("仅 @ 搭话");
});
