import { roomIdSchema } from "../domain/protocol";
export interface Invitation {
  room: string;
  service: string;
}
export function parseInvitation(value: string): Invitation {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("请粘贴完整的房间邀请链接");
  }
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("邀请链接必须使用 HTTP 或 HTTPS");
  const room = roomIdSchema.safeParse(url.searchParams.get("room")?.trim());
  if (!room.success) throw new Error("邀请链接没有有效的房间信息");
  const service = new URL(url.searchParams.get("service") || url.origin);
  if (!["https:", "http:"].includes(service.protocol))
    throw new Error("邀请链接中的服务地址无效");
  return { room: room.data, service: service.href.replace(/\/$/, "") };
}
export function invitationLink(room: string, service: string): string {
  const url = new URL(service);
  url.searchParams.set("room", room);
  return url.href;
}
