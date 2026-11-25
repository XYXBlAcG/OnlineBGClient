import { expect, it, vi } from "vitest";
import {
  AiProviderSession,
  type AiHostContext,
} from "../src/client/ai/provider-session";
import { aiProviderSettingsSchema } from "../src/domain/companion";
import { isLoopbackEndpoint } from "../src/domain/ai-connection";
const provider = aiProviderSettingsSchema.parse({ model: "test" });
const config = { provider, apiKey: "" };
it("accepts only literal loopback hosts", () => {
  expect(isLoopbackEndpoint("http://127.0.0.1:8787")).toBe(true);
  for (const url of [
    "https://127.0.0.1.attacker.test",
    "https://remote.test",
    "file:///tmp",
    "http://user@localhost",
  ])
    expect(isLoopbackEndpoint(url)).toBe(false);
});
it("never reads or transmits a saved key just because a remote server reports host authority", async () => {
  const send = vi.fn();
  const keys = {
    migrate: vi.fn(async () => {}),
    load: vi.fn(async () => "secret"),
    save: vi.fn(),
    clear: vi.fn(),
    provider: () => provider,
    saveProvider: vi.fn(),
  };
  const current: AiHostContext = {
    connection: { send, close() {} },
    session: { room: "a", token: "a" },
    canManage: true,
    trusted: false,
  };
  const ai = new AiProviderSession(() => current, keys);
  await ai.sync();
  expect(keys.load).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  await expect(ai.test(config)).rejects.toThrow("本机");
});
it("does not send a key to a changed connection after an asynchronous vault read", async () => {
  const send = vi.fn();
  let finish!: (key: string) => void;
  let current: AiHostContext = {
    connection: { send, close() {} },
    session: { room: "a", token: "a" },
    canManage: true,
    trusted: true,
  };
  const keys = {
    migrate: vi.fn(async () => {}),
    load: () =>
      new Promise<string>((done) => {
        finish = done;
      }),
    save: vi.fn(),
    clear: vi.fn(),
    provider: () => provider,
    saveProvider: vi.fn(),
  };
  const ai = new AiProviderSession(() => current, keys);
  const pending = ai.sync();
  await Promise.resolve();
  current = {
    ...current,
    connection: { send: vi.fn(), close() {} },
    trusted: false,
  };
  finish("secret");
  await pending;
  expect(send).not.toHaveBeenCalled();
});
it("waits for matching host acknowledgements and rejects pending work on disconnect", async () => {
  const send = vi.fn();
  const current: AiHostContext = {
    connection: { send, close() {} },
    session: { room: "a", token: "a" },
    canManage: true,
    trusted: true,
  };
  const keys = {
    migrate: vi.fn(async () => {}),
    load: vi.fn(async () => "synthetic"),
    save: vi.fn(),
    clear: vi.fn(),
    provider: () => provider,
    saveProvider: vi.fn(),
  };
  const ai = new AiProviderSession(() => current, keys);
  const pending = ai.test(config);
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  const requestId = send.mock.calls[0][0].requestId;
  ai.receive({
    type: "ai-test",
    requestId: "other",
    ok: true,
    message: "wrong",
  });
  ai.receive({ type: "ai-test", requestId, ok: false, message: "rejected" });
  await expect(pending).rejects.toThrow("rejected");
  const next = ai.test(config);
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  ai.reset();
  await expect(next).rejects.toThrow("断开");
});
