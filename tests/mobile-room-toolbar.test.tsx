import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Panel } from "../src/client/ui/Controls";
import { RoomToolbar } from "../src/client/RoomToolbar";
import { Room } from "../src/domain/room";
import { CommandRegistry } from "../src/client/commands";
import { defaultPreferences } from "../src/client/preferences";
it("keeps appearance and setup inside the closed menu and immersion out of the waiting room", () => {
  const room = new Room("test", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
  });
  const token = room.claim("我");
  const props = {
    snapshot: room.snapshot(token),
    mobile: true,
    focused: false,
    onFocus: () => {},
    preferences: defaultPreferences,
    onTheme: () => {},
    network: true,
    invite: () => {},
    inviteCopied: false,
    onInvite: () => {},
    send: () => {},
    onError: () => {},
    act: () => {},
    registry: new CommandRegistry(),
    pending: false,
    guideAvailable: true,
    guideShown: false,
    onGuide: () => {},
  };
  const html = renderToStaticMarkup(<RoomToolbar {...props} />);
  expect(html).toContain("房间菜单");
  expect(html).toContain("邀请");
  expect(html).not.toContain("沉浸牌桌");
  expect(html).not.toContain("外观主题");
  expect(html).not.toContain("新手引导");
  room.start(token);
  expect(
    renderToStaticMarkup(
      <RoomToolbar {...props} snapshot={room.snapshot(token)} />,
    ),
  ).toContain("沉浸牌桌");
});
it("exposes structured room identity independently from title layout and latency text", () => {
  const room = new Room("room-42", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
  });
  const token = room.claim("我");
  const html = renderToStaticMarkup(
    <RoomToolbar
      snapshot={room.snapshot(token)}
      mobile={false}
      focused={false}
      onFocus={() => {}}
      preferences={defaultPreferences}
      onTheme={() => {}}
      latency={360}
      network
      invite={() => {}}
      inviteCopied={false}
      onInvite={() => {}}
      send={() => {}}
      onError={() => {}}
      act={() => {}}
      registry={new CommandRegistry()}
      pending={false}
      guideAvailable={false}
      guideShown={false}
      onGuide={() => {}}
    />,
  );
  expect(html).toContain('aria-label="房间信息"');
  expect(html).toContain('data-room-id="room-42"');
  expect(html).toContain('aria-label="当前房间游戏"');
  expect(html).toContain('aria-label="网络往返延迟"');
});
it("reflects guide visibility in the mobile menu independently of its saved preference", async () => {
  const { act, create } = await import("react-test-renderer");
  const room = new Room("guide-menu", {
    kind: "ktd",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const token = room.claim("我");
  const onGuide = () => {};
  for (const guideShown of [false, true]) {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <RoomToolbar
          snapshot={room.snapshot(token)}
          mobile
          focused={false}
          onFocus={() => {}}
          preferences={{
            ...defaultPreferences,
            beginnerGuides: { ...defaultPreferences.beginnerGuides, ktd: true },
          }}
          onTheme={() => {}}
          network
          invite={() => {}}
          inviteCopied={false}
          onInvite={() => {}}
          send={() => {}}
          onError={() => {}}
          act={() => {}}
          registry={new CommandRegistry()}
          pending={false}
          guideAvailable
          guideShown={guideShown}
          onGuide={onGuide}
        />,
      );
    });
    try {
      const panel = renderer!.root
        .findAllByType(Panel)
        .find((panel) => panel.props.title === "房间菜单")!;
      const html = renderToStaticMarkup(panel.props.children);
      expect(html).toContain(
        `aria-pressed="${guideShown}">${guideShown ? "关闭新手引导" : "新手引导"}`,
      );
    } finally {
      act(() => renderer!.unmount());
    }
  }
});
