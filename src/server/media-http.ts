import type { IncomingMessage, ServerResponse } from "node:http";
import { imageSize } from "image-size";
import type { Gateway } from "../domain/gateway";
import { attachmentLimits } from "../domain/attachments";
import { AttachmentStore } from "./attachments";

export class MediaHttp {
  private busy = new Set<string>();
  constructor(
    private gateway: Gateway,
    readonly store: AttachmentStore,
  ) {}
  async handle(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
  ): Promise<boolean> {
    if (url.pathname !== "/media") return false;
    response.setHeader("Cache-Control", "no-store");
    try {
      const room = this.gateway.rooms.get(url.searchParams.get("room") ?? "");
      const token =
        request.headers.authorization?.replace(/^Bearer /u, "") ?? "";
      if (!room) throw new Error("房间不存在");
      room.identity(token);
      if (request.method === "GET") {
        const id = url.searchParams.get("id");
        if (!id) {
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify(await this.store.usage(room.id)));
          return true;
        }
        const data = await this.store.get(room.id, id);
        if (!data) {
          response.writeHead(404);
          response.end("图片已清理");
          return true;
        }
        const size = imageSize(data);
        response.setHeader(
          "Content-Type",
          size.type === "jpg" ? "image/jpeg" : `image/${size.type}`,
        );
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.end(data);
        return true;
      }
      if (request.method !== "POST") throw new Error("不支持的操作");
      if (this.busy.has(room.id))
        throw new Error("房间正在传输图片，请稍后重试");
      this.busy.add(room.id);
      try {
        if (url.searchParams.get("clear") === "1") {
          if (!room.canManage(token))
            throw new Error("只有房主可以清理房间图片");
          await this.store.clear(room.id);
          response.end("{}");
          return true;
        }
        if (
          Number(request.headers["content-length"] ?? 0) >
          attachmentLimits.bytes
        )
          throw new Error("图片须小于 3 MB");
        const chunks: Buffer[] = [];
        let length = 0;
        request.setTimeout(30000, () => request.destroy());
        for await (const chunk of request) {
          length += chunk.length;
          if (length > attachmentLimits.bytes)
            throw new Error("图片须小于 3 MB");
          chunks.push(Buffer.from(chunk));
        }
        if (this.gateway.rooms.get(room.id) !== room)
          throw new Error("房间已关闭");
        room.identity(token);
        const attachment = await this.store.put(room.id, Buffer.concat(chunks));
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(attachment));
        return true;
      } finally {
        this.busy.delete(room.id);
      }
    } catch (error) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : "图片操作失败",
        }),
      );
      return true;
    }
  }
}
