export function previewUrl(input, base) {
  const url = new URL(input, base);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("请输入 http 或 https 网页链接");
  if (url.pathname.endsWith("/phone-preview.html"))
    throw new Error("请输入游戏链接，不能加载预览器本身");
  url.searchParams.set("device-preview", "phone");
  return url.href;
}

export function previewSize(width, height, landscape) {
  const clamp = (value) =>
    Math.max(240, Math.min(1600, Math.round(Number(value) || 240)));
  const a = clamp(width),
    b = clamp(height);
  return landscape
    ? { width: Math.max(a, b), height: Math.min(a, b) }
    : { width: Math.min(a, b), height: Math.max(a, b) };
}

export function previewFit(width, height, availableWidth, availableHeight) {
  return Math.max(
    0.1,
    Math.min(
      1,
      (availableWidth - 48) / (width + 20),
      (availableHeight - 48) / (height + 20),
    ),
  );
}
