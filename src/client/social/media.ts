import compressionWorkerUrl from "browser-image-compression/dist/browser-image-compression.js?url";
import {
  attachmentSchema,
  attachmentLimits,
  compressionOptions,
  type ImageQuality,
  type Attachment,
} from "../../domain/attachments";
import { ClientStore } from "../storage";
export interface MediaSession {
  room: string;
  token: string;
  endpoint?: string;
}
export async function mediaRequest(
  session: MediaSession,
  options: {
    id?: string;
    clear?: boolean;
    body?: Blob;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  const url = new URL("/media", session.endpoint);
  url.searchParams.set("room", session.room);
  if (options.id) url.searchParams.set("id", options.id);
  if (options.clear) url.searchParams.set("clear", "1");
  const response = await fetch(url, {
    method: options.clear || options.body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${session.token}` },
    body: options.body,
    signal: options.signal ?? AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("图片已清理");
    const value = await response.json();
    throw new Error(value.error || "图片传输失败");
  }
  return response;
}
export async function prepareImage(
  file: File,
  signal: AbortSignal,
  onProgress: (value: number) => void,
  quality: ImageQuality = "clear",
): Promise<File> {
  if (file.size > 20 * 1024 * 1024) throw new Error("请选择小于 20 MB 的图片");
  if (!/^image\/(jpeg|png|webp)$/u.test(file.type))
    throw new Error("请选择静态 JPEG、PNG 或 WebP 图片");
  const { default: compress } = await import("browser-image-compression");
  const result = await compress(file, {
    ...compressionOptions(file.type, quality),
    useWebWorker: true,
    libURL: new URL(compressionWorkerUrl, location.href).href,
    preserveExif: false,
    signal,
    onProgress,
  });
  if (result.size > attachmentLimits.bytes)
    throw new Error("图片超过 3 MB，可切换省流档或选择较小的图片");
  return result;
}
export async function uploadImage(
  session: MediaSession,
  file: File,
  signal: AbortSignal,
): Promise<Attachment> {
  if (session.endpoint)
    return attachmentSchema.parse(
      await (await mediaRequest(session, { body: file, signal })).json(),
    );
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const bitmap = await createImageBitmap(file);
  try {
    const image = attachmentSchema.parse({
      id: Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join(""),
      mime: file.type,
      width: bitmap.width,
      height: bitmap.height,
      size: file.size,
    });
    if (signal.aborted) throw new DOMException("已取消", "AbortError");
    await new ClientStore().saveImage(session.room, image, file);
    return image;
  } finally {
    bitmap.close();
  }
}
export async function fetchImage(
  session: MediaSession,
  image: Attachment,
  signal: AbortSignal,
): Promise<Blob> {
  if (session.endpoint)
    return (await mediaRequest(session, { id: image.id, signal })).blob();
  const value = await new ClientStore().image(session.room, image.id);
  if (!value) throw new Error("图片已清理");
  return value.bytes;
}
