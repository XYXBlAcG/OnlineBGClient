import type { StickerAsset } from "../domain/social";
import { openDB, type DBSchema } from "idb";
import type { RoomArchive } from "../domain/room";
import type { ReplayRecord } from "../domain/replay";

export interface LocalSave {
  room: RoomArchive;
  tokens: string[];
  token: string;
}
export interface StoredSticker {
  asset: StickerAsset;
  bytes: Blob;
  preview: Blob;
}
interface ClientDatabase extends DBSchema {
  stickers: { key: string; value: StoredSticker };
  local: { key: string; value: LocalSave };
  records: { key: string; value: ReplayRecord };
}
export class ClientStore {
  private database = openDB<ClientDatabase>("onlinebg-client", 2, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("local"))
        database.createObjectStore("local");
      if (!database.objectStoreNames.contains("records"))
        database.createObjectStore("records");
      if (!database.objectStoreNames.contains("stickers"))
        database.createObjectStore("stickers");
    },
  });
  async saveSticker(sticker: StoredSticker): Promise<void> {
    await (await this.database).put("stickers", sticker, sticker.asset.id);
  }
  async sticker(id: string): Promise<StoredSticker | undefined> {
    return (await this.database).get("stickers", id);
  }
  async stickers(): Promise<StoredSticker[]> {
    return (await this.database).getAll("stickers");
  }
  async saveLocal(save: LocalSave): Promise<void> {
    await (await this.database).put("local", save, "active");
  }
  async local(): Promise<LocalSave | undefined> {
    return (await this.database).get("local", "active");
  }
  async clearLocal(): Promise<void> {
    await (await this.database).delete("local", "active");
  }
  async saveRecord(record: ReplayRecord): Promise<void> {
    await (
      await this.database
    ).put("records", record, `${record.room}:${record.startedAt}`);
  }
  async records(): Promise<ReplayRecord[]> {
    return (await this.database).getAll("records");
  }
  async deleteRecord(record: ReplayRecord): Promise<void> {
    await (
      await this.database
    ).delete("records", `${record.room}:${record.startedAt}`);
  }
}
