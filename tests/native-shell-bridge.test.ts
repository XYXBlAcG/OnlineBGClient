import { describe, expect, it, vi, afterEach } from "vitest";

afterEach(() => vi.unstubAllGlobals());

describe("native shell bridge", () => {
  it("向 WKWebView 的 nativeShell handler 发送消息", async () => {
    const messages: unknown[] = [];
    vi.stubGlobal("window", {
      webkit: {
        messageHandlers: {
          nativeShell: {
            postMessage: (message: unknown) => messages.push(message),
          },
        },
      },
    });
    const { postNativeShell } =
      await import("../src/client/native-shell-bridge");
    postNativeShell({ type: "ready", kind: "uno", room: "LOCAL" });
    postNativeShell({ type: "notice", message: "无法加入房间" });
    postNativeShell({
      type: "confirm",
      id: "confirm-1",
      message: "放弃远征？",
      label: "放弃",
    });
    expect(messages).toEqual([
      { type: "ready", kind: "uno", room: "LOCAL" },
      { type: "notice", message: "无法加入房间" },
      {
        type: "confirm",
        id: "confirm-1",
        message: "放弃远征？",
        label: "放弃",
      },
    ]);
    postNativeShell({ type: "closed" });
    expect(messages.at(-1)).toEqual({ type: "closed" });
  });

  it("普通浏览器没有 nativeShell handler 时保持静默", async () => {
    vi.stubGlobal("window", {});
    const { postNativeShell } =
      await import("../src/client/native-shell-bridge");
    expect(() =>
      postNativeShell({ type: "ready", kind: "uno", room: "LOCAL" }),
    ).not.toThrow();
  });
});
