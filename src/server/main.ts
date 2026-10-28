import { VoiceAuthority, LiveKitMedia } from "./voice";
import { VoiceHttp } from "./voice-http";
import { attachmentSchema } from "../domain/attachments";
import { AttachmentStore } from "./attachments";
import { MediaHttp } from "./media-http";
import { SnapshotStream } from "../domain/sync";
import { availableParallelism } from "node:os";
import { ComputePool, SearchCoordinator } from "../domain/compute";
import { computeThreads } from "../domain/performance";
import { mkdirSync } from "node:fs";
import { RoomStore } from "./storage";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, relative, sep, isAbsolute } from "node:path";
import { Worker } from "node:worker_threads";
import { WebSocketServer, WebSocket } from "ws";
import { Gateway } from "../domain/gateway";
import { protocolVersion, type Response } from "../domain/protocol";

const gateway = new Gateway();
const voiceConfig =
  process.env.LIVEKIT_URL &&
  process.env.LIVEKIT_API_KEY &&
  process.env.LIVEKIT_API_SECRET
    ? {
        url: process.env.LIVEKIT_URL,
        apiKey: process.env.LIVEKIT_API_KEY,
        secret: process.env.LIVEKIT_API_SECRET,
      }
    : null;
const voice = new VoiceHttp(
  new VoiceAuthority(
    gateway,
    voiceConfig,
    voiceConfig ? new LiveKitMedia(voiceConfig) : null,
  ),
);
let voiceReconciling = false;
const voiceSweep = setInterval(() => {
  if (voiceReconciling) return;
  voiceReconciling = true;
  void voice.authority
    .reconcileAll()
    .catch(() => console.error("语音成员清理失败，将自动重试"))
    .finally(() => {
      voiceReconciling = false;
    });
}, 4000);
voiceSweep.unref();
const dataRoot = resolve(process.env.DATA_ROOT || ".data");
mkdirSync(dataRoot, { recursive: true });
const media = new MediaHttp(
  gateway,
  new AttachmentStore(resolve(dataRoot, "attachments")),
);
const mediaCleanup = setInterval(() => {
  void media.store
    .prune(new Set(gateway.rooms.keys()))
    .catch((error) => console.error("图片缓存清理失败", error));
}, 60000);
mediaCleanup.unref();
const store = new RoomStore(resolve(dataRoot, "rooms.sqlite"));
for (const [id, archive] of store.loadRuns()) gateway.runs.set(id, archive);
for (const room of store.load()) {
  gateway.rooms.set(room.id, room);
  store.save(room);
}
const root = resolve(process.env.STATIC_ROOT || "dist");
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};
const desktopOrigins = new Set([
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://localhost:1420",
  "http://127.0.0.1:1420",
]);
const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && desktopOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (request.method === "OPTIONS") {
    response.writeHead(origin && desktopOrigins.has(origin) ? 204 : 403);
    response.end();
    return;
  }
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        ready: true,
        apiVersion: protocolVersion,
        rooms: gateway.rooms.size,
      }),
    );
    return;
  }
  try {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname === "/runs/abandon") {
      response.setHeader("Content-Type", "application/json");
      response.setHeader("Cache-Control", "no-store");
      try {
        if (request.method !== "POST") throw new Error("不支持的存档操作");
        request.setTimeout(10000, () => request.destroy());
        const chunks: Buffer[] = [];
        let length = 0;
        for await (const chunk of request) {
          length += chunk.length;
          if (length > 2048) throw new Error("请求过大");
          chunks.push(Buffer.from(chunk));
        }
        const input = JSON.parse(Buffer.concat(chunks).toString());
        if (input.type !== "abandon-run") throw new Error("不支持的存档操作");
        const result = gateway.handle(input);
        store.saveRuns(gateway.runs);
        publish(result.session.room);
        response.writeHead(200);
        response.end(JSON.stringify(result.response));
      } catch (error) {
        response.writeHead(400);
        response.end(
          JSON.stringify({
            error: error instanceof Error ? error.message : "存档维护失败",
          }),
        );
      }
      return;
    }
    if (await voice.handle(request, response, url)) return;
    if (await media.handle(request, response, url)) return;
    if (url.pathname === "/room-info") {
      const room = gateway.rooms.get(url.searchParams.get("room") || "");
      response.writeHead(room ? 200 : 404, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      response.end(
        JSON.stringify(
          room
            ? {
                kind: room.config.kind,
                seats: room.seats.length,
                players: room.seats.filter(
                  (seat) => seat.token || seat.difficulty,
                ).length,
              }
            : { error: "房间不存在" },
        ),
      );
      return;
    }
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
  } catch (error) {
    response.writeHead(request.method === "POST" ? 400 : 404, {
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ error: String(error) }));
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
const publish = (
  roomId: string,
  socket?: WebSocket,
  response?: Response,
  persist = true,
) => {
  const room = gateway.rooms.get(roomId);
  if (!room) return;
  if (persist) {
    store.save(room);
    gateway.rememberRun(room);
    store.saveRuns(gateway.runs);
  }
  if (socket && response) send(socket, response);
  for (const [socket, session] of sessions) {
    if (session.room !== roomId) continue;
    if (
      room.host?.token !== session.token &&
      !room.seats.some((seat) => seat.token === session.token)
    ) {
      send(socket, {
        type: "error",
        message: "房主调整了下一局席位，你已离开房间",
      });
      send(socket, { type: "left" });
      sessions.delete(socket);
      socket.close(4000, "Removed from room");
    } else
      send(socket, streams.get(socket)!.next(room.snapshot(session.token)));
  }
};
const streams = new Map<WebSocket, SnapshotStream>();
const alive = new Set<WebSocket>();
const heartbeat = setInterval(() => {
  for (const socket of sockets.clients) {
    if (!alive.delete(socket)) socket.terminate();
    else socket.ping();
  }
}, 15000);
heartbeat.unref();
sockets.on("connection", (socket) => {
  streams.set(socket, new SnapshotStream());
  let serial = Promise.resolve();
  socket.on("message", (data) => {
    serial = serial.then(async () => {
      let requestId: string | undefined;
      try {
        const input = JSON.parse(data.toString());
        requestId = typeof input?.id === "string" ? input.id : undefined;
        if (input.type === "chat-image") {
          const session = sessions.get(socket);
          if (!session || session.token !== input.token)
            throw new Error("连接身份不匹配");
          const bytes = await media.store.get(
            session.room,
            input.attachment?.id,
          );
          if (!bytes) throw new Error("图片尚未上传或已清理，请重新发送");
          const attachment = await media.store.put(session.room, bytes);
          if (
            JSON.stringify(attachment) !==
            JSON.stringify(attachmentSchema.parse(input.attachment))
          )
            throw new Error("图片信息不匹配");
        }
        const result = gateway.handle(input, sessions.get(socket));
        store.saveRuns(gateway.runs);
        if (result.response?.type === "run-abandoned") {
          publish(result.session.room);
          send(socket, result.response);
          return;
        }
        if (["close", "leave", "game"].includes(input.type))
          void voice.authority
            .reconcile(result.session.room)
            .catch(() => console.error("语音成员同步失败，将自动重试"));
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
        if (result.response?.type === "session")
          streams.set(socket, new SnapshotStream());
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
        if (input.type === "interaction") {
          if (!result.response) return;
          for (const [other, session] of sessions)
            if (session.room === result.session.room)
              send(other, result.response);
          return;
        }
        if (input.type === "snapshot") {
          const room = gateway.rooms.get(result.session.room)!;
          send(
            socket,
            streams
              .get(socket)!
              .next(room.snapshot(result.session.token), true),
          );
          return;
        }
        publish(result.session.room, socket, result.response);
        if (result.response?.type === "left") socket.close(4000, "Left room");
      } catch (error) {
        send(socket, {
          type: "error",
          message: error instanceof Error ? error.message : "操作失败",
          id: requestId,
        });
        const session = sessions.get(socket);
        if (session) {
          const room = gateway.rooms.get(session.room);
          if (room)
            send(
              socket,
              streams.get(socket)!.next(room.snapshot(session.token), true),
            );
        }
      }
    });
  });
  socket.on("pong", () => alive.add(socket));
  alive.add(socket);
  socket.on("close", () => {
    alive.delete(socket);
    streams.delete(socket);
    const session = sessions.get(socket);
    sessions.delete(socket);
    if (session) {
      gateway.rooms.get(session.room)?.disconnect(session.token);
      publish(session.room);
    }
  });
});
const cores = availableParallelism();
const pool = new ComputePool(
  () => {
    const worker = new Worker(new URL("./ai-worker.mjs", import.meta.url));
    return {
      send: (input) => worker.postMessage(input),
      receive: (callback) => {
        worker.on("message", callback);
      },
      error: (callback) => {
        worker.on("error", callback);
        worker.on("exit", (code) => {
          if (code) callback(new Error(`计算线程退出：${code}`));
        });
      },
      close: () => {
        void worker.terminate();
      },
    };
  },
  Math.min(32, cores),
);
const compute = new SearchCoordinator(pool);
const pending = new Map<
  string,
  { version: number; controller: AbortController }
>();
const failed = new Map<string, number>();
setInterval(() => {
  for (const [id, active] of pending) {
    const room = gateway.rooms.get(id);
    if (
      !room ||
      room.version !== active.version ||
      room.paused ||
      !room.aiRequest()
    ) {
      active.controller.abort();
      pending.delete(id);
    }
  }
  for (const room of gateway.rooms.values()) {
    if (room.commitIfDue() || room.resolveIfDue()) publish(room.id);
    if (pending.has(room.id)) continue;
    const request = room.aiRequest();
    if (!request || failed.get(room.id) === request.version) continue;
    const active = {
      version: request.version,
      controller: new AbortController(),
    };
    pending.set(room.id, active);
    void compute
      .decide(
        request,
        computeThreads(room.config.performance, cores),
        active.controller.signal,
        (progress) => {
          if (
            pending.get(room.id) === active &&
            room.updateComputation(request.actor, request.version, progress)
          )
            publish(room.id, undefined, undefined, false);
        },
      )
      .then((result) => {
        if (gateway.rooms.get(room.id) === room)
          room.queueDecision(result, request.version);
      })
      .catch((error) => {
        if (active.controller.signal.aborted) return;
        active.controller.abort();
        failed.set(room.id, request.version);
        for (const [socket, session] of sessions)
          if (session.room === room.id)
            send(socket, { type: "error", message: String(error) });
      })
      .finally(() => {
        if (pending.get(room.id) === active) pending.delete(room.id);
      });
  }
  for (const id of failed.keys()) if (!gateway.rooms.has(id)) failed.delete(id);
}, 100).unref();
server.on("close", () => {
  clearInterval(heartbeat);
  store.close();
  pool.close();
});
const port = Number(process.env.PORT || 8787);
server.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `ROOM_READY ${JSON.stringify({ port: (server.address() as import("node:net").AddressInfo).port })}`,
  ),
);
