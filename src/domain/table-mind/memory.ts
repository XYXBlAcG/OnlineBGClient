import type { TableEvent } from "./model";

export interface TableMemoryFact {
  id: string;
  kind: TableEvent["kind"];
  actor?: string;
  actorName?: string;
  text: string;
  at: number;
}

export class TableMemory {
  private facts: TableMemoryFact[] = [];

  observe(events: TableEvent[]): void {
    for (const event of events) {
      if (
        !event.public ||
        !["action", "chat", "achievement"].includes(event.kind)
      )
        continue;
      this.facts.push({
        id: event.id,
        kind: event.kind,
        actor: event.actor,
        actorName: event.actorName,
        text: event.actorName
          ? `${event.actorName}：${event.label}`
          : event.label,
        at: event.at,
      });
    }
    if (this.facts.length > 200) this.facts.splice(0, this.facts.length - 200);
  }

  clear(): void {
    this.facts = [];
  }

  recall(limit = 6): TableMemoryFact[] {
    return this.facts.slice(-limit);
  }
}
