import { expect, it } from "vitest";
import { FrameGate } from "../src/client/motion/frame-gate";
it("60 Hz 时间戳的小幅抖动不让 60 帧限制变成隔帧渲染", () => {
  const gate = new FrameGate();
  let drawn = 0;
  for (let i = 0; i < 120; i++)
    if (gate.take((i * 1000) / 60 + Math.sin(i) * 0.15, 60)) drawn++;
  expect(drawn).toBeGreaterThanOrEqual(118);
});
it("高刷新率上按预算取帧，恢复前台不追赶旧帧，不限帧不节流", () => {
  const gate = new FrameGate();
  let drawn = 0;
  for (let i = 0; i < 288; i++) if (gate.take((i * 1000) / 144, 30)) drawn++;
  expect(drawn).toBeGreaterThanOrEqual(59);
  expect(drawn).toBeLessThanOrEqual(61);
  expect(gate.take(100000, 30)).toBe(true);
  expect(gate.take(100001, 30)).toBe(false);
  expect(gate.take(100002, 0)).toBe(true);
  expect(gate.take(100003, 0)).toBe(true);
});
