import { expect, it } from "vitest";
import { cinemaScore } from "../src/client/party/cinema-score";
it("刀光沿路径迅速挥出，雷击以离散闪光呈现，火车先入场再持续蒸汽", () => {
  const slash = cinemaScore("slash", 1800).find((t) => t.role === "draw")!;
  expect(slash.drawable).toBe(true);
  expect(slash.parameters.ease).toBe("outExpo");
  expect(Number(slash.parameters.duration)).toBeLessThan(500);
  expect(
    cinemaScore("lightning", 10000).find((t) => t.role === "bolt")!.parameters
      .keyframes,
  ).toBeInstanceOf(Array);
  const train = cinemaScore("train", 10000);
  expect(train.find((t) => t.role === "train")!.parameters.loop).not.toBe(true);
  expect(train.find((t) => t.role === "smoke")!.parameters.loop).toBe(true);
});
it("短演出压缩入场时间，花瓣和发牌依次展开，所有动画使用外部时钟", () => {
  for (const scene of ["bloom", "cards"] as const) {
    const score = cinemaScore(scene, 1000);
    expect(score.some((t) => t.stagger > 0)).toBe(true);
    expect(score.every((t) => t.at < 1000)).toBe(true);
    expect(score.every((t) => t.parameters.autoplay !== true)).toBe(true);
  }
});
