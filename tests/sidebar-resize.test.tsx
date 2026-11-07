import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { SidebarDivider } from "../src/client/SidebarDivider";

afterEach(() => vi.unstubAllGlobals());

it("previews sidebar width without rerendering and commits once on release", () => {
  vi.stubGlobal("innerWidth", 1400);
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const style = { setProperty: vi.fn() };
  const layout = { style, dataset: {} as Record<string, string> };
  const node = {
    focus: vi.fn(),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    setAttribute: vi.fn(),
    closest: () => layout,
    style,
  };
  const onChange = vi.fn();
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<SidebarDivider width={320} onChange={onChange} />, {
      createNodeMock: (element) => (element.type === "div" ? node : null),
    });
  });
  const divider = tree.root.findByType("div");
  const event = (clientX: number) => ({
    button: 0,
    clientX,
    pointerId: 1,
    currentTarget: node,
    preventDefault: vi.fn(),
  });
  act(() => divider.props.onPointerDown(event(500)));
  expect(layout.dataset.resizing).toBe("true");
  act(() => divider.props.onPointerMove(event(450)));
  expect(onChange).not.toHaveBeenCalled();
  act(() => frames.shift()!(0));
  expect(style.setProperty).toHaveBeenLastCalledWith("--chat-width", "370px");
  act(() => divider.props.onPointerUp(event(450)));
  expect(onChange).toHaveBeenCalledOnce();
  expect(onChange).toHaveBeenCalledWith(370);
  expect(layout.dataset.resizing).toBeUndefined();
  act(() => tree.unmount());
});
