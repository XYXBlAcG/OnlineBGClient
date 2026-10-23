import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";
import { expect, it } from "vitest";
it("keeps CI browser checks on the shared structured room surface", () => {
  const scripts = [
    "smoke-client",
    "verify-social",
    "verify-catan",
    "verify-splendor",
    "verify-beginner-guides",
    "verify-mobile-host",
  ];
  for (const script of scripts) {
    const source = readFileSync(`scripts/${script}.mjs`, "utf8");
    expect(() => parse(source, { sourceType: "module" })).not.toThrow();
    expect(source).not.toMatch(/\.room-toolbar\s*>\s*strong/);
    expect(source).toContain("readRoomId");
  }
  const controls = readFileSync("scripts/browser-controls.mjs", "utf8");
  expect(controls).toContain("room-surface.ts");
  expect(controls).not.toContain(".room-options");
});
it("checks current cache labels and real touch input without dropping smoke coverage", () => {
  const viewport = readFileSync("scripts/verify-viewport.mjs", "utf8"),
    cache = readFileSync("scripts/verify-cache.mjs", "utf8");
  expect(() => parse(viewport, { sourceType: "module" })).not.toThrow();
  expect(viewport).toContain("Input.dispatchTouchEvent");
  expect(viewport).toContain("沉浸牌桌");
  expect(cache).toContain("聊天图片缓存 · 22 B");
  expect(cache).toContain("聊天图片缓存 · 0 B");
  expect(cache).not.toContain("旧表情缓存");
});
