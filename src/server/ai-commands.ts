import type { Room } from "../domain/room";
import { z } from "zod";
import {
  aiConfigCommandSchema,
  aiTestCommandSchema,
  aiClearCommandSchema,
} from "../domain/companion";
import type { Gateway } from "../domain/gateway";
import type { Response } from "../domain/protocol";
import { createAiProvider } from "./ai-providers";
import { LlmRunner } from "./llm-runner";
import type { RoomTableMinds } from "./table-mind/rooms";

const schema = z.discriminatedUnion("type", [
  aiConfigCommandSchema,
  aiTestCommandSchema,
  aiClearCommandSchema,
]);
type Command = z.infer<typeof schema>;
export class AiCommands {
  private tests = new Map<
    Room,
    { controller: AbortController; token: string }
  >();
  constructor(
    private gateway: Gateway,
    private minds: RoomTableMinds,
    private publish: (room: string) => void,
  ) {}
  handle(
    input: unknown,
    session: { room: string; token: string } | undefined,
    send: (response: Response) => void,
    signal: AbortSignal,
  ): boolean {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return false;
    const command = parsed.data;
    const respond = (ok: boolean, message: string) => {
      if (command.requestId)
        send({
          type: command.type === "ai-test" ? "ai-test" : "ai-status",
          requestId: command.requestId,
          ok,
          message,
        });
      else if (!ok) send({ type: "error", message });
    };
    try {
      if (!session || command.token !== session.token)
        throw new Error("连接身份不匹配");
      const room = this.gateway.rooms.get(session.room);
      if (!room) throw new Error("房间不存在");
      if (!room.canManage(command.token))
        throw new Error("只有房主可以配置 AI");
      if (command.type === "ai-test") {
        void this.test(room, command, signal)
          .then((message) => respond(true, message))
          .catch((error) =>
            respond(
              false,
              error instanceof Error ? error.message : "AI 测试失败",
            ),
          );
      } else {
        this.tests.get(room)?.controller.abort();
        this.tests.delete(room);
        if (command.type === "ai-clear") {
          this.minds.clear(room);
          room.setCompanion(command.token, {
            ...room.config.companion,
            policy: { ...room.config.companion.policy, enabled: false },
          });
        } else {
          const provider = createAiProvider(command.provider, command.apiKey);
          room.setAiProvider(command.token, command.provider);
          const owner = command.token;
          this.minds.configure(room, provider, command.provider, () =>
            room.canManage(owner),
          );
        }
        this.publish(room.id);
        respond(
          true,
          command.type === "ai-clear"
            ? "已清除密钥并断开当前房间 AI。"
            : "配置已保存到本机房主服务。可测试连接后启用 AI。",
        );
      }
    } catch (error) {
      respond(false, error instanceof Error ? error.message : "AI 配置失败");
    }
    return true;
  }

  reconcile(): void {
    for (const [room, active] of this.tests) {
      if (
        this.gateway.rooms.get(room.id) !== room ||
        room.hasEnded ||
        room.paused ||
        !room.canManage(active.token)
      ) {
        active.controller.abort();
        this.tests.delete(room);
      }
    }
  }

  private async test(
    room: Room,
    command: Extract<Command, { type: "ai-test" }>,
    signal: AbortSignal,
  ): Promise<string> {
    const provider = createAiProvider(command.provider, command.apiKey);
    const runner = new LlmRunner({ provider, ...command.provider });
    this.tests.get(room)?.controller.abort();
    const active = { controller: new AbortController(), token: command.token };
    this.tests.set(room, active);
    const combined = AbortSignal.any([signal, active.controller.signal]);
    const started = Date.now();
    try {
      await runner.complete(
        "你是连接测试助手。",
        "请只回复 OK。",
        8,
        undefined,
        combined,
      );
      return `连接成功（${Date.now() - started}ms）`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 测试失败";
      throw new Error(
        command.apiKey ? message.split(command.apiKey).join("***") : message,
      );
    } finally {
      runner.clear();
      if (this.tests.get(room) === active) this.tests.delete(room);
    }
  }
}
