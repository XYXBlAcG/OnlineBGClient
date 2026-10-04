import { ClientStore } from "./storage";
import { Room } from "../domain/room";
import { Gateway } from "../domain/gateway";
import { Strategies } from "../domain/strategies";
import { commandSchema, type Response } from "../domain/protocol";

const gateway = new Gateway();
const store = new ClientStore();
let serial = Promise.resolve();
const strategy = new Strategies();
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
    if (!session) return;
    const room = gateway.rooms.get(session.room)!;
    try {
      let changed = room.commitIfDue() || room.resolveIfDue();
      const request = room.aiRequest();
      if (request && request.version !== failedVersion) {
        const decision = strategy.decide(
          request.observation,
          request.actor,
          request.difficulty,
          request.seed,
        );
        room.queueDecision(decision, request.version);
        changed = room.commitIfDue() || changed;
      }
      if (changed) await publish();
    } catch (error) {
      send({
        type: "error",
        message: error instanceof Error ? error.message : "AI 决策失败",
      });
      failedVersion = room.version;
    }
  });
}, 100);
