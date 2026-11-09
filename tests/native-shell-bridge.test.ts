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
    expect(messages).toEqual([{ type: "ready", kind: "uno", room: "LOCAL" }]);
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
