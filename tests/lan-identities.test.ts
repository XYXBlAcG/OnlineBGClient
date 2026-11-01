import { expect, it, vi } from "vitest";
import { Room } from "../src/domain/room";
it("普通 HTTP 的 crypto 仅有 getRandomValues 时仍能建房、领取席位和开始", () => {
  const crypto = globalThis.crypto;
  vi.stubGlobal("crypto", {
    getRandomValues: crypto.getRandomValues.bind(crypto),
  });
  try {
    const room = new Room("lan-test", {
      kind: "uno",
      humans: 1,
      ai: [{ difficulty: "easy", name: "测试" }],
      team: false,
      training: false,
    });
    const token = room.claim("甲");
    room.start(token);
    expect(room.snapshot(token).playing).toBe(true);
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
  } finally {
    vi.unstubAllGlobals();
  }
});
