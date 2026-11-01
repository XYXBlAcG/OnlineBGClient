import { expect, it } from "vitest";
import { displayProfile, gameSizing } from "../src/client/game-sizing/model";
import { preferencesSchema } from "../src/client/preferences";

it("显示配置区分不同的逻辑分辨率与系统缩放，不共享比例", () => {
  expect(displayProfile(1920, 1080, 1)).not.toBe(displayProfile(1920, 1080, 2));
  expect(displayProfile(2560, 1440, 2)).not.toBe(displayProfile(1920, 1080, 2));
  expect(preferencesSchema.parse({}).gameSizes).toEqual({});
});

it("大窗口允许更大元素，当前牌桌宽高限制最大值", () => {
  const small = gameSizing({
    width: 700,
    height: 430,
    kind: "scmj",
    requested: 2,
  });
  const large = gameSizing({
    width: 2200,
    height: 1300,
    kind: "scmj",
    requested: 2,
  });
  expect(large.max).toBeGreaterThan(small.max);
  expect(small.scale).toBeLessThanOrEqual(small.max);
  expect(large.scale).toBeGreaterThan(1);
  expect(
    gameSizing({ width: 350, height: 430, kind: "scmj", requested: 2 }).max,
  ).toBeLessThanOrEqual(small.max);
});

it("窗口缩小时收回过大比例，狭小窗口仍保留正常可读的基准和滚动", () => {
  for (const [width, height] of [
    [390, 300],
    [0, 0],
    [844, 190],
    [1024, 600],
  ]) {
    const info = gameSizing({
      width,
      height,
      kind: "expedition",
      requested: 20,
    });
    expect(Number.isFinite(info.scale)).toBe(true);
    expect(info.scale).toBeLessThanOrEqual(info.max);
    expect(info.min).toBeLessThanOrEqual(1);
    expect(info.max).toBeGreaterThanOrEqual(1);
    expect(info.scale).toBeGreaterThanOrEqual(info.min);
  }
});

it("缩放后的地图拖拽与定位使用布局坐标", async () => {
  const { mapDisplayScale } = await import("../src/client/map-view");
  expect(mapDisplayScale(1200, 800)).toBe(1.5);
  expect(150 / mapDisplayScale(1200, 800)).toBe(100);
  expect(mapDisplayScale(0, 0)).toBe(1);
});

it("保存值按显示配置独立读取；临时缩小不覆盖偏好", () => {
  const a = displayProfile(2560, 1440, 1);
  const b = displayProfile(1512, 982, 2);
  const preferences = preferencesSchema.parse({
    gameSizes: { [a]: 1.8, [b]: 1.1 },
  });
  const narrow = gameSizing({
    width: 900,
    height: 500,
    kind: "scmj",
    requested: preferences.gameSizes[a],
  });
  expect(narrow.requested).toBe(1.8);
  expect(narrow.scale).toBe(1);
  expect(preferences.gameSizes[a]).toBe(1.8);
  expect(preferences.gameSizes[b]).toBe(1.1);
  expect(
    gameSizing({
      width: 2400,
      height: 1300,
      kind: "scmj",
      requested: preferences.gameSizes[a],
    }).scale,
  ).toBe(1.8);
});
