import { expect, it } from "vitest";
import { phonePreviewEnabled } from "../src/client/phone-preview";
import {
  previewUrl,
  previewSize,
  previewFit,
} from "../public/phone-preview-model.mjs";

it("仅显式嵌入预览启用手机布局，不影响正常桌面入口", () => {
  expect(phonePreviewEnabled("?device-preview=phone", true)).toBe(true);
  expect(phonePreviewEnabled("?device-preview=phone", false)).toBe(false);
  expect(phonePreviewEnabled("?room=abc", true)).toBe(false);
});

it("房间邀请参数保留，拒绝非网页协议与预览页递归", () => {
  expect(
    previewUrl(
      "/?room=abc&service=https%3A%2F%2Fexample.com",
      "http://localhost:1421/",
    ),
  ).toContain("room=abc");
  expect(previewUrl("/", "http://localhost:1421/")).toContain(
    "device-preview=phone",
  );
  expect(() =>
    previewUrl("javascript:alert(1)", "http://localhost:1421/"),
  ).toThrow();
  expect(() =>
    previewUrl("/phone-preview.html", "http://localhost:1421/"),
  ).toThrow();
});

it("尺寸受控，外框适配比例不改变手机逻辑宽高", () => {
  expect(previewSize(390, 844, true)).toEqual({ width: 844, height: 390 });
  expect(previewSize(0, 10000, false)).toEqual({ width: 240, height: 1600 });
  expect(previewFit(390, 844, 1000, 600)).toBeLessThan(1);
  expect(previewFit(390, 844, 1500, 1400)).toBe(1);
});
