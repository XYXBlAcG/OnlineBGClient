import "fake-indexeddb/auto";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { RunShelf } from "../src/client/expedition/RunShelf";
import { ClientStore, type RunLink } from "../src/client/storage";

it("shows a loading and empty state for the native run library", async () => {
  let view: ReactTestRenderer;
  act(() => {
    view = create(
      <RunShelf showEmpty onRestore={() => {}} onAbandon={async () => {}} />,
    );
  });
  try {
    expect(JSON.stringify(view!.toJSON())).toContain("正在读取远征");
    await vi.waitFor(() =>
      expect(JSON.stringify(view!.toJSON())).toContain("没有待继续的远征"),
    );
  } finally {
    act(() => view!.unmount());
  }
});

it("reads saved local runs without changing their storage or identity", async () => {
  const store = new ClientStore();
  const link: RunLink = {
    id: "native-run-test",
    token: "identity",
    room: "local-room",
    endpoint: null,
    hosted: false,
    updated: 1,
    names: ["远征玩家"],
    floor: 3,
  };
  await store.linkRun(link);
  let view: ReactTestRenderer;
  act(() => {
    view = create(
      <RunShelf showEmpty onRestore={() => {}} onAbandon={async () => {}} />,
    );
  });
  try {
    await vi.waitFor(() =>
      expect(JSON.stringify(view!.toJSON())).toContain("远征玩家"),
    );
    expect(
      (await new ClientStore().runLinks()).find(
        (saved) => saved.id === link.id,
      ),
    ).toEqual(link);
  } finally {
    act(() => view!.unmount());
    await store.abandonRun(link.id);
  }
});
