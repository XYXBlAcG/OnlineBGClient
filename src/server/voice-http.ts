import type { IncomingMessage, ServerResponse } from "node:http";
import { voiceOperationSchema } from "../domain/voice";
import { VoiceAuthority } from "./voice";
export class VoiceHttp {
  constructor(readonly authority: VoiceAuthority) {}
  async handle(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
  ): Promise<boolean> {
    if (url.pathname !== "/voice") return false;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json");
    try {
      if (request.method !== "POST") throw new Error("不支持的语音操作");
      const room = url.searchParams.get("room") ?? "",
        token = request.headers.authorization?.replace(/^Bearer /u, "") ?? "";
      request.setTimeout(10000, () => request.destroy());
      const chunks: Buffer[] = [];
      let length = 0;
      for await (const chunk of request) {
        length += chunk.length;
        if (length > 2048) throw new Error("语音请求过大");
        chunks.push(Buffer.from(chunk));
      }
      const operation = voiceOperationSchema.parse(
        JSON.parse(Buffer.concat(chunks).toString()),
      );
      let result;
      if (operation.type === "status")
        result = this.authority.status(room, token);
      else if (operation.type === "join")
        result = await this.authority.join(room, token);
      else if (operation.type === "heartbeat")
        result = this.authority.heartbeat(room, token);
      else if (operation.type === "leave")
        result = await this.authority.leave(room, token);
      else
        result = await this.authority.moderate(
          room,
          token,
          operation.target,
          operation.operation,
        );
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(400);
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : "语音服务不可用",
        }),
      );
    }
    return true;
  }
}
