import { ClientStore } from "./storage";
import { Room } from "../domain/room";
import { Gateway } from "../domain/gateway";
import { ComputePool, SearchCoordinator } from "../domain/compute";
import { computeThreads } from "../domain/performance";
import { commandSchema, type Response } from "../domain/protocol";

const gateway = new Gateway();
const store = new ClientStore();
let serial = Promise.resolve();
const cores = navigator.hardwareConcurrency || 2;
const pool = new ComputePool(
  () => {
    const worker = new Worker(new URL("./search-worker.ts", import.meta.url), {
      type: "module",
    });
    return {
      send: (input) => worker.postMessage(input),
      receive: (callback) => {
        worker.onmessage = (event) => callback(event.data);
      },
      error: (callback) => {
        worker.onerror = (event) => callback(new Error(event.message));
      },
      close: () => worker.terminate(),
    };
  },
  Math.min(32, cores),
);
const compute = new SearchCoordinator(pool);
let pending:
  { room: string; version: number; controller: AbortController } | undefined;
let session: { room: string; token: string } | undefined;
let tokens: string[] = [];
let failedVersion = -1;
const send = (response: Response) => postMessage(response);
const publish = async () => {
  if (session) {
    const room = gateway.rooms.get(session.room)!;
    await store.saveLocal(
      structuredClone({ room: room.export(), tokens, token: session.token }),
    );
    send({
      type: "snapshot",
      snapshot: gateway.rooms.get(session.room)!.snapshot(session.token),
    });
  }
};

onmessage = (event) => {
  serial = serial.then(async () => {
    try {
      const command = commandSchema.parse(event.data);
      if (
        command.type === "create" &&
        command.hostOnly &&
        command.config.humans > 0
      )
        throw new Error("仅服务模式需要联机房间");
      if (command.type === "restore-local") {
        const saved = await store.local();
        if (!saved) throw new Error("没有本地存档");
        failedVersion = -1;
        const room = Room.restore(saved.room);
        gateway.rooms.set(room.id, room);
        tokens = saved.tokens;
        for (const token of tokens) room.claim("", token);
        session = { room: room.id, token: saved.token };
        send({ type: "session", ...session, localTokens: tokens });
        await publish();
        return;
      }
      if (
        command.type !== "create" &&
        command.type !== "join" &&
        tokens.includes(command.token) &&
        session
      )
        session.token = command.token;
      const result = gateway.handle(command, session);
      session = result.session;
      if (command.type === "interaction") {
        if (result.response) send(result.response);
        return;
      }
      if (command.type === "create") {
        failedVersion = -1;
        const room = gateway.rooms.get(session.room)!;
        tokens = [session.token];
        for (let index = 1; index < command.config.humans; index++) {
          const token = room.claim(`玩家 ${index + 1}`);
          room.setReady(token, true);
          tokens.push(token);
        }
        send({ type: "session", ...session, localTokens: tokens });
      }
      if (command.type === "game") {
        const room = gateway.rooms.get(session.room)!;
        tokens = tokens.filter(
          (token) =>
            room.host?.token === token ||
            room.seats.some((seat) => seat.token === token),
        );
        for (let index = 0; index < room.seats.length; index++) {
          const seat = room.seats[index];
          if (seat.difficulty) continue;
          if (!seat.token) tokens.push(room.claim(`玩家 ${index + 1}`));
          room.setReady(room.seats[index].token!, true);
        }
        send({ type: "session", ...session, localTokens: tokens });
      }
      if (command.type === "seat" && command.config.type === "human") {
        const room = gateway.rooms.get(session.room)!;
        const token = room.claim(`玩家 ${command.index + 1}`);
        room.setReady(token, true);
        tokens.push(token);
        send({ type: "session", ...session, localTokens: tokens });
      }
      if (
        result.response?.type === "closed" ||
        result.response?.type === "left"
      ) {
        if (result.response.type === "closed" && result.response.replay)
          await store.saveRecord(result.response.replay);
        session = undefined;
        await store.clearLocal();
        send(result.response);
        return;
      }
      await publish();
      if (command.type !== "create" && result.response) send(result.response);
    } catch (error) {
      send({
        type: "error",
        message: error instanceof Error ? error.message : "无法执行操作",
      });
      await publish();
    }
  });
};

setInterval(() => {
  serial = serial.then(async () => {
    if (pending) {
      const room = gateway.rooms.get(pending.room);
      if (
        !session ||
        !room ||
        room.version !== pending.version ||
        room.paused ||
        !room.aiRequest()
      ) {
        pending.controller.abort();
        pending = undefined;
      }
    }
    if (!session) return;
    const room = gateway.rooms.get(session.room)!;
    try {
      const changed = room.commitIfDue() || room.resolveIfDue();
      if (changed) await publish();
      if (pending) return;
      const request = room.aiRequest();
      if (!request || request.version === failedVersion) return;
      const active = {
        room: room.id,
        version: request.version,
        controller: new AbortController(),
      };
      pending = active;
      void compute
        .decide(
          request,
          computeThreads(room.config.performance, cores),
          active.controller.signal,
          (progress) => {
            if (
              pending === active &&
              session?.room === room.id &&
              room.updateComputation(request.actor, request.version, progress)
            )
              send({
                type: "snapshot",
                snapshot: room.snapshot(session.token),
              });
          },
        )
        .then((result) => {
          serial = serial.then(async () => {
            if (
              session?.room === room.id &&
              room.queueDecision(result, request.version)
            ) {
              room.commitIfDue();
              await publish();
            }
          });
        })
        .catch((error) => {
          if (active.controller.signal.aborted) return;
          active.controller.abort();
          failedVersion = request.version;
          send({ type: "error", message: String(error) });
        })
        .finally(() => {
          if (pending === active) pending = undefined;
        });
    } catch (error) {
      send({ type: "error", message: String(error) });
      failedVersion = room.version;
    }
  });
}, 100);
