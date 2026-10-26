import { DatabaseSync } from "node:sqlite";
import { Room, type RoomArchive } from "../domain/room";

export class RoomStore {
  private database: DatabaseSync;
  private writtenRuns = new Map<string, RoomArchive>();
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(
      "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, archive TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, archive TEXT NOT NULL)",
    );
  }
  load(): Room[] {
    return this.database
      .prepare("SELECT archive FROM rooms")
      .all()
      .map((row) =>
        Room.restore(JSON.parse(String(row.archive)) as RoomArchive),
      );
  }
  save(room: Room): void {
    this.database
      .prepare(
        "INSERT INTO rooms (id, archive) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET archive = excluded.archive",
      )
      .run(room.id, JSON.stringify(room.export()));
  }
  loadRuns(): [string, RoomArchive][] {
    return this.database
      .prepare("SELECT id, archive FROM runs")
      .all()
      .map((row) => [
        String(row.id),
        JSON.parse(String(row.archive)) as RoomArchive,
      ]);
  }
  saveRuns(runs: Map<string, RoomArchive>): void {
    for (const row of this.database.prepare("SELECT id FROM runs").all())
      if (!runs.has(String(row.id))) {
        this.database.prepare("DELETE FROM runs WHERE id = ?").run(row.id);
        this.writtenRuns.delete(String(row.id));
      }
    const put = this.database.prepare(
      "INSERT INTO runs (id, archive) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET archive = excluded.archive",
    );
    for (const [id, archive] of runs)
      if (this.writtenRuns.get(id) !== archive) {
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
