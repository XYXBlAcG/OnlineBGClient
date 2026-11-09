import { describe, expect, it } from "vitest";
import {
  nativeDdzHand,
  nativeShellDevice,
  nativeShellPreviewOptions,
  nativeShellScreens,
  nativeUnoHand,
  toggleNativeCard,
} from "../src/shared/native-shell";

describe("native shell preview", () => {
  it("提供首页、大厅、加入、设置和牌桌预览", () => {
    expect(nativeShellScreens).toEqual([
      "home",
      "lobby",
      "join",
      "settings",
      "table",
    ]);
  });

  it("以 iPhone 竖屏尺寸作为默认预览", () => {
    expect(nativeShellDevice.portrait).toEqual({ width: 402, height: 874 });
    expect(nativeShellDevice.landscape).toEqual({ width: 874, height: 402 });
  });

  it("UNO 原型手牌可选中和取消", () => {
    expect(nativeUnoHand.length).toBeGreaterThanOrEqual(5);
    expect(new Set(nativeUnoHand.map((card) => card.id)).size).toBe(
      nativeUnoHand.length,
    );
    expect(toggleNativeCard([], nativeUnoHand[0].id)).toEqual([
      nativeUnoHand[0].id,
    ]);
    expect(
      toggleNativeCard([nativeUnoHand[0].id], nativeUnoHand[0].id),
    ).toEqual([]);
  });

  it("斗地主原型包含完整手牌并支持多选", () => {
    expect(nativeDdzHand).toHaveLength(17);
    expect(new Set(nativeDdzHand.map((card) => card.id)).size).toBe(17);
    expect(
      toggleNativeCard([nativeDdzHand[0].id], nativeDdzHand[1].id),
    ).toEqual([nativeDdzHand[0].id, nativeDdzHand[1].id]);
  });

  it("通过查询参数打开指定预览状态", () => {
    expect(nativeShellPreviewOptions("")).toEqual({
      screen: "home",
      theme: "light",
      landscape: false,
      island: true,
      safeArea: true,
      motion: true,
      handGame: "uno",
    });
    expect(
      nativeShellPreviewOptions(
        "?screen=lobby&theme=dark&orientation=landscape&island=off&safe=off&motion=off&hand=ddz",
      ),
    ).toEqual({
      screen: "lobby",
      theme: "dark",
      landscape: true,
      island: false,
      safeArea: false,
      motion: false,
      handGame: "ddz",
    });
    expect(nativeShellPreviewOptions("?screen=unknown").screen).toBe("home");
  });
});
