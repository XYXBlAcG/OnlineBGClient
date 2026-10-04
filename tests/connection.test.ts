import { it, expect, vi, beforeEach } from "vitest";
import { WebSocketServer } from "ws";
import { protocolVersion } from "../src/domain/protocol";
import { gameCatalogue } from "../src/domain/catalogue";
import { NetworkConnection } from "../src/client/connection";

beforeEach(() => {
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  vi.stubGlobal("window", new EventTarget());
});

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

it("refreshes the authoritative snapshot on foreground resume and detaches lifecycle listeners on close", async () => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
  const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const commands: { type: string; token?: string }[] = [];
  const statuses: string[] = [];
  const responses: string[] = [];
  server.on("connection", (socket) =>
    socket.on("message", (data) => {
      const command = JSON.parse(data.toString());
      commands.push(command);
      if (command.type === "join")
        socket.send(
          JSON.stringify({ type: "session", room: "test", token: "identity" }),
        );
      else
        socket.send(
          JSON.stringify({
            type: "snapshot",
            snapshot: {
              kind: "uno",
              apiVersion: protocolVersion,
              rulesVersion: gameCatalogue.uno.version,
            },
          }),
        );
    }),
  );
  const connection = new NetworkConnection(
    `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    { type: "join", room: "test", name: "我" },
    (response) => responses.push(response.type),
    (status) => statuses.push(status),
  );
  try {
    await vi.waitFor(() => expect(responses).toEqual(["session"]));
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(() => expect(responses).toEqual(["session", "snapshot"]));
    expect(commands[1]).toEqual({ type: "snapshot", token: "identity" });
    expect(statuses.slice(-2)).toEqual(["正在恢复", "已连接"]);
    connection.close();
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
    expect(commands).toHaveLength(2);
  } finally {
    connection.close();
    for (const socket of server.clients) socket.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllGlobals();
  }
});
