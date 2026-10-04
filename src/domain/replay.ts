import { z } from "zod";
import { actionSchema, configSchema } from "./protocol";
import { gameCatalogue } from "./catalogue";
import { GameEngine } from "./engine";

export const replaySchema = z.object({
  format: z.literal(1),
  room: z.string().min(1).max(12),
  config: configSchema,
  rulesVersion: z.string(),
  names: z.array(z.string().max(24)).max(8),
  seed: z.string().max(150),
  startedAt: z.number().int(),
  events: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("action"),
          actor: z.number().int().min(0).max(7),
          action: actionSchema,
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
  frames() {
    let state = this.engine.create(
      this.record.config.kind,
      this.record.names.length,
      this.record.seed,
      this.record.config.team,
    );
    const frames = [structuredClone(state)];
    for (const event of this.record.events) {
      state =
        event.type === "action"
          ? this.engine.apply(state, event.actor, event.action, event.seed)
          : this.engine.resolve(state, event.seed);
      frames.push(structuredClone(state));
    }
    return frames;
  }
}
