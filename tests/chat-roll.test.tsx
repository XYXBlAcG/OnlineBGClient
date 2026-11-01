import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ChatRoll } from "../src/client/social/ChatRoll";
it("骰子只展示服务端结果，新消息滚动、历史消息静止，任意面数都可读", () => {
  const message = {
    id: "roll",
    sequence: 1,
    sender: "a",
    name: "甲",
    time: 1000,
    type: "roll" as const,
    text: "掷骰",
    sides: 100,
    results: [17, 92],
  };
  const html = renderToStaticMarkup(
    <ChatRoll message={message} serverTime={1100} />,
  );
  expect(html).toContain('data-rolling="true"');
  expect(html).toContain("17、92");
  expect(html).toContain("109");
  expect(
    renderToStaticMarkup(<ChatRoll message={message} serverTime={9000} />),
  ).toContain('data-rolling="false"');
});
