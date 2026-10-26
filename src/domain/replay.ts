import { expeditionMapSchema } from "./expedition/adventure-types";
import { maxRoomSeats } from "./catalogue";
import { graphwarShotSchema, graphwarInitialSchema } from "./graphwar/types";
import { GraphwarRules } from "./graphwar/rules";
import { bannerSchema, chatEventSchema } from "./banner";
import { avatarSchema } from "./avatar";
import { z } from "zod";
import { actionSchema, configSchema } from "./protocol";
import { gameCatalogue } from "./catalogue";
import { GameEngine } from "./engine";

export const replaySchema = z.object({
  format: z.literal(1),
  graphwarInitial: graphwarInitialSchema.optional(),
  expeditionMap: expeditionMapSchema.optional(),
  room: z.string().min(1).max(12),
  config: configSchema,
  rulesVersion: z.string(),
  names: z.array(z.string().max(24)).max(maxRoomSeats),
  avatars: z.array(avatarSchema).max(maxRoomSeats).optional(),
  seed: z.string().max(150),
  startedAt: z.number().int(),
  social: z
    .array(
      z.union([
        z.object({
          frame: z.number().int().min(0).max(20000),
          banner: bannerSchema,
          name: z.string().max(24),
        }),
        z.object({
          frame: z.number().int().min(0).max(20000),
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
    .max(20000),
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
    this.record = replaySchema.parse(input);
    if (
      this.record.rulesVersion !==
      gameCatalogue[this.record.config.kind].version
    )
      throw new Error("该记录需要不同版本的游戏规则");
    if (
      this.record.names.length !==
      this.record.config.humans + this.record.config.ai.length
    )
      throw new Error("记录席位不完整");
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
            expedition: this.record.config.expedition,
            expeditionMap: this.record.expeditionMap,
            expeditionLayout: this.record.expeditionMap ? 2 : 1,
            dominion: this.record.config.dominion,
            mahjong: this.record.config.mahjong,
            graphwar: this.record.config.graphwar,
            graphwarInitial:
              this.record.config.kind === "graphwar"
                ? graphwarInitialSchema.parse(this.record.graphwarInitial)
                : undefined,
          },
        );
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
