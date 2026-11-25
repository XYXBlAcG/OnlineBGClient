import type { LlmProvider } from "companion-core";
import type { AiProviderSettings } from "../../domain/companion";
import {
  TableMind,
  createTableMind,
  type TableMindOptions,
  type TableMindRoom,
} from "./runtime";

export class RoomTableMinds {
  private owners = new WeakMap<TableMindRoom, () => boolean>();
  private sessions = new WeakMap<TableMindRoom, TableMind>();
  constructor(
    private options: TableMindOptions = {},
    private factory = () => createTableMind(this.options),
  ) {}
  get(room: TableMindRoom): TableMind {
    let mind = this.sessions.get(room);
    if (!mind) {
      mind = this.factory();
      this.sessions.set(room, mind);
    }
    const owner = this.owners.get(room);
    if (owner && !owner()) {
      mind.clear();
      this.owners.delete(room);
    }
    return mind;
  }
  configure(
    room: TableMindRoom,
    provider: LlmProvider,
    settings: AiProviderSettings,
    owner: () => boolean,
  ): void {
    this.get(room).configure(provider, settings);
    this.owners.set(room, owner);
  }
  clear(room: TableMindRoom): void {
    this.sessions.get(room)?.clear();
    this.owners.delete(room);
  }
  release(room: TableMindRoom): void {
    this.clear(room);
    this.sessions.delete(room);
    this.owners.delete(room);
  }
}
