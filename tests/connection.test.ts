import { it, expect, vi } from "vitest";
import { WebSocketServer } from "ws";
import { NetworkConnection } from "../src/client/connection";

it("detaches a closed connection before already queued server snapshots can restore the room", async () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const received: string[] = [];
  let connection: NetworkConnection;
  server.on("connection", (socket) =>
    socket.once("message", () => {
      socket.send(
        JSON.stringify({ type: "session", room: "test", token: "token" }),
      );
      socket.send(JSON.stringify({ type: "snapshot", snapshot: {} }));
    }),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Connection timeout")),
        2000,
      );
      connection = new NetworkConnection(
        `http://127.0.0.1:${(server.address() as { port: number }).port}`,
        { type: "join", room: "test", name: "我" },
        (response) => {
          received.push(response.type);
          if (response.type === "session") {
            connection.close();
            setTimeout(() => {
              clearTimeout(timeout);
              resolve();
            }, 80);
          }
        },
        () => {},
      );
    });
    expect(received).toEqual(["session"]);
  } finally {
    connection!.close();
    for (const socket of server.clients) socket.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllGlobals();
  }
});

it("rejects a room using an unsupported rules version before rendering a snapshot", async () => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
  const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await new Promise<void>((resolve) => server.once("listening", resolve));
  server.on("connection", (socket) =>
    socket.once("message", () =>
      socket.send(
        JSON.stringify({
          type: "snapshot",
          snapshot: { kind: "uno", apiVersion: 1, rulesVersion: "future" },
        }),
      ),
    ),
  );
  let connection: NetworkConnection | undefined;
  try {
    const response = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Connection timeout")),
        2000,
      );
      connection = new NetworkConnection(
        `http://127.0.0.1:${(server.address() as { port: number }).port}`,
        { type: "join", room: "test", name: "我" },
        (response) => {
          clearTimeout(timeout);
          resolve(response);
        },
        () => {},
      );
    });
    expect(response.type).toBe("error");
    expect(response.message).toContain("版本");
  } finally {
    connection?.close();
    for (const socket of server.clients) socket.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllGlobals();
  }
});
