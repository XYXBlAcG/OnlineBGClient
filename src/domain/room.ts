import type {
  AiComputation,
  ComputeProgress,
  PerformanceSettings,
} from "./performance";
import type { ChatContent, InteractionEvent, InteractionKind } from "./social";
import { gameCatalogue } from "./catalogue";
import { Replay, type ReplayRecord } from "./replay";
import { automaticNames, seatDisplayName } from "./names";
import type { z } from "zod";
import { GameEngine } from "./engine";
import {
  protocolVersion,
  configSchema,
  type ChatMessage,
  type DecisionSummary,
  type RoomConfig,
  type RoomSetup,
  type Snapshot,
  type SeatConfig,
} from "./protocol";
import type { Action, AiResult, Decision, GameState, Seat } from "./types";

export class Room {
  readonly engine = new GameEngine();
  readonly config: RoomConfig;
  readonly seats: Seat[];
  readonly seed: string;
  host: { id: string; name: string; token: string; online: boolean } | null =
    null;
  private projection = new Map<
    number,
    {
      version: number;
      paused: boolean;
      state: GameState | null;
      candidates: Snapshot["candidates"];
    }
  >();
  state: GameState | null = null;
  private computation: AiComputation | null = null;
  private totals = {
    completedDecisions: 0,
    totalElapsedMs: 0,
    totalSimulations: 0,
  };
  aiPaused = false;
  version = 0;
  private messageSequence = 0;
  private messageTotals: Record<string, number> = {};
  private interactionTimes = new Map<string, number>();
  private interactionIds = new Set<string>();
  private messages: ChatMessage[] = [];
  private decisions: Decision[] = [];
  private summaries: DecisionSummary[] = [];
  private accepted = new Set<string>();
  private resolutionAt = 0;
  private ended = false;
  private roundVersion = 0;
  private lastMoveAt = 0;
  private replay: ReplayRecord | null = null;
  private records: ReplayRecord[] = [];
  private queued: { decision: AiResult; version: number } | null = null;

  constructor(
    readonly id: string,
    config: z.input<typeof configSchema>,
    seed: string = crypto.randomUUID(),
  ) {
    this.seed = seed;
    this.config = configSchema.parse(config);
    this.seats = Room.createSeats(this.config);
  }

  private static createSeats(config: RoomConfig): Seat[] {
    return [
      ...Array.from({ length: config.humans }, () => ({
        name: "",
        difficulty: null,
        online: false,
        ready: false,
      })),
      ...config.ai.map((entry, index) => ({
        name: entry.name || automaticNames[index],
        automaticName: !entry.name,
        difficulty: entry.difficulty,
        online: true,
        ready: true,
      })),
    ];
  }

  createHost(name: string): string {
    if (this.host || this.seats.some((seat) => seat.token))
      throw new Error("房间已存在身份");
    this.host = {
      id: crypto.randomUUID(),
      name,
      token: crypto.randomUUID(),
      online: true,
    };
    return this.host.token;
  }
  canManage(token: string): boolean {
    return this.identity(token) <= 0;
  }
  claim(name: string, token?: string): string {
    if (token) {
      const actor = this.identity(token);
      const seat = actor < 0 ? this.host! : this.seats[actor];
      seat.online = true;
      return token;
    }
    if (this.state && !this.ended && !this.engine.finished(this.state))
      throw new Error("对局已开始，需使用原身份重连");
    const seat = this.seats.find(
      (seat) => seat.difficulty === null && !seat.token,
    );
    if (!seat) throw new Error("真人席位已满");
    seat.name = name;
    seat.id = crypto.randomUUID();
    seat.token = crypto.randomUUID();
    seat.online = true;
    seat.ready = this.seats[0] === seat;
    return seat.token;
  }

  disconnect(token: string): void {
    const actor = this.identity(token);
    (actor < 0 ? this.host! : this.seats[actor]).online = false;
  }

  start(token: string): void {
    if (!this.canManage(token)) throw new Error("只有房主可以开始或重开");
    if (this.seats.some((seat) => !seat.difficulty && !seat.token))
      throw new Error("等待真人玩家加入");
    if (this.state && !this.ended && !this.engine.finished(this.state))
      throw new Error("请先完成当前对局");
    if (
      this.seats.some(
        (seat) => !seat.difficulty && (!seat.online || !seat.ready),
      )
    )
      throw new Error("等待所有真人玩家在线并准备");
    if (this.replay) {
      this.records.push(this.replay);
      this.records = this.records.slice(-20);
    }
    this.state = this.engine.create(
      this.config.kind,
      this.seats.length,
      `${this.seed}:round:${this.version}`,
      this.config.team,
    );
    this.replay = {
      format: 1,
      room: this.id,
      config: structuredClone(this.config),
      rulesVersion: gameCatalogue[this.config.kind].version,
      names: this.seats.map((seat) => seat.name),
      seed: `${this.seed}:round:${this.version}`,
      startedAt: Date.now(),
      events: [],
    };
    this.version++;
    this.roundVersion = this.version;
    this.decisions = [];
    this.summaries = [];
    this.computation = null;
    this.totals = {
      completedDecisions: 0,
      totalElapsedMs: 0,
      totalSimulations: 0,
    };
    this.aiPaused = false;
    this.resolutionAt = 0;
    this.ended = false;
    this.lastMoveAt = Date.now();
    this.queued = null;
  }

  end(token: string): void {
    if (!this.canManage(token)) throw new Error("只有房主可以结束对局");
    this.ended = true;
    this.queued = null;
    this.version++;
  }

  changeGame(token: string, setup: RoomSetup): void {
    if (!this.canManage(token)) throw new Error("只有房主可以切换游戏");
    if (
      this.state &&
      !this.ended &&
      !this.engine.finished(this.state) &&
      !setup.endCurrent
    )
      throw new Error("请先结束当前对局再切换游戏");
    const next = configSchema.parse(setup.config),
      game = gameCatalogue[next.kind],
      members = this.seats.filter((seat) => !!seat.token),
      actual = members.map((seat) => seat.id!).sort();
    if (JSON.stringify(actual) !== JSON.stringify([...setup.members].sort()))
      throw new Error("房间成员已更新，请重新配置");
    if (
      (!this.host && !setup.retain.includes(this.seats[0].id!)) ||
      new Set(setup.retain).size !== setup.retain.length ||
      setup.retain.some((id) => !actual.includes(id))
    )
      throw new Error("保留玩家配置无效");
    const occupied = members.filter((seat) => setup.retain.includes(seat.id!));
    if (occupied.length > game.maxPlayers)
      throw new Error("房间人数超过新游戏上限");
    if (occupied.length > next.humans)
      throw new Error("保留真人超过真人席位数");
    const seats = Room.createSeats(next);
    occupied.forEach((seat, index) => {
      seats[index] = { ...seat, ready: index === 0 };
    });
    if (this.replay) this.records = [...this.records, this.replay].slice(-20);
    Object.assign(this.config, next);
    this.seats.splice(0, this.seats.length, ...seats);
    this.state = null;
    this.computation = null;
    this.aiPaused = false;
    this.replay = null;
    this.decisions = [];
    this.summaries = [];
    this.queued = null;
    this.resolutionAt = 0;
    this.ended = false;
    this.version++;
    this.roundVersion = this.version;
  }

  act(token: string, id: string, version: number, action: Action): void {
    const actor = this.identity(token);
    if (actor < 0) throw new Error("服务身份不参与游戏");
    const key = `${token}:${id}`;
    if (this.accepted.has(key)) return;
    if (
      version < this.roundVersion ||
      version > this.version ||
      (this.version !== version && action.type !== "sgs-hero")
    )
      throw new Error("对局已更新，请根据最新局面操作");
    if (!this.state || this.ended) throw new Error("对局未开始或已结束");
    if (this.paused) throw new Error("有真人玩家掉线，等待恢复连接");
    const next = this.engine.apply(
      this.state,
      actor,
      action,
      `${this.seed}:move:${this.version}`,
    );
    this.state = next;
    this.queued = null;
    this.lastMoveAt = Date.now();
    this.version++;
    this.replay!.events.push({
      type: "action",
      actor,
      action: structuredClone(action),
      seed: `${this.seed}:move:${this.version - 1}`,
      version: this.version,
    });
    this.accepted.add(key);
    if (this.accepted.size > 2048)
      this.accepted.delete(this.accepted.values().next().value!);
    this.updateResolution();
  }

  chat(token: string, id: string, text: string): void {
    this.addMessage(token, id, { type: "text", text });
  }
  private addMessage(token: string, id: string, content: ChatContent): void {
    const actor = this.identity(token);
    const key = `${token}:chat:${id}`;
    if (this.accepted.has(key)) return;
    const member = actor < 0 ? this.host! : this.seats[actor];
    const sender = member.id!;
    this.messageTotals[sender] = (this.messageTotals[sender] || 0) + 1;
    this.messages.push({
      ...content,
      id,
      sequence: ++this.messageSequence,
      sender,
      name:
        actor < 0
          ? member.name
          : seatDisplayName(this.seats[actor], actor, this.state),
      time: Date.now(),
    });
    if (this.messages.length > 200) this.messages.shift();
    this.accepted.add(key);
    if (this.accepted.size > 2048)
      this.accepted.delete(this.accepted.values().next().value!);
  }
  interact(
    token: string,
    id: string,
    target: number,
    kind: InteractionKind,
  ): InteractionEvent | undefined {
    const from = this.identity(token);
    if (from < 0) throw new Error("服务身份不参与牌桌互动");
    if (
      !this.seats[target] ||
      (!this.seats[target].token && !this.seats[target].difficulty)
    )
      throw new Error("互动目标不存在");
    const key = `${token}:${id}`;
    if (this.interactionIds.has(key)) return;
    const now = Date.now();
    if (now - (this.interactionTimes.get(token) ?? 0) < 1200)
      throw new Error("互动太快，请稍后再试");
    this.interactionIds.add(key);
    if (this.interactionIds.size > 2048)
      this.interactionIds.delete(this.interactionIds.values().next().value!);
    this.interactionTimes.set(token, now);
    return { id, from, target, kind, time: now };
  }

  aiRequest(): {
    tradeEnabled: boolean;
    observation: GameState;
    actor: number;
    difficulty: NonNullable<Seat["difficulty"]>;
    seed: string;
    version: number;
    audit: boolean;
  } | null {
    if (
      !this.state ||
      this.ended ||
      this.paused ||
      this.queued ||
      this.engine.finished(this.state)
    )
      return null;
    const actor = this.engine
      .actors(this.state)
      .find((actor) => this.seats[actor].difficulty !== null);
    if (actor === undefined) return null;
    return {
      tradeEnabled: this.config.catanTrades,
      audit: this.config.auditEnabled,
      observation: this.engine.project(this.state, actor),
      actor,
      difficulty: this.seats[actor].difficulty!,
      seed: `decision:${this.id}:${this.version}:${actor}`,
      version: this.version,
    };
  }

  acceptDecision(decision: AiResult, version: number): boolean {
    if (!this.state || this.ended || this.paused || version !== this.version)
      return false;
    this.state = this.engine.apply(
      this.state,
      decision.actor,
      decision.chosen,
      `${this.seed}:move:${this.version}`,
    );
    this.version++;
    this.lastMoveAt = Date.now();
    this.replay!.events.push({
      type: "action",
      actor: decision.actor,
      action: structuredClone(decision.chosen),
      seed: `${this.seed}:move:${this.version - 1}`,
      version: this.version,
    });
    if (this.config.auditEnabled && decision.audit) {
      const audit = decision.audit;
      this.decisions.push(audit);
      const chosen = audit.candidates.find(
        (candidate) =>
          JSON.stringify(candidate.action) === JSON.stringify(decision.chosen),
      );
      this.summaries.push({
        actor: decision.actor,
        label: chosen?.label || decision.chosen.type,
        difficulty: decision.difficulty,
        simulations: decision.simulations,
        version: this.version,
      });
    }
    this.updateResolution();
    return true;
  }

  resolveIfDue(now = Date.now()): boolean {
    if (
      !this.state ||
      this.ended ||
      this.paused ||
      !this.engine.needsResolution(this.state)
    )
      return false;
    if (this.engine.actors(this.state).length && now < this.resolutionAt)
      return false;
    this.state = this.engine.resolve(
      this.state,
      `${this.seed}:resolve:${this.version}`,
    );
    this.version++;
    this.replay!.events.push({
      type: "resolution",
      seed: `${this.seed}:resolve:${this.version - 1}`,
      version: this.version,
    });
    this.queued = null;
    this.lastMoveAt = Date.now();
    this.updateResolution();
    return true;
  }

  snapshot(token: string): Snapshot {
    const actor = this.identity(token);
    const paused = this.paused;
    const finished =
      this.ended || (this.state ? this.engine.finished(this.state) : false);
    let projected = this.projection.get(actor);
    if (
      !projected ||
      projected.version !== this.version ||
      projected.paused !== paused
    ) {
      const state =
        (actor >= 0 || (this.config.kind === "tq" && !this.config.humans)) &&
        this.state &&
        !this.ended
          ? this.engine.project(this.state, actor)
          : null;
      projected = {
        version: this.version,
        paused,
        state,
        candidates:
          actor >= 0 && state && !finished && !paused
            ? this.engine.candidates(state, actor)
            : [],
      };
      this.projection.set(actor, projected);
    }
    return {
      apiVersion: protocolVersion,
      rulesVersion: gameCatalogue[this.config.kind].version,
      room: this.id,
      kind: this.config.kind,
      config: this.config,
      version: this.version,
      actor,
      canManage: this.canManage(token),
      playing: !!this.state && !finished,
      host: this.host
        ? { id: this.host.id, name: this.host.name, online: this.host.online }
        : null,
      seats: this.seats.map((seat, index) => ({
        id: seat.id || `ai:${index}`,
        name: seatDisplayName(seat, index, this.state),
        difficulty: seat.difficulty,
        online: seat.online,
        ready: seat.ready,
      })),
      state: projected.state,
      candidates: projected.candidates,
      computation: this.computation,
      aiPaused: this.aiPaused,
      chat: this.messages,
      chatSequence: this.messageSequence,
      chatTotals: this.messageTotals,
      decisions: finished || this.config.training ? this.decisions : [],
      paused: this.paused,
      replay: finished ? this.replay : null,
      records: this.records,
      summaries: this.summaries.slice(-30),
      finished,
      resolving: !!this.state && this.engine.needsResolution(this.state),
    };
  }

  setAiRunning(token: string, enabled: boolean): void {
    if (!this.canManage(token) || this.config.humans)
      throw new Error("仅全 AI 房主可以控制测试");
    this.aiPaused = !enabled;
    this.queued = null;
    this.version++;
  }
  updateComputation(
    actor: number,
    version: number,
    progress: ComputeProgress,
  ): boolean {
    if (version !== this.version || this.ended || this.paused) return false;
    const previous = this.computation;
    const completed =
      progress.status === "completed" &&
      !(previous?.version === version && previous.status === "completed");
    if (completed) {
      this.totals.completedDecisions++;
      this.totals.totalElapsedMs += progress.elapsedMs;
      this.totals.totalSimulations += progress.simulations;
    }
    this.computation = { ...progress, actor, version, ...this.totals };
    return true;
  }
  setComputation(
    token: string,
    audit: boolean,
    performance: PerformanceSettings,
  ): void {
    if (!this.canManage(token)) throw new Error("只有房主可以调整计算与记录");
    if (
      this.config.auditEnabled === audit &&
      JSON.stringify(this.config.performance) === JSON.stringify(performance)
    )
      return;
    this.config.auditEnabled = audit;
    this.config.performance = performance;
    if (!audit) {
      this.decisions = [];
      this.summaries = [];
    }
    this.queued = null;
    this.version++;
  }

  setTempo(token: string, delayMs: number): void {
    if (!this.canManage(token)) throw new Error("只有房主可以调整节奏");
    this.config.aiDelayMs = delayMs;
  }

  queueDecision(decision: AiResult, version: number): boolean {
    if (!this.state || this.ended || this.queued || version !== this.version)
      return false;
    this.queued = { decision, version };
    return true;
  }

  commitIfDue(now = Date.now()): boolean {
    if (
      this.paused ||
      !this.queued ||
      now < this.lastMoveAt + this.config.aiDelayMs
    )
      return false;
    const queued = this.queued;
    this.queued = null;
    return this.acceptDecision(queued.decision, queued.version);
  }

  identity(token: string): number {
    if (this.host?.token === token) return -1;
    const actor = this.seats.findIndex((seat) => seat.token === token);
    if (actor < 0) throw new Error("房间身份无效");
    return actor;
  }

  get paused(): boolean {
    return (
      !!this.state &&
      !this.ended &&
      !this.engine.finished(this.state) &&
      (this.aiPaused ||
        this.seats.some((seat) => !seat.difficulty && !seat.online))
    );
  }
  setReady(token: string, ready: boolean): void {
    const actor = this.identity(token);
    if (actor < 0) throw new Error("服务身份不参与准备");
    const seat = this.seats[actor];
    if (this.state && !this.ended && !this.engine.finished(this.state))
      throw new Error("对局中不能更改准备状态");
    seat.ready = ready;
  }
  leave(token: string): void {
    const actor = this.identity(token);
    if (actor <= 0) throw new Error("房主需要关闭房间");
    if (this.state && !this.ended && !this.engine.finished(this.state))
      throw new Error("请先结束对局再离开");
    if (this.seats[actor].id) delete this.messageTotals[this.seats[actor].id!];
    this.seats[actor] = {
      name: "",
      difficulty: null,
      online: false,
      ready: false,
    };
  }
  configureSeat(token: string, index: number, config: SeatConfig): void {
    if (!this.canManage(token)) throw new Error("只有房主可以调整席位");
    if (this.state && !this.ended && !this.engine.finished(this.state))
      throw new Error("对局中不能调整席位");
    const seat = this.seats[index];
    if (index === 0 || !seat) throw new Error("席位不存在");
    if (seat.token) throw new Error("真人已占用该席位");
    if (config.type === "ai" && !gameCatalogue[this.config.kind].ai)
      throw new Error("该游戏 AI 尚未接入");
    this.seats[index] =
      config.type === "human"
        ? { name: "", difficulty: null, online: false, ready: false }
        : {
            name: config.name || automaticNames[index - 1],
            automaticName: !config.name,
            difficulty: config.difficulty,
            online: true,
            ready: true,
          };
    this.config.humans = this.seats.filter((seat) => !seat.difficulty).length;
    this.config.ai = this.seats
      .filter((seat) => !!seat.difficulty)
      .map((seat) => ({
        difficulty: seat.difficulty!,
        name: seat.automaticName ? "" : seat.name,
      }));
  }
  export(): RoomArchive {
    return {
      format: 1,
      id: this.id,
      seed: this.seed,
      config: this.config,
      seats: this.seats,
      host: this.host,
      version: this.version,
      roundVersion: this.roundVersion,
      ended: this.ended,
      replay: this.replay,
      records: this.records,
      messageSequence: this.messageSequence,
      messageTotals: this.messageTotals,
      messages: this.messages,
      decisions: this.decisions,
      summaries: this.summaries,
      accepted: [...this.accepted],
    };
  }
  static restore(archive: RoomArchive): Room {
    if (archive.format !== 1) throw new Error("房间存档版本不支持");
    if (archive.messageSequence === undefined) {
      archive = structuredClone(archive);
      archive.seats.forEach((seat) => {
        if (seat.token && !seat.id) seat.id = crypto.randomUUID();
      });
      archive.messages = archive.messages.map((message, index) => ({
        id: message.id,
        name: message.name,
        text: message.text,
        time: message.time,
        sequence: index + 1,
        sender: "history",
        type: "text",
      }));
      archive.messageSequence = archive.messages.length;
      archive.messageTotals = { history: archive.messages.length };
    }
    const room = new Room(archive.id, archive.config, archive.seed);
    room.seats.splice(
      0,
      room.seats.length,
      ...archive.seats.map((seat) => ({ ...seat, online: !!seat.difficulty })),
    );
    room.host = archive.host ? { ...archive.host, online: false } : null;
    room.version = archive.version;
    room.roundVersion = archive.roundVersion;
    room.ended = archive.ended;
    room.replay = archive.replay;
    room.records = archive.records;
    room.messages = archive.messages;
    room.messageSequence = archive.messageSequence;
    room.messageTotals = archive.messageTotals;
    room.decisions = room.config.auditEnabled ? archive.decisions : [];
    room.summaries = room.config.auditEnabled ? archive.summaries : [];
    room.accepted = new Set(archive.accepted);
    if (archive.replay)
      room.state = new Replay(archive.replay).frames().at(-1)!;
    room.lastMoveAt = Date.now();
    room.updateResolution();
    return room;
  }

  private updateResolution(): void {
    this.resolutionAt =
      this.state && this.engine.needsResolution(this.state)
        ? Date.now() + Math.max(4500, this.config.aiDelayMs + 500)
        : 0;
  }
}

export interface RoomArchive {
  format: 1;
  id: string;
  seed: string;
  config: RoomConfig;
  seats: Seat[];
  host?: Room["host"];
  version: number;
  roundVersion: number;
  ended: boolean;
  replay: ReplayRecord | null;
  records: ReplayRecord[];
  messageSequence: number;
  messageTotals: Record<string, number>;
  messages: ChatMessage[];
  decisions: Decision[];
  summaries: DecisionSummary[];
  accepted: string[];
}
