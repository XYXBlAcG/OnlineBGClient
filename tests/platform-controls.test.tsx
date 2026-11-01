import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Emoji } from "../src/client/Emoji";
import { preferencesSchema } from "../src/client/preferences";
it("默认使用系统表情，汉字保留文本",()=>{
 expect(renderToStaticMarkup(<Emoji text="🤓"/>)).toBe("🤓");
 expect(renderToStaticMarkup(<Emoji text="曹"/>)).toBe("曹");
});
it("局域网调试入口默认隐藏，代理只在直连失败后使用", () => {
  const preferences = preferencesSchema.parse({});
  expect(preferences.network.showLanDebug).toBe(false);
  expect(preferences.network.proxyFallback).toBe(true);
  expect(preferences.network.proxyUrl).toBe("http://127.0.0.1:7897");
});

it("共享表情渲染不把玩家文本当作 HTML 执行", () => {
  expect(
    renderToStaticMarkup(<Emoji text={"<script>alert(1)</script> 🤓"} />),
  ).toContain("&lt;script&gt;");
});

