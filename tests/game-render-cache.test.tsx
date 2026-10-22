import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { OriginalGame } from "../src/client/OriginalGame";
import { Room } from "../src/domain/room";
import { UpstreamRuntime } from "../src/upstream/runtime";

it("retains an isolated upstream view across non-game updates and replaces it for moves", () => {
  const room = new Room("render", {
    kind: "uno",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const owner = room.claim("甲"),
    other = room.claim("乙");
  room.setReady(other, true);
  room.start(owner);
  let snapshot = room.snapshot(owner);
  const views: unknown[] = [];
  const Table = ({ view }: { view: unknown }) => {
    views.push(view);
    return null;
  };
  const load = UpstreamRuntime.prototype.load;
  const loader = vi
    .spyOn(UpstreamRuntime.prototype, "load")
    .mockImplementation(function (this: UpstreamRuntime, id) {
      return id === 7707 ? { default: Table } : load.call(this, id);
    });
  const clone = vi.spyOn(globalThis, "structuredClone");
  let renderer: ReactTestRenderer | undefined;
  const send = () => {};
  try {
    act(() => {
      renderer = create(
        <OriginalGame snapshot={snapshot} act={send} end={send} />,
      );
    });
    expect(clone).toHaveBeenCalledTimes(1);
    expect(views[0]).toEqual(snapshot.state!.view);
    expect(views[0]).not.toBe(snapshot.state!.view);
    clone.mockClear();
    room.chat(other, "chat", "你好");
    snapshot = room.snapshot(owner);
    act(() => {
      renderer!.update(
        <OriginalGame snapshot={snapshot} act={send} end={send} />,
      );
    });
    expect(clone).not.toHaveBeenCalled();
    expect(views.at(-1)).toBe(views[0]);
    room.act(owner, "move", snapshot.version, snapshot.candidates[0].action);
    snapshot = room.snapshot(owner);
    clone.mockClear();
    act(() => {
      renderer!.update(
        <OriginalGame snapshot={snapshot} act={send} end={send} />,
      );
    });
    expect(clone).toHaveBeenCalledTimes(1);
    expect(views.at(-1)).not.toBe(views[0]);
    expect(views.at(-1)).not.toBe(snapshot.state!.view);
    expect(views.at(-1)).toEqual(snapshot.state!.view);
  } finally {
    act(() => renderer?.unmount());
    clone.mockRestore();
    loader.mockRestore();
  }
});
