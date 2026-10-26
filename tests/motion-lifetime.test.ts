import { expect, it, vi } from "vitest";
import { MotionLifetime } from "../src/client/motion/motion-lifetime";
it("lets effects survive a following action while enforcing a bounded live budget and cleanup", () => {
  vi.useFakeTimers();
  try {
    const lifetime = new MotionLifetime(2),
      a = { cancel: vi.fn() },
      b = { cancel: vi.fn() },
      c = { cancel: vi.fn() };
    lifetime.keep(a, 500);
    lifetime.keep(b, 700);
    expect(a.cancel).not.toHaveBeenCalled();
    lifetime.keep(c, 900);
    expect(a.cancel).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(750);
    expect(b.cancel).toHaveBeenCalledTimes(1);
    expect(c.cancel).not.toHaveBeenCalled();
    lifetime.clear();
    expect(c.cancel).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
