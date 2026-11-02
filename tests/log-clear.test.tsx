import React from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi, beforeEach } from "vitest";
const native = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: native.invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeTextFile: vi.fn() }));
import { DiagnosticsSettings } from "../src/client/DiagnosticsSettings";
beforeEach(() => native.invoke.mockReset());
it("清空原生日志成功后清空显示并提示；不再显示旧日志", async () => {
  native.invoke
    .mockResolvedValueOnce(
      '{"atMs":1,"level":"INFO","source":"test","message":"old log"}',
    )
    .mockResolvedValueOnce(undefined);
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<DiagnosticsSettings />);
  });
  expect(tree.root.findByType("textarea").props.value).toContain("old log");
  const button = tree.root
    .findAllByType("button")
    .find((b) => b.props.children === "清空日志");
  expect(button).toBeDefined();
  await act(async () => {
    await button!.props.onClick();
  });
  expect(native.invoke).toHaveBeenLastCalledWith("clear_application_logs");
  expect(tree.root.findByType("textarea").props.value).toBe("暂无日志");
  expect(tree.root.findByProps({ role: "status" }).children.join("")).toContain(
    "已清空",
  );
  act(() => tree.unmount());
});
it("清空失败保留原日志并报告错误", async () => {
  native.invoke
    .mockResolvedValueOnce("old log")
    .mockRejectedValueOnce(Error("cannot truncate"));
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<DiagnosticsSettings />);
  });
  const button = tree.root
    .findAllByType("button")
    .find((b) => b.props.children === "清空日志");
  expect(button).toBeDefined();
  await act(async () => {
    await button!.props.onClick();
  });
  expect(tree.root.findByType("textarea").props.value).toBe("old log");
  expect(tree.root.findByProps({ role: "alert" }).children.join("")).toContain(
    "cannot truncate",
  );
  act(() => tree.unmount());
});
