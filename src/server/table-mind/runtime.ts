import {
  LlmError,
  markSpoken,
  sanitizeReply,
  type CompanionProfile,
  type LlmProvider,
  type ParticipationState,
} from "companion-core";
import {
  supportsLlmDecisions,
  buildCompanionView,
  type AiProviderSettings,
  type CompanionConfig,
  type PublicRoomContext,
} from "../../domain/companion";
import type { ChatMessage } from "../../domain/protocol";
import type { Room } from "../../domain/room";
import type { TableEvent } from "../../domain/table-mind/model";
import { TableMemory } from "../../domain/table-mind/memory";
import { planSocialReaction } from "../../domain/table-mind/director";
import { buildDecisionPrompt } from "../../domain/table-mind/prompt";
import { buildSocialPrompt } from "../../domain/table-mind/social";
import { buildUnoSituation } from "../../domain/table-mind/perspectives/uno";
import type { AiFallbackReason, AiResult } from "../../domain/types";
import { createLlmRunner } from "../llm-runner";
import { parseCandidateChoice } from "../llm-seat";

export type TableAiRequest = NonNullable<ReturnType<Room["aiRequest"]>>;

export interface TableMindRoom {
  readonly id: string;
  readonly hasEnded: boolean;
  readonly paused: boolean;
  readonly version: number;
  readonly playId: string | undefined;
  readonly config: { readonly companion: CompanionConfig };
  companionProfile(): CompanionProfile | null;
  publicContext(): PublicRoomContext;
  addCompanionMessage(triggerId: string, text: string): ChatMessage | undefined;
  drainTableEvents(): TableEvent[];
}

export interface TableMindRunner {
  readonly configured: boolean;
  readonly settings: AiProviderSettings;
  clear(): void;
  configure(provider: LlmProvider, settings: AiProviderSettings): void;
  complete(
    system: string,
    user: string,
    maxOutputTokens?: number,
    timeoutMs?: number,
    signal?: AbortSignal,
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
  private roomId?: string;
  private playId?: string;
  private socialController: AbortController | null = null;
  private decisionController: AbortController | null = null;
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
    this.cancel();
    this.runner.configure(provider, settings);
  }

  clear(): void {
    this.cancel();
    this.runner.clear();
  }

  cancel(): void {
    this.socialController?.abort();
    this.decisionController?.abort();
    this.socialController = null;
    this.decisionController = null;
  }

  reconcile(room: TableMindRoom): void {
    if (this.roomId && this.roomId !== room.id)
      throw new Error("AI 运行时不属于该房间");
    this.roomId = room.id;
    const playId = room.playId ?? "lobby";
    if (this.playId !== playId) {
      this.cancel();
      this.timeline.length = 0;
      this.memory.clear();
      this.playId = playId;
    }
    if (room.hasEnded || room.paused) this.cancel();
    if (!room.config.companion.policy.enabled) {
      this.socialController?.abort();
      this.socialController = null;
    }
  }

  async tick(room: TableMindRoom): Promise<void> {
    this.reconcile(room);
    const events = room.drainTableEvents().filter((event) => event.public);
    this.remember(events);
    if (
      !events.length ||
      !this.runner.configured ||
      this.socialController ||
      room.hasEnded ||
      room.paused
    )
      return;
    const profile = room.companionProfile();
    const policy = room.config.companion.policy;
    if (!profile || !policy.enabled) return;
    const event = planSocialReaction(
      events,
      profile,
      policy,
      this.stateFor(room, this.now()),
      this.now(),
      room.id,
    );
    if (!event) return;
    const active = new AbortController();
    this.socialController = active;
    const playId = room.playId;
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
        this.runner.settings,
      );
      const text = sanitizeReply(
        await this.runner.complete(
          prompt.system,
          prompt.user,
          120,
          undefined,
          active.signal,
        ),
        { maxChars: 160 },
      );
      if (
        active.signal.aborted ||
        !text ||
        room.playId !== playId ||
        room.hasEnded ||
        room.paused ||
        !room.config.companion.policy.enabled
      )
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
      if (!active.signal.aborted)
        this.log(
          `AI 回复失败：${error instanceof LlmError ? error.code : "provider-error"}`,
        );
    } finally {
      if (this.socialController === active) this.socialController = null;
    }
  }

  async onDecision(
    room: TableMindRoom,
    request: TableAiRequest,
    result: AiResult,
    signal?: AbortSignal,
  ): Promise<AiResult> {
    this.reconcile(room);
    if (request.driver !== "llm") return { ...result, source: "search" };
    const fallback = (reason: AiFallbackReason): AiResult => ({
      ...result,
      source: "search-fallback",
      fallbackReason: reason,
    });
    if (!supportsLlmDecisions(request.observation.kind))
      return fallback("unsupported");
    if (!this.runner.configured) return fallback("unconfigured");
    const candidates = result.choices;
    if (!candidates || candidates.length <= 1)
      return { ...result, source: "search" };
    this.decisionController?.abort();
    const active = new AbortController();
    this.decisionController = active;
    const combined = signal
      ? AbortSignal.any([active.signal, signal])
      : active.signal;
    const playId = room.playId;
    try {
      if (request.observation.kind !== "uno") return fallback("unsupported");
      const situation = buildUnoSituation({
        observation: request.observation,
        actor: request.actor,
        candidates,
        players: room.publicContext().players,
        events: this.timeline.slice(-12),
        memory: this.memory.recall(8),
      });
      const prompt = buildDecisionPrompt(situation, this.runner.settings);
      const text = await this.runner.complete(
        prompt.system,
        prompt.user,
        24,
        undefined,
        combined,
      );
      if (
        combined.aborted ||
        room.playId !== playId ||
        room.version !== request.version ||
        room.hasEnded ||
        room.paused
      )
        return fallback("cancelled");
      const index = parseCandidateChoice(text, prompt.candidates.length);
      if (index === null) return fallback("invalid-output");
      const action = candidates[index].action;
      return {
        ...result,
        chosen: action,
        source: "llm",
        ...(result.audit
          ? {
              audit: {
                ...result.audit,
                chosen: action,
                assumptions: [
                  ...result.audit.assumptions,
                  `TableMind 基于 UNO 局面选择候选 #${index}。`,
                ],
              },
            }
          : {}),
      };
    } catch (error) {
      const reason: AiFallbackReason = combined.aborted
        ? "cancelled"
        : error instanceof LlmError && error.code === "timeout"
          ? "timeout"
          : error instanceof LlmError && error.code === "invalid-output"
            ? "invalid-output"
            : "provider-error";
      if (reason !== "cancelled") this.log(`LLM 决策回退搜索：${reason}`);
      return fallback(reason);
    } finally {
      if (this.decisionController === active) this.decisionController = null;
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

  private triggerFor(
    context: PublicRoomContext,
    event: TableEvent,
  ): ChatMessage {
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
