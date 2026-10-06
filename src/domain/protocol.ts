import type { ComputeDiagnostic } from "./compute-diagnostics";
import type { AiComputation } from "./performance";
import { performanceSchema } from "./performance";
import { interactionSchema, type InteractionEvent } from "./social";
export type { ChatMessage } from "./social";
import type { ChatMessage } from "./social";
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
    humans: z.number().int().min(0).max(8),
    ai: z
      .array(
        z.object({
          difficulty: z.enum(["easy", "normal", "hard"]),
          name: z.string().trim().max(24).default(""),
        }),
      )
      .max(8),
    aiDelayMs: z.number().int().min(0).max(5000).default(1500),
    team: z.boolean(),
    training: z.boolean(),
    auditEnabled: z.boolean().default(false),
    catanTrades: z.boolean().default(true),
    performance: performanceSchema.default({ mode: "auto", threads: 8 }),
  })
  .refine(
    (value) =>
      value.humans + value.ai.length >= gameCatalogue[value.kind].minPlayers &&
      value.humans + value.ai.length <= gameCatalogue[value.kind].maxPlayers,
    "总席位超出该游戏人数范围",
  )
  .refine(
    (value) => value.humans > 0 || value.kind === "tq",
    "仅跳棋支持全 AI 对战",
  )
  .refine(
    (value) => gameCatalogue[value.kind].ai || !value.ai.length,
    "该游戏 AI 尚未接入",
  );
export type RoomConfig = z.infer<typeof configSchema>;
export const roomSetupSchema = z.object({
  config: configSchema,
  retain: z.array(z.string()).max(8),
  members: z.array(z.string()).max(8),
  endCurrent: z.boolean(),
});
export type RoomSetup = z.infer<typeof roomSetupSchema>;
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
    hostOnly: z.boolean().optional(),
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
  z.object({
    type: z.literal("game"),
    token: z.string(),
    setup: roomSetupSchema,
  }),
  z.object({
    type: z.literal("computation"),
    token: z.string(),
    audit: z.boolean(),
    performance: performanceSchema,
  }),
  z.object({
    type: z.literal("ai-run"),
    token: z.string(),
    enabled: z.boolean(),
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
  z.object({
    type: z.literal("interaction"),
    token: z.string(),
    id: z.string().min(1).max(100),
    target: z.number().int().min(0).max(7),
    kind: interactionSchema,
  }),
  z.object({ type: z.literal("snapshot"), token: z.string() }),
]);
export type Command = z.infer<typeof commandSchema>;
export interface DecisionSummary {
  actor: number;
  label: string;
  difficulty: Difficulty;
  simulations: number;
  version: number;
}
export const protocolVersion = 7;
export interface Snapshot {
  apiVersion: number;
  rulesVersion: string;
  room: string;
  kind: GameKind;
  config: RoomConfig;
  version: number;
  actor: number;
  canManage: boolean;
  playing: boolean;
  host: { id: string; name: string; online: boolean } | null;
  seats: {
    id: string;
    name: string;
    difficulty: Difficulty | null;
    online: boolean;
    ready: boolean;
  }[];
  state: GameState | null;
  candidates: Candidate[];
  computation: AiComputation | null;
  aiPaused: boolean;
  chat: ChatMessage[];
  chatSequence: number;
  chatTotals: Record<string, number>;
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
  | { type: "snapshot"; snapshot: Snapshot; revision?: number }
  | {
      type: "patch";
      base: number;
      revision: number;
      changes: Partial<Snapshot>;
    }
  | { type: "activity"; pending: boolean; latencyMs?: number }
  | {
      type: "error";
      message: string;
      id?: string;
      diagnostic?: ComputeDiagnostic;
    }
  | { type: "interaction"; event: InteractionEvent }
  | { type: "ack"; id: string }
  | { type: "left" }
  | { type: "closed"; replay?: ReplayRecord | null };
