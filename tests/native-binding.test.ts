import { afterEach, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ listen: vi.fn(), invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen: native.listen }));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: native.invoke,
  isTauri: () => false,
}));
import { bindAuxiliary } from "../src/client/native/windows";
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
it("requires a matching successful main-window receipt before binding completes", async () => {
  let receive!: (event: {
    payload: { request: string; error?: string };
  }) => void;
  const stop = vi.fn();
  native.listen.mockImplementation(async (_event, handler) => {
    receive = handler;
    return stop;
  });
  native.invoke.mockResolvedValue(undefined);
  const saved = vi.fn();
  const result = bindAuxiliary("game.action", "F3").then(saved);
  await vi.waitFor(() => expect(native.invoke).toHaveBeenCalled());
  const request = native.invoke.mock.calls[0][1].intent.request;
  receive({ payload: { request: "other" } });
  await Promise.resolve();
  expect(saved).not.toHaveBeenCalled();
  receive({ payload: { request } });
  await result;
  expect(saved).toHaveBeenCalledOnce();
  expect(stop).toHaveBeenCalledOnce();
});
it("returns the main-window persistence error and releases its receipt listener", async () => {
  let receive!: (event: {
    payload: { request: string; error?: string };
  }) => void;
  const stop = vi.fn();
  native.listen.mockImplementation(async (_event, handler) => {
    receive = handler;
    return stop;
  });
  native.invoke.mockResolvedValue(undefined);
  const result = bindAuxiliary("game.action", "");
  const check = expect(result).rejects.toThrow("存储失败");
  await vi.waitFor(() => expect(native.invoke).toHaveBeenCalled());
  receive({
    payload: {
      request: native.invoke.mock.calls[0][1].intent.request,
      error: "存储失败",
    },
  });
  await check;
  expect(stop).toHaveBeenCalledOnce();
});
it("times out without a receipt instead of reporting success", async () => {
  vi.useFakeTimers();
  const stop = vi.fn();
  native.listen.mockResolvedValue(stop);
  native.invoke.mockResolvedValue(undefined);
  const result = bindAuxiliary("game.action", "F4");
  const check = expect(result).rejects.toThrow("保存超时");
  await vi.advanceTimersByTimeAsync(10000);
  await check;
  expect(stop).toHaveBeenCalledOnce();
});
