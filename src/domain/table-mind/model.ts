import type { Action } from "../types";

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
  actorName?: string;
  label: string;
  public: boolean;
  payload?: Action;
}

export interface TableSituation {
  scene: {
    game: string;
    phase: string;
    players: string[];
    actor: string;
  };
  selfFacts: string[];
  publicFacts: string[];
  recentEvents: string[];
  recentChat: string[];
  memory: string[];
  candidates: Array<{
    id: string;
    label: string;
    detail: string;
  }>;
  task: string;
}
