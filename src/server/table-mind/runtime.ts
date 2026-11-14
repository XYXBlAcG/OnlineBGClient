import {
  markSpoken,
  sanitizeReply,
  type CompanionProfile,
  type LlmProvider,
  type ParticipationState,
} from "companion-core";
import {
  buildCompanionView,
  type AiProviderSettings,
  type CompanionConfig,
  type PublicRoomContext,
} from "../../domain/companion";
import { gameCatalogue } from "../../domain/catalogue";
import type { ChatMessage } from "../../domain/protocol";
import type { Room } from "../../domain/room";
import type { TableEvent } from "../../domain/table-mind/model";
import { TableMemory } from "../../domain/table-mind/memory";
import { planSocialReaction } from "../../domain/table-mind/director";
import { buildDecisionPrompt } from "../../domain/table-mind/prompt";
import { buildSocialPrompt } from "../../domain/table-mind/social";
import { buildUnoSituation } from "../../domain/table-mind/perspectives/uno";
import type { AiResult } from "../../domain/types";
import { createLlmRunner } from "../llm-runner";
import { chooseCandidateWithLlm, parseCandidateChoice } from "../llm-seat";

export type TableAiRequest = NonNullable<ReturnType<Room["aiRequest"]>>;

export interface TableMindRoom {
  readonly id: string;
  readonly hasEnded: boolean;
  readonly playId: string | undefined;
  readonly config: { readonly companion: CompanionConfig };
  companionProfile(): CompanionProfile | null;
  publicContext(): PublicRoomContext;
  addCompanionMessage(triggerId: string, text: string): ChatMessage | undefined;
  drainTableEvents(): TableEvent[];
}

export interface TableMindRunner {
  readonly configured: boolean;
  configure(provider: LlmProvider, settings: AiProviderSettings): void;
  complete(
    system: string,
    user: string,
    maxOutputTokens?: number,
    timeoutMs?: number,
  ): Promise<string>;
}

export interface TableMindOptions {
  log?: (message: string) => void;
  publish?: (roomId: string) => void;
  now?: () => number;
}

export class TableMind {
  readonly timeline: TableEvent[] = [];
  readonly memory = new TableMemory();
  private readonly socialStates = new WeakMap<
    TableMindRoom,
    ParticipationState
  >();
  private readonly pendingSocial = new Set<string>();
  private readonly log: (message: string) => void;
  private readonly publish?: (roomId: string) => void;
  private readonly now: () => number;

  constructor(
    private readonly runner: TableMindRunner,
    options: TableMindOptions = {},
  ) {
    this.log = options.log ?? ((message) => console.error(message));
    this.publish = options.publish;
    this.now = options.now ?? Date.now;
  }

  get configured(): boolean {
    return this.runner.configured;
  }

  configure(provider: LlmProvider, settings: AiProviderSettings): void {
    this.runner.configure(provider, settings);
  }

  async tick(room: TableMindRoom): Promise<void> {
    const events = room.drainTableEvents();
    if (!events.length) return;
    this.remember(events);
    if (
      !this.runner.configured ||
      this.pendingSocial.has(room.id) ||
      room.hasEnded
    )
      return;
    const profile = room.companionProfile();
    const policy = room.config.companion.policy;
    if (!profile || !policy.enabled) return;
    const now = this.now();
    const state = this.stateFor(room, now);
    const event = planSocialReaction(
      events,
      profile,
      policy,
      state,
      now,
      room.id,
    );
    if (!event) return;
    this.pendingSocial.add(room.id);
    try {
      const context = room.publicContext();
      const view = buildCompanionView(
        context,
        profile,
        this.triggerFor(context, event),
      );
      const prompt = buildSocialPrompt(
        view,
        profile,
        this.timeline.slice(-8),
        this.memory.recall(8),
      );
      const text = sanitizeReply(
        await this.runner.complete(prompt.system, prompt.user, 120, 8000),
        { maxChars: 160 },
      );
      if (!text || room.hasEnded || !room.config.companion.policy.enabled)
        return;
      const message = room.addCompanionMessage(event.id, text);
      if (!message) return;
      const spokenAt = this.now();
      this.socialStates.set(
        room,
        markSpoken(this.stateFor(room, spokenAt), spokenAt),
      );
      this.publish?.(room.id);
    } catch (error) {
      this.log(
        `AI 回复失败：${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.pendingSocial.delete(room.id);
    }
  }

  async onDecision(
    room: TableMindRoom,
    request: TableAiRequest,
    result: AiResult,
  ): Promise<AiResult> {
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

  private remember(events: TableEvent[]): void {
    this.timeline.push(...events);
    if (this.timeline.length > 500)
      this.timeline.splice(0, this.timeline.length - 500);
    this.memory.observe(events);
  }

  private stateFor(room: TableMindRoom, now: number): ParticipationState {
    const playId = room.playId ?? "lobby";
    const existing = this.socialStates.get(room);
    if (existing?.playId === playId) return existing;
    const next: ParticipationState = {
      playId,
      lastSpokenAt: 0,
      minuteStartedAt: now,
      spokenThisMinute: 0,
      spokenThisPlay: 0,
    };
    this.socialStates.set(room, next);
    return next;
  }

  private triggerFor(context: PublicRoomContext, event: TableEvent): ChatMessage {
    const existing = context.recentChat.find(
      (message) => message.id === event.id,
    );
    if (existing) return existing;
    return {
      type: "text",
      id: event.id,
      text: event.label,
      sequence: 0,
      sender: event.actor ?? "table",
      name: event.actorName ?? "牌桌",
      time: event.at,
    };
  }
}

export function createTableMind(options: TableMindOptions = {}): TableMind {
  return new TableMind(createLlmRunner(), options);
}
