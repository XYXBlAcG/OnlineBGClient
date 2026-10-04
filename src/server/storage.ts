import { DatabaseSync } from 'node:sqlite';
import { Room, type RoomArchive } from '../domain/room';

export class RoomStore {
  private database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, archive TEXT NOT NULL)');
  }
  load(): Room[] {
    return this.database.prepare('SELECT archive FROM rooms').all().map(row => Room.restore(JSON.parse(String(row.archive)) as RoomArchive));
  }
  save(room: Room): void {
    this.database.prepare('INSERT INTO rooms (id, archive) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET archive = excluded.archive').run(room.id, JSON.stringify(room.export()));
  }
  remove(id: string): void { this.database.prepare('DELETE FROM rooms WHERE id = ?').run(id); }
  close(): void { this.database.close(); }
}
