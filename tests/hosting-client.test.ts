import { expect, it, vi } from "vitest";
import { defaultPreferences } from "../src/client/preferences";
import { startHosting } from "../src/client/start-hosting";
const calls = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke: calls }));
it("开房分别保留对外邀请和本机连接地址，局域网请求不依赖公网", async () => {
  calls
    .mockResolvedValueOnce("http://192.168.1.4:40400")
    .mockResolvedValueOnce("http://127.0.0.1:40400");
  const result = await startHosting(defaultPreferences.network, true);
  expect(result).toEqual({
    invitation: "http://192.168.1.4:40400",
    endpoint: "http://127.0.0.1:40400",
  });
  expect(calls).toHaveBeenNthCalledWith(1, "start_host", {
    lan: true,
    proxy: "http://127.0.0.1:7897",
  });
  expect(calls).toHaveBeenNthCalledWith(2, "host_endpoint");
});
