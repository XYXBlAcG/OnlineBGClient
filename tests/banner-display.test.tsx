import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BannerLayer } from "../src/client/social/BannerLayer";
import { defaultPreferences } from "../src/client/preferences";
import type { ChatMessage } from "../src/domain/social";
vi.mock("../src/client/use-motion", () => ({
  useMotion: (enabled: boolean) => enabled,
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const message = (sequence: number, time = 500000): ChatMessage => ({
  id: String(sequence),
  sequence,
  time,
  name: "甲",
  sender: "guest",
  type: "banner",
  text: "好牌",
  banner: { kind: "title", text: "好牌" },
});
it("uses authority time across clock differences and does not replay after local re-enabling", () => {
  const messages = [message(1)];
  let tree: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <BannerLayer
        inline
        room="room"
        serverTime={500000}
        messages={messages}
        preferences={defaultPreferences}
      />,
    );
  });
  expect(tree!.root.findAllByProps({ role: "status" })).toHaveLength(1);
  act(() =>
    tree!.update(
      <BannerLayer
        inline
        room="room"
        serverTime={500000}
        messages={messages}
        preferences={{ ...defaultPreferences, bannerDisplay: false }}
      />,
    ),
  );
  expect(tree!.root.findAllByProps({ role: "status" })).toHaveLength(0);
  act(() =>
    tree!.update(
      <BannerLayer
        inline
        room="room"
        serverTime={500000}
        messages={messages}
        preferences={defaultPreferences}
      />,
    ),
  );
  expect(tree!.root.findAllByProps({ role: "status" })).toHaveLength(0);
  act(() => tree!.unmount());
});
it("drops expired messages and bounds a simultaneous queue", () => {
  let tree: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <BannerLayer
        inline
        room="room"
        serverTime={500000}
        messages={[
          message(1, 400000),
          message(2),
          message(3),
          message(4),
          message(5),
        ]}
        preferences={defaultPreferences}
      />,
    );
  });
  expect(tree!.root.findAllByProps({ role: "status" })).toHaveLength(1);
  act(() => {
    vi.advanceTimersByTime(2500);
  });
  act(() => {
    vi.advanceTimersByTime(2500);
  });
  act(() => {
    vi.advanceTimersByTime(2500);
  });
  expect(tree!.root.findAllByProps({ role: "status" })).toHaveLength(0);
  act(() => tree!.unmount());
});
it("counts down against authority time and stops all active effects on a host clear", () => {
  let tree: ReturnType<typeof create>;
  const countdown: ChatMessage = {
    ...message(1),
    banner: { kind: "countdown", seconds: 3, text: "开局" },
  } as ChatMessage;
  act(() => {
    tree = create(
      <BannerLayer
        inline
        room="timer"
        serverTime={500000}
        messages={[countdown]}
        preferences={defaultPreferences}
      />,
    );
  });
  expect(
    tree!.root.findByProps({ className: "banner-count" }).children,
  ).toEqual(["3"]);
  act(() => {
    vi.advanceTimersByTime(1100);
  });
  expect(
    tree!.root.findByProps({ className: "banner-count" }).children,
  ).toEqual(["2"]);
  const clear: ChatMessage = {
    id: "clear",
    sequence: 2,
    sender: "host",
    name: "房主",
    time: 501100,
    type: "clear",
    text: "清除了横幅",
  };
  act(() =>
    tree!.update(
      <BannerLayer
        inline
        room="timer"
        serverTime={501100}
        messages={[countdown, clear]}
        preferences={defaultPreferences}
      />,
    ),
  );
  expect(tree!.root.findAllByProps({ role: "status" })).toHaveLength(0);
  act(() => tree!.unmount());
  expect(vi.getTimerCount()).toBe(0);
});
