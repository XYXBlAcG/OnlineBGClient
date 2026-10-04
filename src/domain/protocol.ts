import { actionSchema } from "./actions";
export { actionSchema } from "./actions";
import type { ReplayRecord } from "./replay";
import { z } from "zod";
import { gameCatalogue, gameKinds } from "./catalogue";
import type {
  Candidate,
  Decision,
  Difficulty,
  GameKind,
  GameState,
} from "./types";

export const configSchema = z
  .object({
    kind: z.enum(gameKinds),
    humans: z.number().int().min(1).max(8),
    ai: z
      .array(
        z.object({
          difficulty: z.enum(["easy", "normal", "hard"]),
          name: z.string().trim().max(24).default(""),
        }),
      )
      .max(7),
    aiDelayMs: z.number().int().min(0).max(5000).default(1500),
    team: z.boolean(),
    training: z.boolean(),
  })
  .refine(
    (value) =>
      value.humans + value.ai.length >= gameCatalogue[value.kind].minPlayers &&
      value.humans + value.ai.length <= gameCatalogue[value.kind].maxPlayers,
    "总席位超出该游戏人数范围",
  )
  .refine(
    (value) => gameCatalogue[value.kind].ai || !value.ai.length,
    "该游戏 AI 尚未接入",
  );
export type RoomConfig = z.infer<typeof configSchema>;
export const seatConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("human") }),
  z.object({
    type: z.literal("ai"),
    difficulty: z.enum(["easy", "normal", "hard"]),
    name: z.string().trim().max(24).default(""),
  }),
]);
export type SeatConfig = z.infer<typeof seatConfigSchema>;
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("restore-local") }),
  z.object({
    type: z.literal("create"),
    config: configSchema,
    name: z.string().trim().min(1).max(24),
  }),
  z.object({
    type: z.literal("join"),
    room: z.string().min(1).max(12),
    name: z.string().trim().min(1).max(24),
    token: z.string().max(100).optional(),
  }),
  z.object({
    type: z.literal("seat"),
    token: z.string(),
    index: z.number().int().min(1).max(7),
    config: seatConfigSchema,
  }),
  z.object({ type: z.literal("ready"), token: z.string(), ready: z.boolean() }),
  z.object({ type: z.literal("leave"), token: z.string() }),
  z.object({ type: z.literal("close"), token: z.string() }),
  z.object({ type: z.literal("start"), token: z.string() }),
  z.object({
    type: z.literal("tempo"),
    token: z.string(),
    delayMs: z.number().int().min(0).max(5000),
  }),
  z.object({ type: z.literal("end"), token: z.string() }),
  z.object({
    type: z.literal("action"),
    token: z.string(),
    id: z.string().min(1).max(100),
    version: z.number().int().min(0),
    action: actionSchema,
  }),
  z.object({
    type: z.literal("chat"),
    token: z.string(),
    id: z.string().min(1).max(100),
    text: z.string().trim().min(1).max(500),
  }),
  z.object({ type: z.literal("snapshot"), token: z.string() }),
]);
export type Command = z.infer<typeof commandSchema>;
export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  time: number;
}
export interface DecisionSummary {
  actor: number;
  label: string;
  difficulty: Difficulty;
  simulations: number;
  version: number;
}
export const protocolVersion = 1;
export interface Snapshot {
  apiVersion: number;
  rulesVersion: string;
  room: string;
  kind: GameKind;
  config: RoomConfig;
  version: number;
  actor: number;
  seats: {
    name: string;
    difficulty: Difficulty | null;
    online: boolean;
    ready: boolean;
  }[];
  state: GameState | null;
  candidates: Candidate[];
  chat: ChatMessage[];
  decisions: Decision[];
  summaries: DecisionSummary[];
  finished: boolean;
  resolving: boolean;
  paused: boolean;
  replay: ReplayRecord | null;
  records: ReplayRecord[];
}
export type Response =
  | { type: "session"; room: string; token: string; localTokens?: string[] }
  | { type: "snapshot"; snapshot: Snapshot }
  | { type: "error"; message: string }
  | { type: "ack"; id: string }
  | { type: "left" }
  | { type: "closed"; replay?: ReplayRecord | null };
