import { describe, expect, it } from "vitest";
import {
  applyChatSuggestion,
  chatSuggestions,
  type ChatSuggestionContext,
} from "../src/client/social/chat-suggestions";

const context: ChatSuggestionContext = {
  seats: [
    {
      id: "human-1",
      name: "甲",
      avatar: "😊",
      difficulty: null,
      online: true,
      ready: true,
    },
    {
      id: "human-2",
      name: "乙",
      avatar: "😎",
      difficulty: null,
      online: true,
      ready: true,
    },
    {
      id: "ai-1",
      name: "青竹",
      avatar: "🤖",
      difficulty: "easy",
      online: true,
      ready: true,
    },
  ],
  companion: {
    enabled: true,
    name: "青竹",
    avatar: "🤖",
    configured: true,
    available: true,
  },
};

describe("chatSuggestions", () => {
  it("lists room players after @ and marks the AI chat seat", () => {
    const suggestions = chatSuggestions("大家好 @", 5, context);
    expect(suggestions.map((item) => item.label)).toEqual([
      "@甲",
      "@乙",
      "@青竹",
    ]);
    expect(suggestions.find((item) => item.label === "@青竹")?.detail).toBe(
      "AI 聊天",
    );
    expect(suggestions.find((item) => item.label === "@甲")?.detail).toBe(
      "玩家",
    );
  });

  it("filters mentions by the active query", () => {
    expect(chatSuggestions("@青", 2, context).map((item) => item.label)).toEqual(
      ["@青竹"],
    );
  });

  it("does not open for an email-like @", () => {
    expect(chatSuggestions("mail@example", 13, context)).toEqual([]);
  });

  it("lists matching commands after /", () => {
    expect(chatSuggestions("/r", 2, context).map((item) => item.label)).toEqual([
      "/roll",
    ]);
    expect(chatSuggestions("/", 1, context).length).toBeGreaterThan(1);
  });

  it("closes the command list once arguments start", () => {
    expect(chatSuggestions("/roll 1d6", 10, context)).toEqual([]);
  });

  it("applies a mention and a command", () => {
    const mention = chatSuggestions("@青", 2, context)[0]!;
    expect(applyChatSuggestion("@青", mention)).toEqual({
      text: "@青竹 ",
      caret: 4,
    });
    const command = chatSuggestions("/r", 2, context)[0]!;
    expect(applyChatSuggestion("/r", command)).toEqual({
      text: "/roll ",
      caret: 6,
    });
  });
});
