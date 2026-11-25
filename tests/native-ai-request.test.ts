import { afterEach, expect, it, vi } from "vitest";
import { defaultAiProviderSettings } from "../src/domain/companion";
const mocks = vi.hoisted(() => ({ listen: vi.fn(), send: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen: mocks.listen }));
vi.mock("../src/client/native/windows", () => ({ sendAuxiliary: mocks.send }));
import { requestAiWindow } from "../src/client/native/ai-request";
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
it.each([true, false])(
  "settles only the matching native acknowledgement (ok=%s)",
  async (ok) => {
    const stop = vi.fn();
    let receive!: (event: {
      payload: { request: string; ok: boolean; message: string };
    }) => void;
    mocks.listen.mockImplementation(async (_name, listener) => {
      receive = listener;
      return stop;
    });
    const request = requestAiWindow({
      type: "ai-provider",
      config: { provider: defaultAiProviderSettings, apiKey: "" },
    });
    await vi.waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1));
    receive({ payload: { request: "unrelated", ok: true, message: "wrong" } });
    receive({
      payload: {
        request: mocks.send.mock.calls[0][0].request,
        ok,
        message: "confirmed",
      },
    });
    if (ok) await expect(request).resolves.toBe("confirmed");
    else await expect(request).rejects.toThrow("confirmed");
    expect(stop).toHaveBeenCalledTimes(1);
  },
);
it("disposes a listener registered after timeout without sending a stale request", async () => {
  vi.useFakeTimers();
  const stop = vi.fn();
  let register!: (stop: () => void) => void;
  mocks.listen.mockImplementation(
    () =>
      new Promise((resolve) => {
        register = resolve;
      }),
  );
  const pending = requestAiWindow({
    type: "ai-clear",
    provider: defaultAiProviderSettings,
  });
  const rejected = expect(pending).rejects.toThrow("超时");
  await vi.advanceTimersByTimeAsync(10000);
  await rejected;
  register(stop);
  await Promise.resolve();
  expect(stop).toHaveBeenCalledTimes(1);
  expect(mocks.send).not.toHaveBeenCalled();
});
