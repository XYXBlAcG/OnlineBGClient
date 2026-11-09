import { describe, expect, it } from "vitest";
import { detectRuntime, runtimeCapabilities } from "../src/client/platform";

describe("runtime detection", () => {
  it("treats a normal browser as web", () => {
    expect(detectRuntime(false, "")).toBe("web");
    expect(detectRuntime(false, "Mozilla/5.0 (iPhone)")).toBe("web");
  });

  it("detects the iOS Tauri shell", () => {
    expect(
      detectRuntime(
        true,
        "Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      ),
    ).toBe("ios");
  });

  it("detects the desktop Tauri shell", () => {
    expect(
      detectRuntime(
        true,
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      ),
    ).toBe("desktop");
  });

  it("detects Android for the later mobile shell", () => {
    expect(
      detectRuntime(true, "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36"),
    ).toBe("android");
  });
});

describe("runtime capabilities", () => {
  it("keeps desktop-only features on desktop", () => {
    const capabilities = runtimeCapabilities("desktop");
    expect(capabilities).toMatchObject({
      mobileUi: false,
      localPlay: true,
      voice: true,
      voiceHostConfig: true,
      hosting: true,
      auxiliaryWindows: true,
      updater: true,
      keyboardShortcuts: true,
      qrScanner: false,
    });
  });

  it("enables iOS voice and local play without desktop features", () => {
    const capabilities = runtimeCapabilities("ios");
    expect(capabilities).toMatchObject({
      mobileUi: true,
      localPlay: true,
      voice: true,
      voiceHostConfig: false,
      hosting: false,
      auxiliaryWindows: false,
      updater: false,
      keyboardShortcuts: false,
      qrScanner: true,
    });
  });

  it("keeps voice and native capabilities out of a shareable browser link", () => {
    const capabilities = runtimeCapabilities("web");
    expect(capabilities).toMatchObject({
      mobileUi: false,
      localPlay: false,
      voice: false,
      voiceHostConfig: false,
      hosting: false,
      auxiliaryWindows: false,
      updater: false,
      qrScanner: false,
    });
  });
});
