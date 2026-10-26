import { expect, it, vi } from "vitest";
import { TableAnchors } from "../src/client/motion/table-anchors";
it("freezes the last effect position when a confirmed phase change removes its target", () => {
  let callback: FrameRequestCallback | undefined;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((next: FrameRequestCallback) => {
      callback = next;
      return 1;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  try {
    const anchors = new TableAnchors(),
      shell = { style: {} } as HTMLElement,
      target = {
        isConnected: true,
        getBoundingClientRect: () => ({ x: 40, y: 50, width: 70, height: 80 }),
      } as unknown as Element;
    anchors.add(shell, target);
    callback!(0);
    expect(shell.style.left).toBe("40px");
    Object.assign(target, {
      isConnected: false,
      getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    });
    callback!(1);
    expect(shell.style.left).toBe("40px");
    anchors.clear();
  } finally {
    vi.unstubAllGlobals();
  }
});
