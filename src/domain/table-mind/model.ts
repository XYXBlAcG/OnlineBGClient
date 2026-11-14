export type TableEventKind =
  | "game-start"
  | "action"
  | "chat"
  | "achievement"
  | "game-end";

export interface TableEvent {
  id: string;
  seq: number;
  version: number;
  at: number;
  kind: TableEventKind;
  actor?: string;
  label: string;
  public: boolean;
}
