import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
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
    guideEnabled: false,
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
