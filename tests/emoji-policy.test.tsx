import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { Emoji, emojiUrl } from "../src/client/Emoji";
import { emojiRegistry, EmojiRegistry } from "../src/client/emoji/client";
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
  convertFileSrc: (name: string) => `http://emoji.localhost/${name}`,
  invoke: vi.fn(),
}));
afterEach(() => {
  emojiRegistry.configure("", []);
  vi.unstubAllGlobals();
});
it("默认原生显示 emoji 和汉字，不请求 Apple 图片", () => {
  expect(renderToStaticMarkup(<Emoji text="🤓 曹 ❤️" />)).toBe("🤓 曹 ❤️");
  expect(emojiUrl("🤓")).toBeUndefined();
});
it("仅已安装包的字符使用本地图片，未收录字符保留原生显示", () => {
  emojiRegistry.configure("http://emoji.localhost/", ["1f913", "2764"]);
  expect(emojiUrl("❤️")).toBe("http://emoji.localhost/2764.png");
  const html = renderToStaticMarkup(<Emoji text="🤓 🥹 曹" />);
  expect(html).toContain("http://emoji.localhost/1f913.png");
  expect(html).toContain("🥹 曹");
});
it("非 Windows 状态关闭已装图片，单张资源失败立即恢复原生", async () => {
  emojiRegistry.configure("http://emoji.localhost/", ["1f913"]);
  emojiRegistry.unavailable("http://emoji.localhost/1f913.png");
  expect(emojiUrl("🤓")).toBeUndefined();
  emojiRegistry.configure("http://emoji.localhost/", ["1f913"]);
  await emojiRegistry.accept({
    revision: 1,
    supported: false,
    installed: true,
    enabled: true,
    phase: "",
    progress: 0,
  });
  expect(emojiUrl("🤓")).toBeUndefined();
});

it("资源加载中停用不会被迟到响应重新开启，更新版本使用不同图片地址", async () => {
  const store = new EmojiRegistry();
  let resolve!: (value: unknown) => void;
  const response = new Promise((done) => {
    resolve = done;
  });
  const fetcher = vi.fn(() => response);
  vi.stubGlobal("fetch", fetcher);
  const state = {
    revision: 1,
    supported: true,
    installed: true,
    enabled: true,
    phase: "",
    progress: 0,
    assetVersion: "one",
  };
  const pending = store.accept(state);
  await store.accept({ ...state, revision: 2, enabled: false });
  resolve({ ok: true, json: async () => ({ codes: ["1f913"] }) });
  await pending;
  expect(store.url("1f913")).toBeUndefined();
  await store.accept({ ...state, revision: 3, assetVersion: "two" });
  expect(store.url("1f913")).toBe("http://emoji.localhost/1f913.png?v=two");
  await store.accept({ ...state, revision: 1, enabled: false });
  expect(store.url("1f913")).toContain("?v=two");
});
it("下载进度不会触发表情重绘，只有资源切换与单图回退通知绘制订阅者", async () => {
  const store = new EmojiRegistry();
  const render = vi.fn();
  store.subscribePack(render);
  const state = {
    revision: 1,
    supported: true,
    installed: false,
    enabled: false,
    phase: "downloading",
    progress: 0.1,
  };
  await store.accept(state);
  await store.accept({ ...state, revision: 2, progress: 0.5 });
  expect(render).not.toHaveBeenCalled();
  store.configure("http://emoji.localhost/", ["1f913"]);
  expect(render).toHaveBeenCalledTimes(1);
  store.configure("http://emoji.localhost/", ["1f913"]);
  expect(render).toHaveBeenCalledTimes(1);
  await store.accept({
    ...state,
    revision: 3,
    installed: true,
    enabled: true,
    progress: 0.7,
  });
  expect(render).toHaveBeenCalledTimes(1);
  store.unavailable("http://emoji.localhost/1f913.png");
  expect(render).toHaveBeenCalledTimes(2);
});
