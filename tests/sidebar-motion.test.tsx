import React from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { AnimatedSidebar } from "../src/client/AnimatedSidebar";
it("聊天关闭时保留最后内容直到动画结束，重新打开取消退出；关闭动画时立即隐藏", async () => {
  const running: { resolve: () => void; cancel: ReturnType<typeof vi.fn> }[] =
    [];
  const node = {
    inert: false,
    animate: vi.fn(() => {
      let resolve!: () => void;
      const finished = new Promise<void>((done) => {
        resolve = done;
      });
      const animation = { finished, cancel: vi.fn() };
      running.push({ resolve, cancel: animation.cancel });
      return animation;
    }),
  };
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <AnimatedSidebar open animated mobile>
        <p>消息</p>
      </AnimatedSidebar>,
      { createNodeMock: () => node },
    );
  });
  act(() =>
    tree.update(
      <AnimatedSidebar open={false} animated mobile>
        <p>隐藏占位</p>
      </AnimatedSidebar>,
    ),
  );
  expect(tree.root.findByType("aside").props.hidden).toBe(false);
  expect(tree.root.findByType("p").children).toEqual(["消息"]);
  expect(node.inert).toBe(true);
  const closing = running.at(-1)!;
  act(() =>
    tree.update(
      <AnimatedSidebar open animated mobile>
        <p>新消息</p>
      </AnimatedSidebar>,
    ),
  );
  await act(async () => closing.resolve());
  expect(closing.cancel).toHaveBeenCalled();
  expect(tree.root.findByType("aside").props.hidden).toBe(false);
  act(() =>
    tree.update(
      <AnimatedSidebar open={false} animated mobile>
        <p>关闭</p>
      </AnimatedSidebar>,
    ),
  );
  await act(async () => running.at(-1)!.resolve());
  expect(tree.root.findByType("aside").props.hidden).toBe(true);
  expect(tree.root.findByType("p").children).toEqual(["关闭"]);
  act(() =>
    tree.update(
      <AnimatedSidebar open animated={false} mobile>
        <p>消息</p>
      </AnimatedSidebar>,
    ),
  );
  act(() =>
    tree.update(
      <AnimatedSidebar open={false} animated={false} mobile>
        <p>关闭</p>
      </AnimatedSidebar>,
    ),
  );
  expect(tree.root.findByType("aside").props.hidden).toBe(true);
  act(() => tree.unmount());
});
