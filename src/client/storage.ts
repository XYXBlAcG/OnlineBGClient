import { attachmentLimits, type Attachment } from "../domain/attachments";
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
const recordKey = (record: ReplayRecord) =>
  `${record.room}:${record.startedAt}`;
const historyChanges = new EventTarget();
const historyRevision = "onlinebg.history-revision";
export function subscribeRecords(callback: () => void): () => void {
  historyChanges.addEventListener("change", callback);
  const update = (event: StorageEvent) => {
    if (event.key === historyRevision) callback();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", update);
  return () => {
    historyChanges.removeEventListener("change", callback);
    if (typeof window !== "undefined")
      window.removeEventListener("storage", update);
  };
}
function publishHistory() {
  historyChanges.dispatchEvent(new Event("change"));
  if (typeof window !== "undefined")
    localStorage.setItem(historyRevision, crypto.randomUUID());
}
interface ClientDatabase extends DBSchema {
  recordSettings: { key: string; value: boolean };
  recordSeen: { key: string; value: boolean };
  stickers: { key: string; value: CachedImage };
  attachments: {
    key: string;
    value: {
      room: string;
      image: Attachment;
      bytes: Blob;
      expires: number | null;
    };
  };
  local: { key: string; value: LocalSave };
  records: { key: string; value: ReplayRecord };
}
export class ClientStore {
  private observed = new Set<string>();
  private database = openDB<ClientDatabase>("onlinebg-client", 4, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("attachments"))
        database.createObjectStore("attachments");
      if (!database.objectStoreNames.contains("recordSettings"))
        database.createObjectStore("recordSettings");
      if (!database.objectStoreNames.contains("recordSeen"))
        database.createObjectStore("recordSeen");
      if (!database.objectStoreNames.contains("local"))
        database.createObjectStore("local");
      if (!database.objectStoreNames.contains("records"))
        database.createObjectStore("records");
    },
  });
  async saveImage(room: string, image: Attachment, bytes: Blob): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction("attachments", "readwrite");
    const images = await transaction.store.getAll();
    if (
      images
        .filter((value) => value.room === room && value.image.id !== image.id)
        .reduce((size, value) => size + value.bytes.size, 0) +
        bytes.size >
      attachmentLimits.roomBytes
    )
      throw new Error("房间图片缓存已满，请清理");
    await transaction.store.put(
      { room, image, bytes, expires: null },
      `${room}:${image.id}`,
    );
    await transaction.done;
  }
  async image(room: string, id: string) {
    const value = await (
      await this.database
    ).get("attachments", `${room}:${id}`);
    return value && (value.expires === null || value.expires > Date.now())
      ? value
      : undefined;
  }
  async expireImages(room: string): Promise<void> {
    const transaction = (await this.database).transaction(
      "attachments",
      "readwrite",
    );
    let cursor = await transaction.store.openCursor();
    while (cursor) {
      if (cursor.value.room === room)
        await cursor.update({
          ...cursor.value,
          expires: Date.now() + attachmentLimits.ttl,
        });
      cursor = await cursor.continue();
    }
    await transaction.done;
  }
  async cacheUsage(): Promise<{
    images: number;
    audit: number;
    records: number;
    recordCount: number;
  }> {
    const database = await this.database;
    const media = await database.getAll("attachments");
    for (const value of media)
      if (value.expires !== null && value.expires <= Date.now())
        await database.delete("attachments", `${value.room}:${value.image.id}`);
    const images =
      media
        .filter((value) => value.expires === null || value.expires > Date.now())
        .reduce((total, value) => total + value.bytes.size, 0) +
      (database.objectStoreNames.contains("stickers")
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
    let records = 0,
      recordCount = 0;
    let cursor = await database.transaction("records").store.openCursor();
    while (cursor) {
      records += new TextEncoder().encode(JSON.stringify(cursor.value)).length;
      recordCount++;
      cursor = await cursor.continue();
    }
    return { images, audit, records, recordCount };
  }
  async clearCache(selection: {
    images: boolean;
    audit: boolean;
    records?: boolean;
  }): Promise<void> {
    const database = await this.database;
    const stores: Array<
      "stickers" | "attachments" | "local" | "records" | "recordSeen"
    > = ["local", "attachments", "records", "recordSeen"];
    if (database.objectStoreNames.contains("stickers")) stores.push("stickers");
    const transaction = database.transaction(stores, "readwrite");
    if (selection.records) {
      for (const key of await transaction.objectStore("records").getAllKeys())
        await transaction.objectStore("recordSeen").put(true, key);
      await transaction.objectStore("records").clear();
      const save = await transaction.objectStore("local").get("active");
      if (save) {
        save.room.records = [];
        await transaction.objectStore("local").put(save, "active");
      }
    }
    if (selection.images) await transaction.objectStore("attachments").clear();
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
    if (selection.records) publishHistory();
  }
  async saveLocal(save: LocalSave): Promise<void> {
    const persisted = { ...save, room: { ...save.room, records: [] } };
    await (await this.database).put("local", persisted, "active");
  }
  async local(): Promise<LocalSave | undefined> {
    return (await this.database).get("local", "active");
  }
  async clearLocal(): Promise<void> {
    await (await this.database).delete("local", "active");
  }
  async recordSaving(): Promise<boolean> {
    return (
      (await (await this.database).get("recordSettings", "autoSave")) ?? true
    );
  }
  async setRecordSaving(enabled: boolean): Promise<void> {
    await (await this.database).put("recordSettings", enabled, "autoSave");
    publishHistory();
  }
  async archiveRecords(records: ReplayRecord[]): Promise<void> {
    records = records.filter((record) => !this.observed.has(recordKey(record)));
    if (!records.length) return;
    const database = await this.database,
      transaction = database.transaction(
        ["records", "recordSeen", "recordSettings"],
        "readwrite",
      ),
      seen = transaction.objectStore("recordSeen");
    const enabled =
      (await transaction.objectStore("recordSettings").get("autoSave")) ?? true;
    let changed = false;
    for (const record of records) {
      const key = recordKey(record);
      if (await seen.get(key)) continue;
      await seen.put(true, key);
      if (enabled) {
        await transaction.objectStore("records").put(record, key);
        changed = true;
      }
    }
    await transaction.done;
    for (const record of records) this.observed.add(recordKey(record));
    if (changed) publishHistory();
  }
  async saveRecord(record: ReplayRecord): Promise<void> {
    const database = await this.database,
      transaction = database.transaction(
        ["records", "recordSeen"],
        "readwrite",
      ),
      key = recordKey(record);
    await transaction.objectStore("records").put(record, key);
    await transaction.objectStore("recordSeen").put(true, key);
    await transaction.done;
    publishHistory();
  }
  async records(): Promise<ReplayRecord[]> {
    return (await this.database).getAll("records");
  }
  async deleteRecord(record: ReplayRecord): Promise<void> {
    const database = await this.database,
      transaction = database.transaction(
        ["records", "recordSeen"],
        "readwrite",
      ),
      key = recordKey(record);
    await transaction.objectStore("records").delete(key);
    await transaction.objectStore("recordSeen").put(true, key);
    await transaction.done;
    publishHistory();
  }
}
