export const phonePresets = [
  { id: "compact", label: "紧凑手机", width: 360, height: 780 },
  { id: "standard", label: "标准手机", width: 390, height: 844 },
  { id: "large", label: "大屏手机", width: 430, height: 932 },
  { id: "tablet", label: "平板", width: 768, height: 1024 },
] as const;

export function phoneSize(
  width: number | string,
  height: number | string,
  landscape: boolean,
) {
  const clamp = (value: number | string) =>
    Math.max(240, Math.min(1600, Math.round(Number(value) || 240)));
  const a = clamp(width),
    b = clamp(height);
  return landscape
    ? { width: Math.max(a, b), height: Math.min(a, b) }
    : { width: Math.min(a, b), height: Math.max(a, b) };
}

export function phoneFit(
  width: number,
  height: number,
  availableWidth: number,
  availableHeight: number,
) {
  return Math.max(
    0.1,
    Math.min(
      1,
      (availableWidth - 48) / (width + 20),
      (availableHeight - 48) / (height + 20),
    ),
  );
}

export function phoneRoomUrl(
  input: string,
  base: string,
  clientOrigin: string,
): string {
  const url = new URL(input.trim(), base);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("请输入 http 或 https 网页链接");
  if (url.searchParams.get("dev") === "phone")
    throw new Error("不能再次加载手机房间入口");
  const room = url.searchParams.get("room")?.trim();
  if (room) {
    const service = new URL(url.searchParams.get("service") || url.origin, url);
    if (!["http:", "https:"].includes(service.protocol))
      throw new Error("邀请链接中的服务地址无效");
    const client = new URL("/", clientOrigin);
    client.searchParams.set("room", room);
    client.searchParams.set("service", service.href.replace(/\/$/, ""));
    client.searchParams.set("device-preview", "phone");
    return client.href;
  }
  url.searchParams.set("device-preview", "phone");
  return url.href;
}
