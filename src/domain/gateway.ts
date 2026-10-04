import { commandSchema, type Command, type Response } from "./protocol";
import { Room } from "./room";

export class Gateway {
  readonly rooms = new Map<string, Room>();

  handle(
    input: unknown,
    session?: { room: string; token: string },
  ): { session: { room: string; token: string }; response?: Response } {
    const command = commandSchema.parse(input);
    if (command.type === "restore-local")
      throw new Error("该命令仅用于本地存档");
    if (command.type === "create") {
      const room = new Room(crypto.randomUUID().slice(0, 8), command.config);
      const token = room.claim(command.name);
      this.rooms.set(room.id, room);
      return {
        session: { room: room.id, token },
        response: { type: "session", room: room.id, token },
      };
    }
    if (command.type === "join") {
      const room = this.rooms.get(command.room);
      if (!room) throw new Error("房间不存在");
      const token = room.claim(command.name, command.token);
      return {
        session: { room: room.id, token },
        response: { type: "session", room: room.id, token },
      };
    }
    if (!session || command.token !== session.token)
      throw new Error("连接身份不匹配");
    const room = this.rooms.get(session.room);
    if (!room) throw new Error("房间不存在");
    if (command.type === "close") {
      if (room.identity(command.token) !== 0)
        throw new Error("只有房主可以关闭房间");
      room.end(command.token);
      const replay = room.snapshot(command.token).replay;
      this.rooms.delete(room.id);
      return { session, response: { type: "closed", replay } };
    }
    if (command.type === "interaction") {
      const event = room.interact(
        command.token,
        command.id,
        command.target,
        command.kind,
      );
      return {
        session,
        response: event ? { type: "interaction", event } : undefined,
      };
    }
    this.execute(room, command);
    if (command.type === "leave")
      return { session, response: { type: "left" } };
    return {
      session,
      response:
        command.type === "action" ||
        command.type === "chat" ||
        command.type === "sticker"
          ? { type: "ack", id: command.id }
          : undefined,
    };
  }

  execute(
    room: Room,
    command: Exclude<Command, { type: "create" | "join" | "restore-local" }>,
  ): void {
    if (command.type === "seat")
      room.configureSeat(command.token, command.index, command.config);
    if (command.type === "ready") room.setReady(command.token, command.ready);
    if (command.type === "leave") room.leave(command.token);
    if (command.type === "start") room.start(command.token);
    if (command.type === "tempo") room.setTempo(command.token, command.delayMs);
    if (command.type === "game") room.changeGame(command.token, command.kind);
    if (command.type === "end") room.end(command.token);
    if (command.type === "action")
      room.act(command.token, command.id, command.version, command.action);
    if (command.type === "sticker")
      room.sticker(command.token, command.id, command.asset, command.text);
    if (command.type === "chat")
      room.chat(command.token, command.id, command.text);
  }
}
