import { openDB, type DBSchema } from "idb";
import type { RoomArchive } from "../domain/room";
import type { ReplayRecord } from "../domain/replay";

export interface LocalSave {
  room: RoomArchive;
  tokens: string[];
  token: string;
}
interface CachedImage {
  bytes: Blob;
  preview: Blob;
}
interface ClientDatabase extends DBSchema {
  stickers: { key: string; value: CachedImage };
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
    },
  });
  async cacheUsage(): Promise<{ images: number; audit: number }> {
    const database = await this.database;
    const images = (
      database.objectStoreNames.contains("stickers")
        ? await database.getAll("stickers")
        : []
    ).reduce(
      (total, value) => total + value.bytes.size + value.preview.size,
      0,
    );
    const save = await database.get("local", "active");
    const audit =
      save && (save.room.decisions.length || save.room.summaries.length)
        ? new TextEncoder().encode(
            JSON.stringify({
              decisions: save.room.decisions,
              summaries: save.room.summaries,
            }),
          ).length
        : 0;
    return { images, audit };
  }
  async clearCache(selection: {
    images: boolean;
    audit: boolean;
  }): Promise<void> {
    const database = await this.database;
    const stores: Array<"stickers" | "local"> =
      database.objectStoreNames.contains("stickers")
        ? ["stickers", "local"]
        : ["local"];
    const transaction = database.transaction(stores, "readwrite");
    if (selection.images && database.objectStoreNames.contains("stickers"))
      await transaction.objectStore("stickers").clear();
    if (selection.audit) {
      const save = await transaction.objectStore("local").get("active");
      if (save) {
        save.room.decisions = [];
        save.room.summaries = [];
        save.room.config.auditEnabled = false;
        await transaction.objectStore("local").put(save, "active");
      }
    }
    await transaction.done;
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
