import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { join } from "node:path";
import { imageSize } from "image-size";
import {
  attachmentLimits,
  attachmentSchema,
  type Attachment,
} from "../domain/attachments";

export class AttachmentStore {
  constructor(private root: string) {}
  private directory(room: string): string {
    return join(this.root, createHash("sha256").update(room).digest("hex"));
  }
  async put(room: string, bytes: Uint8Array): Promise<Attachment> {
    if (!bytes.length || bytes.length > attachmentLimits.bytes)
      throw new Error("图片须小于 3 MB");
    const size = imageSize(bytes);
    const mime = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[
      size.type ?? ""
    ];
    if (!mime) throw new Error("仅支持静态 JPEG、PNG 或 WebP 图片");
    const attachment = attachmentSchema.parse({
      id: createHash("sha256").update(bytes).digest("hex"),
      mime,
      width: size.width,
      height: size.height,
      size: bytes.length,
    });
    const directory = this.directory(room);
    await mkdir(directory, { recursive: true });
    if (await this.get(room, attachment.id)) return attachment;
    if (
      (await this.usage(room)).bytes + bytes.length >
      attachmentLimits.roomBytes
    )
      throw new Error("房间图片缓存已满，请房主清理");
    await writeFile(join(directory, attachment.id), bytes, { flag: "wx" });
    return attachment;
  }
  async get(room: string, id: string): Promise<Buffer | null> {
    if (!/^[a-f0-9]{64}$/u.test(id)) throw new Error("无效图片引用");
    try {
      return await readFile(join(this.directory(room), id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async usage(room: string): Promise<{ bytes: number; count: number }> {
    let files: string[];
    try {
      files = await readdir(this.directory(room));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { bytes: 0, count: 0 };
      throw error;
    }
    let bytes = 0,
      count = 0;
    for (const id of files.filter((id) => /^[a-f0-9]{64}$/u.test(id))) {
      const data = await stat(join(this.directory(room), id)).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (data) {
        bytes += data.size;
        count++;
      }
    }
    return { bytes, count };
  }
  async clear(room: string): Promise<void> {
    await rm(this.directory(room), { recursive: true, force: true });
  }
  async prune(active: Set<string>, now = Date.now()): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const directories = await readdir(this.root, { withFileTypes: true });
    const live = new Set([...active].map((room) => this.directory(room)));
    for (const directory of directories.filter((value) =>
      value.isDirectory(),
    )) {
      const path = join(this.root, directory.name),
        marker = join(path, "closed");
      if (live.has(path)) {
        await rm(marker, { force: true });
        continue;
      }
      let closed: number;
      try {
        closed = Number(await readFile(marker, "utf8"));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        await writeFile(marker, String(now));
        continue;
      }
      if (now - closed >= attachmentLimits.ttl)
        await rm(path, { recursive: true, force: true });
    }
  }
}
