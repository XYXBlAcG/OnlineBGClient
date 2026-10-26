import { commandSchema, type Command, type Response } from "./protocol";
import { Room, type RoomArchive } from "./room";

export class Gateway {
  readonly rooms = new Map<string, Room>();
  readonly runs = new Map<string, RoomArchive>();
  rememberRun(room: Room): void {
    if (room.state?.kind === "expedition" && room.engine.finished(room.state)) {
      this.runs.delete(room.state.view.runId);
      return;
    }
    if (
      room.state?.kind === "expedition" &&
      !room.hasEnded &&
      !room.engine.finished(room.state)
    ) {
      const id = room.state.view.runId;
      if (this.runs.get(id)?.version !== room.version)
        this.runs.set(
          id,
          structuredClone({
            ...room.export(),
            records: [],
            decisions: [],
            summaries: [],
            accepted: [],
          }),
        );
    }
  }

  handle(
    input: unknown,
    session?: { room: string; token: string },
  ): { session: { room: string; token: string }; response?: Response } {
    const command = commandSchema.parse(input);
    if (command.type === "restore-run" || command.type === "abandon-run") {
      const save = this.runs.get(command.run);
      if (!save || command.token !== (save.host?.token ?? save.seats[0].token))
        throw new Error("远征存档不存在或原房主身份不匹配");
      if (command.type === "abandon-run") {
        const current = this.rooms.get(save.id);
        if (
          (current?.state?.kind === "expedition" &&
            current.state.view.runId === command.run) ||
          current?.pendingRunId === command.run
        )
          current.end(command.token, true);
        this.runs.delete(command.run);
        return {
          session: { room: save.id, token: command.token },
          response: { type: "run-abandoned", run: command.run },
        };
      }
      const current = this.rooms.get(save.id);
      if (
        current &&
        (current.config.kind !== "expedition" ||
          (current.state?.kind === "expedition" &&
            current.state.view.runId !== command.run &&
            !current.hasEnded))
      )
        throw new Error("原房间正在进行其他游戏，请先关闭原房间再恢复远征");
      if (
        current &&
        (current.pendingRunId === command.run ||
          (current.state?.kind === "expedition" &&
            current.state.view.runId === command.run &&
            current.seats.some(
              (seat) =>
                !seat.difficulty && seat.online && seat.token !== command.token,
            )))
      ) {
        current.claim("", command.token);
        return {
          session: { room: current.id, token: command.token },
          response: { type: "session", room: current.id, token: command.token },
        };
      }
      const room = Room.resumeRun(save, command.token);
      this.rooms.set(room.id, room);
      return {
        session: { room: room.id, token: command.token },
        response: { type: "session", room: room.id, token: command.token },
      };
    }
    if (command.type === "restore-local")
      throw new Error("该命令仅用于本地存档");
    if (command.type === "create") {
      const room = new Room(crypto.randomUUID().slice(0, 8), command.config);
      const token =
        command.hostOnly || !room.config.humans
          ? room.createHost(command.name)
          : room.claim(command.name, undefined, command.avatar);
      this.rooms.set(room.id, room);
      return {
        session: { room: room.id, token },
        response: { type: "session", room: room.id, token },
      };
    }
    if (command.type === "join") {
      const room = this.rooms.get(command.room);
      if (!room) throw new Error("房间不存在");
      const token = room.claim(command.name, command.token, command.avatar);
      return {
        session: { room: room.id, token },
        response: { type: "session", room: room.id, token },
      };
    }
    if (!session || command.token !== session.token)
      throw new Error("连接身份不匹配");
    const room = this.rooms.get(session.room);
    if (!room) throw new Error("房间不存在");
    this.rememberRun(room);
    if (command.type === "close") {
      if (!room.canManage(command.token))
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
        command.units,
      );
      return {
        session,
        response: event ? { type: "interaction", event } : undefined,
      };
    }
    this.execute(room, command);
    this.rememberRun(room);
    if (command.type === "leave")
      return { session, response: { type: "left" } };
    return {
      session,
      response:
        command.type === "action" ||
        command.type === "chat" ||
        command.type === "chat-image"
          ? { type: "ack", id: command.id }
          : undefined,
    };
  }

  execute(
    room: Room,
    command: Exclude<
      Command,
      {
        type:
          "create" | "join" | "restore-local" | "restore-run" | "abandon-run";
      }
    >,
  ): void {
    if (command.type === "seat")
      room.configureSeat(command.token, command.index, command.config);
    if (command.type === "autoplay")
      room.setAutoplay(command.token, command.enabled, command.index);
    if (command.type === "avatar")
      room.setAvatar(command.token, command.avatar);
    if (command.type === "ready") room.setReady(command.token, command.ready);
    if (command.type === "leave") room.leave(command.token);
    if (command.type === "start") room.start(command.token);
    if (command.type === "computation")
      room.setComputation(command.token, command.audit, command.performance);
    if (command.type === "tempo") room.setTempo(command.token, command.delayMs);
    if (command.type === "game") room.changeGame(command.token, command.setup);
    if (command.type === "ai-run")
      room.setAiRunning(command.token, command.enabled);
    if (command.type === "end") room.end(command.token);
    if (command.type === "action")
      room.act(command.token, command.id, command.version, command.action);
    if (command.type === "banner-policy")
      room.setBannerPolicy(command.token, command.policy);
    if (command.type === "chat-image")
      room.chatImage(command.token, command.id, command.attachment);
    if (command.type === "chat")
      room.chat(command.token, command.id, command.text);
  }
}
