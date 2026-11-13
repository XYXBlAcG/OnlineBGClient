import { configSchema } from "../src/domain/protocol";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("../src/client/diagnostics", () => ({ recordClientLog: vi.fn() }));
import { NetworkConnection } from "../src/client/connection";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("retries a connection which never receives its authoritative snapshot and cancels deadlines on close", () => {
  vi.useFakeTimers();
  const instances: Socket[] = [];
  class Socket {
    static OPEN = 1;
    static CONNECTING = 0;
    readyState = 0;
    onclose?: (event: { code: number }) => void;
    close = vi.fn(() => {
      this.readyState = 3;
      this.onclose?.({ code: 1006 });
    });
    constructor(_url: URL) {
      instances.push(this);
    }
  }
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  const statuses: string[] = [];
  const connection = new NetworkConnection(
    "https://example.test",
    {
      type: "create",
      name: "test",
      config: configSchema.parse({
        kind: "uno",
        humans: 2,
        ai: [],
        team: false,
        training: false,
      }),
    },
    () => {},
    (s) => statuses.push(s),
  );
  vi.advanceTimersByTime(15000);
  expect(instances[0].close).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(1000);
  expect(instances).toHaveLength(2);
  connection.close();
  vi.advanceTimersByTime(60000);
  expect(instances).toHaveLength(2);
  expect(statuses).toContain("同步超时，正在重新连接");
});
