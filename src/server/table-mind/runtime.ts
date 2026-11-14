import type { LlmProvider } from "companion-core";
import type { AiProviderSettings } from "../../domain/companion";
import { gameCatalogue } from "../../domain/catalogue";
import type { TableEvent } from "../../domain/table-mind/model";
import { TableMemory } from "../../domain/table-mind/memory";
import { buildDecisionPrompt } from "../../domain/table-mind/prompt";
import { buildUnoSituation } from "../../domain/table-mind/perspectives/uno";
import type { AiResult } from "../../domain/types";
import type { ChatMessage } from "../../domain/protocol";
import type { Room } from "../../domain/room";
import {
  createCompanionRuntime,
  type CompanionRoomPort,
} from "../companion";
import { chooseCandidateWithLlm, parseCandidateChoice } from "../llm-seat";

export type TableAiRequest = NonNullable<ReturnType<Room["aiRequest"]>>;

export interface TableMindRoom extends CompanionRoomPort {
  drainTableEvents(): TableEvent[];
}

export interface TableMindRunner {
  readonly configured: boolean;
  configure(provider: LlmProvider, settings: AiProviderSettings): void;
  maybeReply(room: CompanionRoomPort, trigger: ChatMessage): Promise<void>;
  complete(
    system: string,
    user: string,
    maxOutputTokens?: number,
    timeoutMs?: number,
  ): Promise<string>;
}

export class TableMind {
  readonly timeline: TableEvent[] = [];
  readonly memory = new TableMemory();
  constructor(
    private readonly runner: TableMindRunner,
    private readonly log: (message: string) => void,
  ) {}

  get configured(): boolean {
    return this.runner.configured;
  }

  configure(provider: LlmProvider, settings: AiProviderSettings): void {
    this.runner.configure(provider, settings);
  }

  observe(room: TableMindRoom): void {
    const events = room.drainTableEvents();
    if (!events.length) return;
    this.timeline.push(...events);
    if (this.timeline.length > 500)
      this.timeline.splice(0, this.timeline.length - 500);
    this.memory.observe(events);
  }

  async onChat(room: TableMindRoom, trigger: ChatMessage): Promise<void> {
    this.observe(room);
    if (!this.runner.configured) return;
    await this.runner.maybeReply(room, trigger);
  }

  async onDecision(
    room: TableMindRoom,
    request: TableAiRequest,
    result: AiResult,
  ): Promise<AiResult> {
    this.observe(room);
    if (
      !this.runner.configured ||
      request.driver !== "llm" ||
      !result.audit ||
      result.audit.candidates.length <= 1
    )
      return result;
    try {
      if (request.observation.kind === "uno") {
        const situation = buildUnoSituation({
          observation: request.observation,
          actor: request.actor,
          candidates: result.audit.candidates,
          players: room.publicContext().players,
          events: this.timeline.slice(-12),
          memory: this.memory.recall(8),
        });
        const prompt = buildDecisionPrompt(situation);
        const text = await this.runner.complete(
          prompt.system,
          prompt.user,
          24,
          6000,
        );
        const index = parseCandidateChoice(text, prompt.candidates.length);
        if (index === null) return result;
        const action = result.audit.candidates[index]!.action;
        return {
          ...result,
          chosen: action,
          audit: {
            ...result.audit,
            chosen: action,
            assumptions: [
              ...result.audit.assumptions,
              `TableMind 基于 UNO 局面选择候选 #${index}。`,
            ],
          },
        };
      }
      const choice = await chooseCandidateWithLlm(
        this.runner,
        gameCatalogue[request.observation.kind].name,
        result.audit.candidates,
      );
      if (!choice) return result;
      return {
        ...result,
        chosen: choice.chosen,
        audit: {
          ...result.audit,
          chosen: choice.chosen,
          assumptions: [
            ...result.audit.assumptions,
            `LLM 从搜索候选中选择 #${choice.index}。`,
          ],
        },
      };
    } catch (error) {
      this.log(
        `LLM 决策失败，回退搜索：${error instanceof Error ? error.message : String(error)}`,
      );
      return result;
    }
  }
}

export function createTableMind(options: {
  publish?: (roomId: string) => void;
  log?: (message: string) => void;
} = {}): TableMind {
  const log = options.log ?? ((message) => console.error(message));
  return new TableMind(
    createCompanionRuntime({ publish: options.publish, log }),
    log,
  );
}
