import { expect, it } from "vitest";
import { phonePreviewEnabled } from "../src/client/phone-preview";
import {
  phoneFit,
  phonePresets,
  phoneRoomUrl,
  phoneSize,
} from "../src/shared/phone-preview";

it("仅显式嵌入预览启用手机布局，不影响正常桌面入口", () => {
  expect(phonePreviewEnabled("?device-preview=phone", true)).toBe(true);
  expect(phonePreviewEnabled("?device-preview=phone", false)).toBe(false);
  expect(phonePreviewEnabled("?room=abc", true)).toBe(false);
});

it("把局域网和公网邀请转到当前开发客户端并保留真实服务地址", () => {
  const lan = new URL(
    phoneRoomUrl(
      "http://192.168.1.8:8787/?room=abc",
      "http://127.0.0.1:1420/?dev=phone",
      "http://127.0.0.1:1420",
    ),
  );
  expect(lan.origin).toBe("http://127.0.0.1:1420");
  expect(lan.searchParams.get("room")).toBe("abc");
  expect(lan.searchParams.get("service")).toBe("http://192.168.1.8:8787");
  expect(lan.searchParams.get("device-preview")).toBe("phone");
  const shared = new URL(
    phoneRoomUrl(
      "https://rooms.example.test/?room=xyz&service=https%3A%2F%2Frooms.example.test",
      "http://127.0.0.1:1420/?dev=phone",
      "http://127.0.0.1:1420",
    ),
  );
  expect(shared.searchParams.get("service")).toBe("https://rooms.example.test");
  expect(shared.searchParams.get("room")).toBe("xyz");
});

it("普通网页直接加载并拒绝递归与非网页协议", () => {
  expect(
    new URL(
      phoneRoomUrl(
        "http://127.0.0.1:1420/",
        "http://127.0.0.1:1420/?dev=phone",
        "http://127.0.0.1:1420",
      ),
    ).searchParams.get("device-preview"),
  ).toBe("phone");
  expect(() =>
    phoneRoomUrl(
      "javascript:alert(1)",
      "http://127.0.0.1:1420/?dev=phone",
      "http://127.0.0.1:1420",
    ),
  ).toThrow();
  expect(() =>
    phoneRoomUrl(
      "http://127.0.0.1:1420/?dev=phone",
      "http://127.0.0.1:1420/?dev=phone",
      "http://127.0.0.1:1420",
    ),
  ).toThrow();
});

it("尺寸受控，外框适配比例不改变手机逻辑宽高", () => {
  expect(phoneSize(390, 844, true)).toEqual({ width: 844, height: 390 });
  expect(phoneSize(0, 10000, false)).toEqual({ width: 240, height: 1600 });
  expect(phoneFit(390, 844, 1000, 600)).toBeLessThan(1);
  expect(phoneFit(390, 844, 1500, 1400)).toBe(1);
  expect(phonePresets.some((preset) => preset.width === 390)).toBe(true);
});
