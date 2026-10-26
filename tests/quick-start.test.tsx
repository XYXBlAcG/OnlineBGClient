import React from "react";
import { act, create } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { QuickStart } from "../src/client/QuickStart";
import { VoiceSetupGuide } from "../src/client/voice/VoiceSetupGuide";
import { preferencesSchema } from "../src/client/preferences";

it("keeps first-run guidance enabled for existing preferences without enabling audio", () => {
  expect(preferencesSchema.parse({}).quickStartOpen).toBe(true);
  const html = renderToStaticMarkup(
    <QuickStart
      desktop
      expanded
      onExpandedChange={() => {}}
      onVoiceSettings={() => {}}
    />,
  );
  expect(html).toContain("邀请链接");
  expect(html).toContain("连麦设置");
  expect(html).not.toContain("<audio");
});
it("routes the lobby shortcut directly to settings and remembers the user's collapse choice through preferences", () => {
  const settings = vi.fn(),
    expand = vi.fn();
  let tree: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <QuickStart
        desktop
        expanded
        onExpandedChange={expand}
        onVoiceSettings={settings}
      />,
    );
  });
  const buttons = tree!.root.findAllByType("button");
  act(() =>
    buttons
      .find((button) => button.props.children === "连麦设置")!
      .props.onClick(),
  );
  expect(settings).toHaveBeenCalledOnce();
  act(() =>
    buttons
      .find((button) => button.props["aria-expanded"] === true)!
      .props.onClick(),
  );
  expect(expand).toHaveBeenCalledWith(false);
  act(() => tree!.unmount());
});
it("distinguishes host setup from guest joining, and exposes the real configuration action", () => {
  const configure = vi.fn();
  let tree: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <VoiceSetupGuide configured={false} onConfigure={configure} />,
    );
  });
  const html = renderToStaticMarkup(
    <VoiceSetupGuide configured={false} onConfigure={() => {}} />,
  );
  expect(html).toContain("其他玩家不用填写");
  expect(html).toContain("重新创建");
  expect(html).toContain("默认静音");
  act(() =>
    tree!.root
      .findAllByType("button")
      .find((b) => b.props.children === "配置房主语音")!
      .props.onClick(),
  );
  expect(configure).toHaveBeenCalledOnce();
  act(() => tree!.unmount());
});
it("does not advertise browser voice or hide game instructions when collapsed", () => {
  const html = renderToStaticMarkup(
    <QuickStart
      desktop={false}
      expanded={false}
      onExpandedChange={() => {}}
      onVoiceSettings={() => {}}
    />,
  );
  expect(html).toContain("快速上手");
  expect(html).not.toContain("连麦设置");
});
