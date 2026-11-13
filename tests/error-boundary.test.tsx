import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";

const { recordClientLog } = vi.hoisted(() => ({ recordClientLog: vi.fn() }));
vi.mock("../src/client/diagnostics", () => ({ recordClientLog }));

import { ErrorBoundary } from "../src/client/ui/ErrorBoundary";

let shouldThrow = true;

function Flaky() {
  if (shouldThrow) throw new Error("牌桌渲染失败");
  return <p>已恢复</p>;
}

it("catches a render failure and recovers without reloading the app", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ErrorBoundary scope="game">
        <Flaky />
      </ErrorBoundary>,
    );
  });
  expect(tree.root.findByProps({ role: "alert" })).toBeTruthy();
  expect(recordClientLog).toHaveBeenCalledWith(
    "render",
    expect.stringContaining("牌桌渲染失败"),
  );
  shouldThrow = false;
  act(() => {
    tree.root.findByType("button").props.onClick();
  });
  expect(tree.root.findByType("p").props.children).toBe("已恢复");
  error.mockRestore();
});
