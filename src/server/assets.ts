import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  rm,
  stat,
  utimes,
} from "node:fs/promises";
import { join } from "node:path";
import { imageSize } from "image-size";
import {
  assetIdSchema,
  stickerLimit,
  stickerDimension,
  type StickerAsset,
} from "../domain/social";

export class AssetStore {
  constructor(private root: string) {}
  async save(
    bytes: Uint8Array,
    name: string,
    preview?: string,
  ): Promise<StickerAsset> {
    if (bytes.length > stickerLimit) throw new Error("表情包不能超过 5 MB");
    const image = imageSize(bytes);
    const types: Record<string, string> = {
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };
    const mime = types[image.type ?? ""];
    if (!mime || !image.width || !image.height)
      throw new Error("仅支持 PNG、WebP、GIF 图片");
    if (Math.max(image.width, image.height) > stickerDimension)
      throw new Error("图片最长边不能超过 2048 像素");
    const id = createHash("sha256").update(bytes).digest("hex");
    if (preview) {
      const metadata = await this.metadata(preview);
      if (metadata.mime !== "image/png") throw new Error("静态预览必须是 PNG");
    }
    if (mime === "image/gif" && !preview) throw new Error("动图需要静态预览");
    await mkdir(this.root, { recursive: true });
    try {
      const existing = await this.metadata(id);
      const now = new Date();
      await Promise.all([
        utimes(join(this.root, id), now, now),
        utimes(join(this.root, `${id}.json`), now, now),
      ]);
      return existing;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const metadata = {
      id,
      name: name.slice(0, 48),
      mime,
      width: image.width,
      height: image.height,
      preview: preview ?? id,
    };
    await writeFile(join(this.root, id), bytes);
    await writeFile(join(this.root, `${id}.json`), JSON.stringify(metadata));
    return metadata;
  }
  async metadata(id: string): Promise<StickerAsset> {
    assetIdSchema.parse(id);
    return JSON.parse(
      await readFile(join(this.root, `${id}.json`), "utf8"),
    ) as StickerAsset;
  }
  async bytes(id: string): Promise<Buffer> {
    assetIdSchema.parse(id);
    return readFile(join(this.root, id));
  }
  async collect(referenced: Set<string>): Promise<void> {
    await mkdir(this.root, { recursive: true });
    for (const id of [...referenced]) {
      if (id.startsWith("builtin-")) continue;
      const asset = await this.metadata(id);
      referenced.add(asset.preview);
    }
    for (const file of await readdir(this.root)) {
      const id = file.replace(/\.json$/, "");
      if (
        !referenced.has(id) &&
        Date.now() - (await stat(join(this.root, file))).mtimeMs > 3600000
      )
        await rm(join(this.root, file));
    }
  }
}
