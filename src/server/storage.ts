import {
  openSync,
  closeSync,
  fchmodSync,
  chmodSync,
  existsSync,
} from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { Room, type RoomArchive } from "../domain/room";

export class RoomStore {
  private database: DatabaseSync;
  private unreadableRuns = new Set<string>();
  private writtenRuns = new Map<string, RoomArchive>();
  constructor(path: string) {
    const descriptor = openSync(path, "a", 0o600);
    try {
      if (process.platform !== "win32") {
        fchmodSync(descriptor, 0o600);
        for (const suffix of ["-wal", "-shm"])
          if (existsSync(`${path}${suffix}`))
            chmodSync(`${path}${suffix}`, 0o600);
      }
    } finally {
      closeSync(descriptor);
    }
    this.database = new DatabaseSync(path);
    this.database.exec(
      "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, archive TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, archive TEXT NOT NULL)",
    );
  }
  load(): Room[] {
    return this.readArchives("rooms", (_id, archive) => Room.restore(archive));
  }
  save(room: Room): void {
    this.database
      .prepare(
        "INSERT INTO rooms (id, archive) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET archive = excluded.archive",
      )
      .run(room.id, JSON.stringify(room.export()));
  }
  loadRuns(): [string, RoomArchive][] {
    this.unreadableRuns.clear();
    return this.readArchives("runs", (id, archive) => {
      const room = Room.restore(archive);
      if (room.state?.kind !== "expedition" || room.state.view.runId !== id)
        throw new Error("远征存档身份不匹配");
      return [id, archive];
    });
  }
  private readArchives<T>(
    table: "rooms" | "runs",
    restore: (id: string, archive: RoomArchive) => T,
  ): T[] {
    const entries: T[] = [];
    for (const row of this.database.prepare(`SELECT id, archive FROM ${table}`).all()) {
      const id = String(row.id);
      try {
        const archive = JSON.parse(String(row.archive)) as RoomArchive;
        if (table === "rooms" && archive.id !== id) throw new Error("房间存档身份不匹配");
        entries.push(restore(id, archive));
      } catch {
        if (table === "runs") this.unreadableRuns.add(id);
        console.warn("存档读取失败，已保留原记录", { table, id });
      }
    }
    return entries;
  }
  saveRuns(runs: Map<string, RoomArchive>): void {
    for (const row of this.database.prepare("SELECT id FROM runs").all())
      if (!runs.has(String(row.id)) && !this.unreadableRuns.has(String(row.id))) {
        this.database.prepare("DELETE FROM runs WHERE id = ?").run(row.id);
        this.writtenRuns.delete(String(row.id));
      }
    const put = this.database.prepare(
      "INSERT INTO runs (id, archive) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET archive = excluded.archive",
    );
    for (const [id, archive] of runs)
      if (!this.unreadableRuns.has(id) && this.writtenRuns.get(id) !== archive) {
        put.run(id, JSON.stringify(archive));
        this.writtenRuns.set(id, archive);
      }
  }
  remove(id: string): void {
    this.database.prepare("DELETE FROM rooms WHERE id = ?").run(id);
  }
  close(): void {
    this.database.close();
  }
}
