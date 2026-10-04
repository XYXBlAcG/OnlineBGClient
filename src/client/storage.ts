import { openDB, type DBSchema } from "idb";
import type { RoomArchive } from "../domain/room";
import type { ReplayRecord } from "../domain/replay";

export interface LocalSave {
  room: RoomArchive;
  tokens: string[];
  token: string;
}
interface ClientDatabase extends DBSchema {
  local: { key: string; value: LocalSave };
  records: { key: string; value: ReplayRecord };
}
export class ClientStore {
  private database = openDB<ClientDatabase>("onlinebg-client", 1, {
    upgrade(database) {
      database.createObjectStore("local");
      database.createObjectStore("records");
    },
  });
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
