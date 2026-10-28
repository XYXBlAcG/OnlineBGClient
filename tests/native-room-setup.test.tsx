import React from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(() => {}),
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: native.invoke,
  isTauri: () => true,
}));
vi.mock("@tauri-apps/api/event", () => ({ listen: native.listen }));
import { RoomSetup } from "../src/client/RoomSetup";
import { CommandRegistry } from "../src/client/commands";
import { Room } from "../src/domain/room";
it("opens the native room setup through its shared command and unregisters on unmount", async () => {
  const room = new Room("menu", {
    kind: "uno",
    humans: 1,
    ai: [{ name: "AI", difficulty: "normal" }],
    team: false,
    training: false,
  });
  const token = room.claim("房主"),
    registry = new CommandRegistry();
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <RoomSetup
        snapshot={room.snapshot(token)}
        registry={registry}
        binding="Meta+Shift+G"
        onApply={() => {}}
        onError={() => {}}
      />,
    );
  });
  expect(
    registry.list().find((command) => command.id === "room.setup")?.binding,
  ).toBe("Meta+Shift+G");
  await act(async () =>
    registry
      .list()
      .find((command) => command.id === "room.setup")!
      .run(),
  );
  expect(native.invoke).toHaveBeenCalledWith(
    "present_auxiliary",
    expect.objectContaining({
      view: "roomsetup",
      focus: true,
      payload: expect.objectContaining({ view: "roomsetup" }),
    }),
  );
  await act(async () => tree.unmount());
  expect(registry.list()).toEqual([]);
});
