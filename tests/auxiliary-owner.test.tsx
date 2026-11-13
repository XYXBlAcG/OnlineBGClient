import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: native.invoke,
  isTauri: () => true,
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));
vi.mock("../src/client/platform", () => ({
  capabilities: { auxiliaryWindows: true },
}));
vi.mock("../src/client/native/contract", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  auxiliaryView: "settings",
}));
import { useNativeWindow } from "../src/client/native/windows";
it("renders auxiliary content locally without republishing main-window state", async () => {
  let detached = true;
  function Harness() {
    detached = useNativeWindow("settings", true, { view: "about" }, () => {});
    return null;
  }
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<Harness />);
  });
  expect(detached).toBe(false);
  expect(native.invoke).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
});
