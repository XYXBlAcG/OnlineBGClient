import { describe, expect, it, vi, afterEach } from "vitest";
import {
  applyMotionOverride,
  enableIosMotionDefaults,
  motionRuntime,
  preferencesSchema,
} from "../src/client/preferences";

afterEach(() => vi.unstubAllGlobals());

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set("onlinebg.ios-motion-v2", initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, next: string) => {
      values.set(key, next);
    },
  };
}

describe("iOS motion defaults", () => {
  it("native-table 查询参数视为 iOS 外壳", () => {
    vi.stubGlobal("location", { search: "?native-table=uno" });
    expect(motionRuntime()).toBe("ios");
  });

  it("原生设置通过 motion 查询参数覆盖增强档", () => {
    const enhanced = preferencesSchema.parse({ enhancedGameMotion: false });
    expect(
      applyMotionOverride(enhanced, "?motion=enhanced").enhancedGameMotion,
    ).toBe(true);
    const basic = preferencesSchema.parse({ enhancedGameMotion: true });
    expect(applyMotionOverride(basic, "?motion=basic").enhancedGameMotion).toBe(
      false,
    );
    expect(
      applyMotionOverride(
        preferencesSchema.parse({ enhancedGameMotion: true }),
        "",
      ).enhancedGameMotion,
    ).toBe(true);
  });

  it("首次加载自动开启动效、增强游戏动画和大厅过渡", () => {
    const saved = storage();
    const preferences = enableIosMotionDefaults(
      preferencesSchema.parse({}),
      "ios",
      saved,
    );
    expect(preferences.motion).toBe(true);
    expect(preferences.enhancedGameMotion).toBe(true);
    expect(preferences.lobbySwitchMotion).toBe(true);
    expect(saved.getItem("onlinebg.ios-motion-v2")).toBe("1");
    expect(
      JSON.parse(saved.getItem("onlinebg.preferences")!).enhancedGameMotion,
    ).toBe(true);
  });

  it("用户之后手动关闭时不再强制覆盖", () => {
    const saved = storage("1");
    const preferences = enableIosMotionDefaults(
      preferencesSchema.parse({
        motion: false,
        enhancedGameMotion: false,
        lobbySwitchMotion: false,
      }),
      "ios",
      saved,
    );
    expect(preferences.motion).toBe(false);
    expect(preferences.enhancedGameMotion).toBe(false);
    expect(preferences.lobbySwitchMotion).toBe(false);
  });

  it("桌面和浏览器不改变动效偏好", () => {
    const preferences = enableIosMotionDefaults(
      preferencesSchema.parse({
        motion: false,
        enhancedGameMotion: false,
        lobbySwitchMotion: false,
      }),
      "web",
      storage(),
    );
    expect(preferences.motion).toBe(false);
    expect(preferences.enhancedGameMotion).toBe(false);
    expect(preferences.lobbySwitchMotion).toBe(false);
  });
});
