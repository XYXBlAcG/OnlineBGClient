import React from "react";
import { act, create } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("../src/client/party/PartyRuntime", () => ({
  PartyRuntime: () => null,
}));
import { Room } from "../src/domain/room";
import { RoomParty } from "../src/client/RoomParty";
import { Panel } from "../src/client/ui/Controls";
import { RoomToolbar } from "../src/client/RoomToolbar";
import { CommandRegistry } from "../src/client/commands";
import { defaultPreferences } from "../src/client/preferences";
afterEach(() => vi.unstubAllGlobals());
it("派对默认关闭，离场玩家获得旁观入口，整局结束后显示颁奖入口", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal("document", {
    visibilityState: "visible",
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    createElement: () => ({
      setAttribute: () => {},
      clientWidth: 16,
      getContext: () => null,
    }),
    body: { appendChild: () => {}, removeChild: () => {} },
  });
  const room = new Room("observer-ui", {
    kind: "uno",
    humans: 3,
    ai: [],
    team: false,
    training: false,
  });
  const tokens = ["甲", "乙", "丙"].map((n) => room.claim(n));
  tokens.slice(1).forEach((t) => room.setReady(t, true));
  room.start(tokens[0]);
  expect(
    renderToStaticMarkup(
      <RoomParty
        open={false}
        onOpenChange={() => {}}
        snapshot={room.snapshot(tokens[0])}
        onAction={() => {}}
      />,
    ),
  ).toBe("");
  room.partyAction(tokens[0], "on", { type: "enabled", enabled: true });
  if (room.state!.kind !== "uno") throw Error();
  room.state!.view.playerFinish[0] = 1;
  const toolbar = () => {
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(
        <RoomToolbar
          snapshot={room.snapshot(tokens[0])}
          mobile
          focused={false}
          onFocus={() => {}}
          preferences={defaultPreferences}
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
          guideAvailable={false}
          guideShown={false}
          onGuide={() => {}}
        />,
      );
    });
    const panel = tree.root
      .findAllByType(Panel)
      .find((item) => item.props.title === "房间菜单")!;
    const html = renderToStaticMarkup(panel.props.children);
    act(() => tree.unmount());
    return html;
  };
  expect(toolbar()).toContain("旁观互动");
  room.state!.view.isEnd = true;
  expect(toolbar()).toContain("颁奖");
});
