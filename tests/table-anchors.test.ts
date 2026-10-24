import { expect, it, vi } from "vitest";
import { TableAnchors } from "../src/client/motion/table-anchors";
it("follows layout changes throughout a card reveal and releases its frame loop", () => {
  const frames = new Map<number, FrameRequestCallback>();
  let serial = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++serial, callback);
    return serial;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  const anchors = new TableAnchors();
  const shell = { style: {} } as HTMLElement;
  let bounds = { x: 12, y: 40, width: 85, height: 132 };
  const target = { getBoundingClientRect: () => bounds } as Element;
  try {
    anchors.add(shell, target);
    for (const y of [40, 61.734375, 80]) {
      bounds = { ...bounds, y };
      const [id, frame] = [...frames][0];
      frames.delete(id);
      frame(0);
      expect(shell.style.top).toBe(`${y}px`);
      expect(frames.size).toBe(1);
    }
    anchors.delete(shell);
    expect(frames.size).toBe(0);
    anchors.add(shell, target);
    anchors.clear();
    expect(frames.size).toBe(0);
  } finally {
    anchors.clear();
    vi.unstubAllGlobals();
  }
});
