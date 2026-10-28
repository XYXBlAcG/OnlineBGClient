import { bannerContrast } from "../src/client/social/banner-color";
import React from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { formatBinding, CommandRegistry } from "../src/client/commands";
import { KeyBindingEditor } from "../src/client/KeyBindingEditor";
import { parseChatCommand, withDefaultBannerColor } from "../src/domain/banner";
import { motionPolicy } from "../src/client/motion-policy";
import { outputChoice } from "../src/client/voice/audio-output";
import {
  voiceEffectSchema,
  effectParameters,
} from "../src/domain/voice-effects";
it("uses platform display names while keeping canonical bindings dispatchable", () => {
  expect(formatBinding("Meta+Shift+M", "MacIntel")).toBe("⌘⇧M");
  expect(formatBinding("Control+Alt+Enter", "Win32")).toBe("Ctrl+Alt+Enter");
  const registry = new CommandRegistry();
  const run = vi.fn();
  registry.register({
    id: "a",
    title: "a",
    scope: "global",
    binding: "Meta+M",
    enabled: () => true,
    run,
  });
  registry.bind("a", "Meta+Shift+J");
  expect(
    registry.dispatch(
      {
        key: "j",
        metaKey: true,
        shiftKey: true,
        altKey: false,
        ctrlKey: false,
        repeat: false,
        isComposing: false,
        editing: false,
      },
      "uno",
    ),
  ).toBe(true);
  expect(run).toHaveBeenCalledOnce();
});
it("arms explicit key recording, saves a canonical chord, and reports conflicts", async () => {
  const bind = vi.fn();
  const commands = [
    {
      id: "a",
      title: "A",
      scope: "global",
      binding: "F1",
      enabled: () => true,
      run: () => {},
    },
    {
      id: "b",
      title: "B",
      scope: "global",
      binding: "F2",
      enabled: () => true,
      run: () => {},
    },
  ];
  let tree: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <KeyBindingEditor
        command={commands[0]}
        commands={commands}
        onBind={bind}
      />,
    );
  });
  const button = () => tree!.root.findByProps({ className: "key-binding" });
  act(() => button().props.onClick());
  const event = (key: string) => ({
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    nativeEvent: { isComposing: false },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  });
  act(() => button().props.onKeyDownCapture(event("F2")));
  expect(bind).not.toHaveBeenCalled();
  expect(JSON.stringify(tree!.toJSON())).toContain("冲突");
  act(() => button().props.onKeyDownCapture(event("F3")));
  expect(bind).toHaveBeenCalledWith("a", "F3");
  act(() => tree!.unmount());
});
it("uses explicit or sender-default banner colors without changing ordinary chat", () => {
  expect(
    parseChatCommand(withDefaultBannerColor("/title 好牌", "#22aaff")),
  ).toMatchObject({ kind: "title", text: "好牌", color: "#22aaff" });
  expect(withDefaultBannerColor("你好", "#22aaff")).toBe("你好");
  expect(
    parseChatCommand(
      withDefaultBannerColor("/title --style red 反击", "#22aaff"),
    ),
  ).toMatchObject({ style: "red" });
  expect(() =>
    parseChatCommand("/title --color javascript:red 你好"),
  ).toThrow();
  expect(parseChatCommand("/countdown --color #ff8800 3 准备")).toMatchObject({
    seconds: 3,
    color: "#ff8800",
  });
});
it("keeps social animation independent of both game animation choices", () => {
  for (const motion of [false, true])
    for (const enhancedGameMotion of [false, true])
      expect(
        motionPolicy({ motion, enhancedGameMotion }, false, true).social,
      ).toBe(true);
  expect(
    motionPolicy({ motion: true, enhancedGameMotion: true }, true, true).social,
  ).toBe(false);
});
it("never switches default output or an unsupported platform, including stale saved device IDs", () => {
  expect(outputChoice("default", true)).toBe(null);
  expect(outputChoice("old-device", false)).toBe(null);
  expect(outputChoice("headphones", true)).toBe("headphones");
});
it("defines neutral, octave and helium transformations with bounded intensity", () => {
  expect(effectParameters(voiceEffectSchema.parse({})).semitones).toBe(0);
  expect(
    effectParameters(voiceEffectSchema.parse({ preset: "octave-up" }))
      .semitones,
  ).toBe(12);
  expect(
    effectParameters(voiceEffectSchema.parse({ preset: "octave-down" }))
      .semitones,
  ).toBe(-12);
  expect(
    effectParameters(voiceEffectSchema.parse({ preset: "helium" })).filter,
  ).toBe("highshelf");
  expect(() => voiceEffectSchema.parse({ amount: 2 })).toThrow();
});
it("publishes immutable command snapshots so native settings receive registration and binding updates", () => {
  const registry = new CommandRegistry(),
    changed = vi.fn();
  const stop = registry.subscribe(changed);
  const dispose = registry.register({
    id: "game.action",
    title: "出牌",
    scope: "uno",
    binding: "Enter",
    enabled: () => true,
    run: () => {},
  });
  const previous = registry.list();
  registry.bind("game.action", "Meta+Enter");
  expect(previous[0].binding).toBe("Enter");
  expect(registry.list()[0].binding).toBe("Meta+Enter");
  expect(changed).toHaveBeenCalledTimes(2);
  dispose();
  expect(registry.list()).toEqual([]);
  stop();
  expect(outputChoice("default", true, "headphones")).toBe("default");
});

it("gives dark and bright custom banner text contrasting outlines", () => {
  expect(bannerContrast("#000000")).toBe("#ffffff");
  expect(bannerContrast("#ffffff")).toBe("#252532");
});
