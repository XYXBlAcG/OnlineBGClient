import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: native.invoke,
  isTauri: () => false,
}));
import { useWindowReady } from "../src/client/native/windows";
import type { AuxiliaryFrame } from "../src/client/native/contract";
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
it("acknowledges only committed visible ready content, using the exact revision without waiting for hidden-window animation frames", async () => {
  const layout = vi.fn();
  let background = "#17191e";
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: () => background,
  }));
  vi.stubGlobal("document", {
    querySelector: () => ({ getBoundingClientRect: layout }),
  });
  const onError = vi.fn();
  function Harness({
    frame,
    ready,
  }: {
    frame: AuxiliaryFrame;
    ready: boolean;
  }) {
    useWindowReady(frame, ready, onError);
    return null;
  }
  const frame: AuxiliaryFrame = {
    revision: 1,
    visible: true,
    payload: { view: "records" },
  };
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<Harness frame={frame} ready={false} />);
  });
  expect(native.invoke).not.toHaveBeenCalled();
  await act(async () => tree.update(<Harness frame={frame} ready />));
  expect(native.invoke).toHaveBeenCalledWith("auxiliary_ready", {
    view: "records",
    revision: 1,
    background: "#17191e",
  });
  expect(layout).toHaveBeenCalledOnce();
  await act(async () =>
    tree.update(
      <Harness frame={{ ...frame, revision: 2, visible: false }} ready />,
    ),
  );
  expect(native.invoke).toHaveBeenCalledTimes(1);
  background = "#1234";
  await act(async () =>
    tree.update(<Harness frame={{ ...frame, revision: 3 }} ready />),
  );
  expect(native.invoke).toHaveBeenLastCalledWith("auxiliary_ready", {
    view: "records",
    revision: 3,
    background: "#11223344",
  });
  await act(async () => tree.unmount());
});
