import { ClientStore, type StoredSticker } from "./storage";
import {
  stickerLimit,
  stickerDimension,
  type StickerAsset,
} from "../domain/social";

export class Stickers {
  constructor(
    private store: ClientStore,
    private endpoint?: string,
    private session?: { room: string; token: string },
  ) {}
  list(): Promise<StoredSticker[]> {
    return this.store.stickers();
  }
  async import(file: File): Promise<StoredSticker> {
    if (!["image/png", "image/webp", "image/gif"].includes(file.type))
      throw new Error("仅支持 PNG、WebP、GIF");
    if (file.size > stickerLimit) throw new Error("表情包不能超过 5 MB");
    const bitmap = await createImageBitmap(file);
    try {
      if (
        file.type === "image/gif" &&
        Math.max(bitmap.width, bitmap.height) > stickerDimension
      )
        throw new Error("动图最长边不能超过 2048 像素");
      const ratio = Math.min(
        1,
        stickerDimension / Math.max(bitmap.width, bitmap.height),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const preview = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("图片转换失败"))),
          "image/png",
        ),
      );
      const bytes = ratio < 1 ? preview : file;
      if (bytes.size > stickerLimit || preview.size > stickerLimit)
        throw new Error("转换后图片超过 5 MB");
      const id = await this.hash(bytes);
      const sticker = {
        asset: {
          id,
          name: file.name.replace(/\.[^.]+$/, "").slice(0, 48),
          mime: bytes.type,
          width: canvas.width,
          height: canvas.height,
          preview: await this.hash(preview),
        },
        bytes,
        preview,
      };
      return sticker;
    } finally {
      bitmap.close();
    }
  }
  private async hash(blob: Blob): Promise<string> {
    return [
      ...new Uint8Array(
        await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
      ),
    ]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }
  async publish(sticker: StoredSticker): Promise<StickerAsset> {
    await this.store.saveSticker(sticker);
    if (!this.endpoint || !this.session) return sticker.asset;
    const upload = async (bytes: Blob, preview?: string) => {
      const url = new URL("/stickers", this.endpoint!);
      url.searchParams.set("room", this.session!.room);
      url.searchParams.set("name", sticker.asset.name);
      if (preview) url.searchParams.set("preview", preview);
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.session!.token}` },
        body: bytes,
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "上传失败");
      return value as StickerAsset;
    };
    const preview = await upload(sticker.preview);
    return upload(sticker.bytes, preview.id);
  }
  async url(
    id: string,
    reduced: boolean,
  ): Promise<{ url: string; dispose: () => void }> {
    if (this.endpoint) {
      const response = await fetch(
        new URL(`/stickers/${id}.json`, this.endpoint),
      );
      if (!response.ok) throw new Error("表情包加载失败");
      const asset = (await response.json()) as StickerAsset;
      return {
        url: new URL(`/stickers/${reduced ? asset.preview : id}`, this.endpoint)
          .href,
        dispose: () => {},
      };
    }
    const sticker = await this.store.sticker(id);
    if (!sticker) throw new Error("本地表情包不存在");
    const url = URL.createObjectURL(reduced ? sticker.preview : sticker.bytes);
    return { url, dispose: () => URL.revokeObjectURL(url) };
  }
}
