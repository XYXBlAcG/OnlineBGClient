import React from "react";
import { expect, it } from "vitest";
import { RoomToolbar } from "../src/client/RoomToolbar";
import { Room } from "../src/domain/room";
import { CommandRegistry } from "../src/client/commands";
import { defaultPreferences } from "../src/client/preferences";
it("preserves game shortcut registration while the room menu is closed", async () => {
  const { create, act } = await import("react-test-renderer");
  const { vi } = await import("vitest");
  const room = new Room("keys", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
  });
  const token = room.claim("我");
  room.start(token);
  const registry = new CommandRegistry();
  vi.stubGlobal("document", { querySelector: () => null });
  let tree: ReturnType<typeof create>;
  try {
    act(() => {
      tree = create(
        <RoomToolbar
          snapshot={room.snapshot(token)}
          mobile={false}
          focused={false}
          onFocus={() => {}}
          preferences={defaultPreferences}
          onTheme={() => {}}
          network={false}
          invite={() => {}}
          inviteCopied={false}
          onInvite={() => {}}
          send={() => {}}
          onError={() => {}}
          act={() => {}}
          registry={registry}
          pending={false}
          guideAvailable={false}
          guideShown={false}
          onGuide={() => {}}
        />,
      );
    });
    expect(registry.list().map((command) => command.id)).toContain(
      "uno.actions",
    );
    act(() => tree!.unmount());
    expect(registry.list()).toHaveLength(0);
  } finally {
    vi.unstubAllGlobals();
  }
});
