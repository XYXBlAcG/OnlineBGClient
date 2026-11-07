import {
  workshopPackSchema,
  workshopVersionCompare,
  type WorkshopInstallation,
  type WorkshopPack,
} from "../domain/workshop/model";
import { v4 as randomId } from "uuid";
import { attachmentLimits, type Attachment } from "../domain/attachments";
import { openDB, type DBSchema } from "idb";
import type { RoomArchive } from "../domain/room";
import type { ReplayRecord } from "../domain/replay";
import {
  achievementById,
  defaultAppStats,
  type AchievementUnlock,
  type AppStats,
} from "../domain/achievements";

export interface LocalSave {
  room: RoomArchive;
  tokens: string[];
  token: string;
}
export interface RunLink {
  id: string;
  token: string;
  room: string;
  endpoint: string | null;
  hosted: boolean;
  lan?: boolean;
  updated: number;
  names: string[];
  floor: number;
  chapter?: number;
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
    localStorage.setItem(historyRevision, randomId());
}
interface ClientDatabase extends DBSchema {
  plugins: { key: string; value: WorkshopInstallation };
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
  runs: { key: string; value: LocalSave };
  runLinks: { key: string; value: RunLink };
  local: { key: string; value: LocalSave };
  records: { key: string; value: ReplayRecord };
  achievements: { key: string; value: AchievementUnlock };
  appStats: { key: string; value: AppStats };
}
export class ClientStore {
  private observed = new Set<string>();
  private database = openDB<ClientDatabase>("onlinebg-client", 8, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("plugins"))
        database.createObjectStore("plugins");
      if (!database.objectStoreNames.contains("runs"))
        database.createObjectStore("runs");
      if (!database.objectStoreNames.contains("runLinks"))
        database.createObjectStore("runLinks");
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
      if (!database.objectStoreNames.contains("achievements"))
        database.createObjectStore("achievements");
      if (!database.objectStoreNames.contains("appStats"))
        database.createObjectStore("appStats");
    },
  });
  async plugins(): Promise<WorkshopInstallation[]> {
    return (await this.database).getAll("plugins");
  }
  async installPlugin(input: WorkshopPack): Promise<void> {
    const pack = workshopPackSchema.parse(input),
      db = await this.database,
      tx = db.transaction("plugins", "readwrite"),
      previous = await tx.store.get(pack.id);
    if (
      previous &&
      workshopVersionCompare(pack.version, previous.pack.version) < 0
    )
      throw Error("不能用旧版覆盖已安装插件");
    await tx.store.put(
      { pack, enabled: previous?.enabled ?? true, installedAt: Date.now() },
      pack.id,
    );
    await tx.done;
  }
  async enablePlugin(id: string, enabled: boolean): Promise<void> {
    const db = await this.database,
      tx = db.transaction("plugins", "readwrite"),
      item = await tx.store.get(id);
    if (!item) throw Error("插件未安装");
    await tx.store.put({ ...item, enabled }, id);
    await tx.done;
  }
  async removePlugin(id: string): Promise<void> {
    await (await this.database).delete("plugins", id);
  }
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
  async saveRun(id: string, save: LocalSave): Promise<void> {
    await (await this.database).put("runs", save, id);
  }
  async run(id: string): Promise<LocalSave | undefined> {
    return (await this.database).get("runs", id);
  }
  async linkRun(link: RunLink): Promise<void> {
    await (await this.database).put("runLinks", link, link.id);
  }
  async runLinks(): Promise<RunLink[]> {
    return (await this.database).getAll("runLinks");
  }
  async abandonRun(id: string): Promise<void> {
    const db = await this.database,
      tx = db.transaction(["runs", "runLinks"], "readwrite");
    await tx.objectStore("runs").delete(id);
    await tx.objectStore("runLinks").delete(id);
    await tx.done;
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
  async archiveRecords(records: ReplayRecord[]): Promise<ReplayRecord[]> {
    records = records.filter((record) => !this.observed.has(recordKey(record)));
    if (!records.length) return [];
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
    return records;
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
  private achievementProfile: string | null = null;
  achievementProfileId(): string {
    if (this.achievementProfile) return this.achievementProfile;
    const key = "onlinebg.achievement-profile";
    const saved =
      typeof localStorage === "undefined" ? "" : localStorage.getItem(key);
    if (saved) {
      this.achievementProfile = saved;
      return saved;
    }
    const profile = randomId();
    if (typeof localStorage !== "undefined") localStorage.setItem(key, profile);
    this.achievementProfile = profile;
    return profile;
  }
  async achievements(): Promise<AchievementUnlock[]> {
    const profile = this.achievementProfileId();
    const all = await (await this.database).getAll("achievements");
    return all.filter((item) => item.profileId === profile);
  }
  async appStats(): Promise<AppStats> {
    const profile = this.achievementProfileId();
    return (
      (await (await this.database).get("appStats", profile)) ??
      defaultAppStats(profile)
    );
  }
  async updateAppStats(
    update: (stats: AppStats) => AppStats,
  ): Promise<AppStats> {
    const database = await this.database;
    const transaction = database.transaction("appStats", "readwrite");
    const profile = this.achievementProfileId();
    const current =
      (await transaction.store.get(profile)) ?? defaultAppStats(profile);
    const next = { ...update(current), profileId: profile };
    await transaction.store.put(next, profile);
    await transaction.done;
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("onlinebg-app-stats"));
    return next;
  }
  async unlockAchievements(
    incoming: AchievementUnlock[],
  ): Promise<AchievementUnlock[]> {
    if (!incoming.length) return [];
    const database = await this.database;
    const transaction = database.transaction("achievements", "readwrite");
    const store = transaction.objectStore("achievements");
    const created: AchievementUnlock[] = [];
    for (const item of incoming) {
      if (!achievementById.has(item.achievementId)) continue;
      const key = `${item.profileId}:${item.achievementId}`;
      const previous = await store.get(key);
      if (previous) {
        if (
          previous.evidence.replayFingerprint ===
          item.evidence.replayFingerprint
        )
          continue;
        await store.put(
          {
            ...previous,
            lastAt: item.lastAt,
            count: previous.count + 1,
            evidence: item.evidence,
          },
          key,
        );
        continue;
      }
      await store.put(item, key);
      created.push(item);
    }
    await transaction.done;
    if (created.length && typeof window !== "undefined")
      window.dispatchEvent(new Event("onlinebg-achievements"));
    return created;
  }
}
