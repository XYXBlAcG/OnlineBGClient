import { expect, it, vi } from "vitest";
import { TableAnimator } from "../src/client/motion/table-animator";
import { sampleTable } from "../src/client/motion/table-sample";

it("refreshes artwork and bounds together after layout settles without losing source opacity", () => {
  let frame: FrameRequestCallback | undefined;
  let bounds = { x: 20, y: 20, width: 20, height: 20 } as DOMRect;
  class Tile {
    style = { opacity: "0.65" } as CSSStyleDeclaration;
    offsetWidth = 20;
    getBoundingClientRect() {
      return bounds;
    }
    closest(selector: string) {
      return selector.includes(".uno-list") ? this : null;
    }
    getAttribute(name: string) {
      return name === "data-motion-key" ? "tile" : null;
    }
    removeAttribute() {}
    querySelectorAll() {
      return [];
    }
    cloneNode() {
      return new Tile();
    }
  }
  vi.stubGlobal("SVGGraphicsElement", class {});
  vi.stubGlobal("SVGElement", class {});
  vi.stubGlobal("HTMLElement", Tile);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  try {
    const tile = new Tile();
    const surface = { querySelectorAll: () => [tile] } as unknown as Element;
    const current = sampleTable(surface);
    const settled = { x: 40, y: 40, width: 40, height: 40 } as DOMRect;
    const previous = [{ ...current[0], bounds: settled }];
    const animator = new TableAnimator(surface, previous, current, 1);
    animator.play([], []);
    expect(tile.style.opacity).toBe("0");
    bounds = settled;
    frame!(0);
    expect(current[0].bounds).toBe(settled);
    expect((current[0].copy as HTMLElement).style.transform).toBe("scale(2)");
    expect(tile.style.opacity).toBe("0.65");
    animator.cancel();
    expect(tile.style.opacity).toBe("0.65");
  } finally {
    vi.unstubAllGlobals();
  }
});
