import { describe, expect, it, vi } from "vitest";
import { voiceHttpRequest } from "../src/client/voice/request";
import type { VoiceRoom } from "../src/domain/voice";

const room: VoiceRoom = {
  endpoint: "https://room.example/",
  room: "abc",
  token: "game-token",
};

describe("voiceHttpRequest", () => {
  it("posts a room operation with the game token", async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ configured: true }),
    }));
    await expect(
      voiceHttpRequest(room, { type: "status" }, fetch as never),
    ).resolves.toEqual({ configured: true });
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://room.example/voice?room=abc"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer game-token",
        },
        body: JSON.stringify({ type: "status" }),
      },
    );
  });

  it("surfaces the server voice error", async () => {
    const fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "房主已关闭语音" }),
    }));
    await expect(
      voiceHttpRequest(room, { type: "join" }, fetch as never),
    ).rejects.toThrow("房主已关闭语音");
  });
});
