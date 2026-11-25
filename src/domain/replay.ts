import { arcadeScenarioSchema } from "./arcade/scenario";
import { partyEventSchema } from "./party/model";
import { expeditionMapSchema } from "./expedition/adventure-types";
import { maxRoomSeats } from "./catalogue";
import { graphwarShotSchema, graphwarInitialSchema } from "./graphwar/types";
import { poolShotSchema } from "./pool/types";
import { PoolRules } from "./pool/rules";
import { GraphwarRules } from "./graphwar/rules";
import { bannerSchema, chatEventSchema } from "./banner";
import { avatarSchema } from "./avatar";
import { z } from "zod";
import { actionSchema, configSchema } from "./protocol";
import { drawWordSchema } from "./drawguess/words";
import { gameCatalogue, gameRulesVersion } from "./catalogue";
import { GameEngine } from "./engine";
import { challengeBoardSchema } from "./challenges";
import { upgradeDrawRecord } from "./drawguess/legacy";
import { classicGolfCourses, generateLegacyGolfCourses } from "./golf/courses";
import { golfCourseSchema, golfHoleCount } from "./golf/types";

export const replayEventLimit = 40_000;

export const replaySchema = z.object({
  format: z.literal(1),
  arcadeScenario: arcadeScenarioSchema.optional(),
  arcadeRunId: z.uuid().optional(),
  expeditionRunId: z.string().max(150).optional(),
  challenges: challengeBoardSchema.optional(),
  graphwarInitial: graphwarInitialSchema.optional(),
  expeditionMap: expeditionMapSchema.optional(),
  expeditionTuning: z.union([z.literal(1), z.literal(2)]).optional(),
  expeditionCampaign: z.union([z.literal(1), z.literal(2)]).optional(),
  drawWords: z.array(drawWordSchema).max(1000).optional(),
  golfCourses: z.array(golfCourseSchema).min(1).max(golfHoleCount).optional(),
  truncated: z.boolean().optional(),
  drawStart: z.object({
    round: z.number().int().min(0).max(999),
    scores: z.array(z.number().int().nonnegative()).max(maxRoomSeats),
    sessionStartedAt: z.number().int().optional(),
  }).optional(),
  room: z.string().min(1).max(12),
  config: configSchema,
  rulesVersion: z.string(),
  names: z.array(z.string().max(24)).max(maxRoomSeats),
  avatars: z.array(avatarSchema).max(maxRoomSeats).optional(),
  seed: z.string().max(150),
  startedAt: z.number().int(),
  memberIds: z.array(z.string().max(100)).max(maxRoomSeats).optional(),
  party: z
    .array(
      z.object({
        frame: z.number().int().min(0).max(replayEventLimit),
        event: partyEventSchema,
      }),
    )
    .max(10000)
    .optional(),
  social: z
    .array(
      z.union([
        z.object({
          frame: z.number().int().min(0).max(replayEventLimit),
          banner: bannerSchema,
          name: z.string().max(24),
        }),
        z.object({
          frame: z.number().int().min(0).max(replayEventLimit),
          message: chatEventSchema,
          name: z.string().max(24),
        }),
      ]),
    )
    .max(1000)
    .optional(),
  events: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("action"),
          actor: z
            .number()
            .int()
            .min(0)
            .max(maxRoomSeats - 1),
          action: actionSchema,
          graphwarShot: graphwarShotSchema.optional(),
          poolShot: poolShotSchema.optional(),
          seed: z.string().max(150),
          version: z.number().int(),
        }),
        z.object({
          type: z.literal("resolution"),
          seed: z.string().max(150),
          version: z.number().int(),
        }),
      ]),
    )
    .max(replayEventLimit),
});
export type ReplayRecord = z.infer<typeof replaySchema>;
export class Replay {
  readonly record: ReplayRecord;
  readonly engine = new GameEngine();
  constructor(input: unknown) {
    const header = z
      .object({
        config: z.object({ kind: z.string() }),
        rulesVersion: z.string(),
      })
      .safeParse(input);
    if (
      header.success &&
      header.data.config.kind === "graphwar" &&
      header.data.rulesVersion !== gameCatalogue.graphwar.version
    )
      throw new Error(
        "该 Graphwar 记录使用旧版规则，请使用对应版本客户端打开；原记录保留",
      );
    this.record = replaySchema.parse(upgradeDrawRecord(input));
    if (
      this.record.rulesVersion !==
      gameRulesVersion(this.record.config.kind, this.record.config.mahjong.mode)
    )
      throw new Error("该记录需要不同版本的游戏规则");
    if (this.record.drawStart && (
      this.record.config.kind !== "drawguess" ||
      this.record.config.drawguess?.mode !== "fayu" ||
      this.record.drawStart.scores.length !== this.record.names.length
    )) throw new Error("法语回放的起始分数无效");
    if (
      this.record.names.length !==
      this.record.config.humans + this.record.config.ai.length
    )
      throw new Error("记录席位不完整");
  }
  get golfCourses() {
    const { golfCourses, arcadeScenario, events, seed } = this.record;
    if (golfCourses) return golfCourses;
    if (arcadeScenario?.kind === "golf") return classicGolfCourses.slice(0, 1);
    const usesFiveHoles = events.some(({ type, ...event }) =>
      type === "action" && "action" in event && event.action.type === "golf-next" &&
      event.action.hole >= classicGolfCourses.length - 1,
    );
    return usesFiveHoles ? generateLegacyGolfCourses(seed) : classicGolfCourses;
  }
  private checkpoints = new Map<number, import("./types").GameState>();
  private last:
    { index: number; state: import("./types").GameState } | undefined;
  frame(index: number): import("./types").GameState {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > this.record.events.length
    )
      throw new Error("回放帧超出范围");
    const cached = [
      ...this.checkpoints,
      ...(this.last ? [[this.last.index, this.last.state] as const] : []),
    ]
      .filter(([i]) => i <= index)
      .sort(([a], [b]) => b - a)[0];
    let cursor = cached?.[0] ?? 0;
    let state = cached
      ? structuredClone(cached[1])
      : this.engine.create(
          this.record.config.kind,
          this.record.names.length,
          this.record.seed,
          this.record.config.team,
          {
            ...this.record.config,
            arcadeScenario: this.record.arcadeScenario,
            golfCourses: this.record.config.kind === "golf" ? this.golfCourses : undefined,
            expeditionMap: this.record.expeditionMap,
            expeditionTuning: this.record.expeditionTuning ?? 1,
            expeditionCampaign: this.record.expeditionCampaign ?? 1,
            expeditionLayout: this.record.expeditionMap ? 2 : 1,
            drawguess: {
              mode: this.record.config.drawguess?.mode ?? "classic",
              ...(this.record.drawWords ? { words: this.record.drawWords } : {}),
            },
            graphwarInitial:
              this.record.config.kind === "graphwar"
                ? graphwarInitialSchema.parse(this.record.graphwarInitial)
                : undefined,
          },
        );
    if (
      !cached &&
      state.kind === "drawguess" &&
      state.mode === "fayu" &&
      this.record.drawStart
    ) {
      state.view.round = this.record.drawStart.round;
      state.view.scores = [...this.record.drawStart.scores];
    }
    while (cursor < index) {
      const event = this.record.events[cursor++];
      state =
        event.type === "action"
          ? state.kind === "graphwar" && event.action.type === "graphwar-fire"
            ? new GraphwarRules(() => 0).apply(
                state,
                event.actor,
                event.action,
                graphwarShotSchema.parse(event.graphwarShot),
              )
            : state.kind === "pool" &&
                event.action.type === "pool-shot" &&
                event.poolShot
              ? new PoolRules(() => 0).apply(
                  state,
                  event.actor,
                  event.action,
                  poolShotSchema.parse(event.poolShot),
                )
              : this.engine.apply(state, event.actor, event.action, event.seed)
          : this.engine.resolve(state, event.seed);
      if (cursor % 32 === 0) {
        this.checkpoints.set(cursor, structuredClone(state));
        if (this.checkpoints.size > 8)
          this.checkpoints.delete(this.checkpoints.keys().next().value!);
      }
    }
    this.last = { index, state: structuredClone(state) };
    return state;
  }
  frames() {
    return Array.from({ length: this.record.events.length + 1 }, (_, index) =>
      this.frame(index),
    );
  }
}
