import { it, expect } from "vitest";
import { ChatReadState } from "../src/client/chat-read";
it("excludes own messages and tracks unread beyond the retained list and reconnection", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  const state = new ChatReadState("room:identity", storage);
  state.mark(200, 100);
  expect(state.unread(405, 202)).toBe(103);
  expect(new ChatReadState("room:identity", storage).unread(406, 203)).toBe(
    103,
  );
  state.mark(406, 203);
  expect(state.unread(407, 204)).toBe(0);
  expect(new ChatReadState("room:other", storage).unread(407, 100)).toBe(307);
});
