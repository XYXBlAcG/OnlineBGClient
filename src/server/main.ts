import { mkdirSync } from "node:fs";
import { RoomStore } from "./storage";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, relative, sep, isAbsolute } from "node:path";
import { Worker } from "node:worker_threads";
import { WebSocketServer, WebSocket } from "ws";
import { Gateway } from "../domain/gateway";
import type { Decision } from "../domain/types";
import type { Response } from "../domain/protocol";

const gateway = new Gateway();
const dataRoot = resolve(process.env.DATA_ROOT || ".data");
mkdirSync(dataRoot, { recursive: true });
const store = new RoomStore(resolve(dataRoot, "rooms.sqlite"));
for (const room of store.load()) gateway.rooms.set(room.id, room);
const root = resolve(process.env.STATIC_ROOT || "dist");
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};
const server = createServer(async (request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ready: true, rooms: gateway.rooms.size }));
    return;
  }
  try {
    const url = new URL(request.url || "/", "http://localhost");
    const path = resolve(
      root,
      `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`,
    );
    const fromRoot = relative(root, path);
    if (
      fromRoot === ".." ||
      fromRoot.startsWith(`..${sep}`) ||
      isAbsolute(fromRoot)
    )
      throw new Error("Invalid path");
    const data = await readFile(path);
    response.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
    });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});
const sockets = new WebSocketServer({
  server,
  path: "/connect",
  maxPayload: 16384,
});
const sessions = new Map<WebSocket, { room: string; token: string }>();
const send = (socket: WebSocket, response: Response) => {
  if (socket.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify(response));
};
const publish = (roomId: string, socket?: WebSocket, response?: Response) => {
  const room = gateway.rooms.get(roomId);
  if (!room) return;
  store.save(room);
  if (socket && response) send(socket, response);
  for (const [socket, session] of sessions)
    if (session.room === roomId)
      send(socket, {
        type: "snapshot",
        snapshot: room.snapshot(session.token),
      });
};
sockets.on("connection", (socket) => {
  socket.on("message", (data) => {
    try {
      const result = gateway.handle(
        JSON.parse(data.toString()),
        sessions.get(socket),
      );
      for (const [other, session] of sessions)
        if (
          other !== socket &&
          session.token === result.session.token &&
          session.room === result.session.room
        ) {
          sessions.delete(other);
          other.close(4001, "Session resumed elsewhere");
        }
      sessions.set(socket, result.session);
      if (result.response?.type === "closed") {
        store.remove(result.session.room);
        for (const [other, session] of sessions)
          if (session.room === result.session.room) {
            send(other, result.response);
            sessions.delete(other);
            other.close(4000, "Room closed");
          }
        return;
      }
      if (result.response?.type === "left") sessions.delete(socket);
      publish(result.session.room, socket, result.response);
      if (result.response?.type === "left") socket.close(4000, "Left room");
    } catch (error) {
      send(socket, {
        type: "error",
        message: error instanceof Error ? error.message : "操作失败",
      });
      const session = sessions.get(socket);
      if (session) {
        const room = gateway.rooms.get(session.room);
        if (room)
          send(socket, {
            type: "snapshot",
            snapshot: room.snapshot(session.token),
          });
      }
    }
  });
  socket.on("close", () => {
    const session = sessions.get(socket);
    sessions.delete(socket);
    if (session) {
      gateway.rooms.get(session.room)?.disconnect(session.token);
      publish(session.room);
    }
  });
});
const worker = new Worker(new URL("./ai-worker.mjs", import.meta.url));
let pending: { room: string; version: number } | null = null;
const failed = new Set<string>();
worker.on("message", (response: { decision?: Decision; error?: string }) => {
  if (!pending) return;
  const request = pending;
  pending = null;
  const room = gateway.rooms.get(request.room);
  if (!room) return;
  if (response.error) {
    failed.add(`${room.id}:${request.version}`);
    for (const [socket, session] of sessions)
      if (session.room === room.id)
        send(socket, { type: "error", message: response.error });
  } else if (
    response.decision &&
    room.queueDecision(response.decision, request.version)
  )
    publish(room.id);
});
worker.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
  server.close();
});
setInterval(() => {
  for (const room of gateway.rooms.values()) {
    if (room.commitIfDue() || room.resolveIfDue()) publish(room.id);
    if (pending) continue;
    const request = room.aiRequest();
    if (request && !failed.has(`${room.id}:${request.version}`)) {
      pending = { room: room.id, version: request.version };
      worker.postMessage(request);
    }
  }
}, 100).unref();
server.on("close", () => {
  store.close();
  void worker.terminate();
});
const port = Number(process.env.PORT || 8787);
server.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `ROOM_READY ${JSON.stringify({ port: (server.address() as import("node:net").AddressInfo).port })}`,
  ),
);
