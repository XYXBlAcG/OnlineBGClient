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
  type Snapshot,
  type SeatConfig,
} from "./protocol";
import type { Action, Decision, GameState, Seat } from "./types";

export class Room {
  readonly engine = new GameEngine();
  readonly config: RoomConfig;
  readonly seats: Seat[];
  readonly seed: string;
  state: GameState | null = null;
  version = 0;
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
  private queued: { decision: Decision; version: number } | null = null;

  constructor(
    readonly id: string,
    config: z.input<typeof configSchema>,
    seed: string = crypto.randomUUID(),
  ) {
    this.seed = seed;
    this.config = configSchema.parse(config);
    this.seats = [
      ...Array.from({ length: this.config.humans }, () => ({
        name: "",
        difficulty: null,
        online: false,
        ready: false,
      })),
      ...this.config.ai.map((entry, index) => ({
        name: entry.name || automaticNames[index],
        automaticName: !entry.name,
        difficulty: entry.difficulty,
        online: true,
        ready: true,
      })),
    ];
  }

  claim(name: string, token?: string): string {
    if (token) {
      const seat = this.seats[this.identity(token)];
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
    seat.token = crypto.randomUUID();
    seat.online = true;
    seat.ready = this.seats[0] === seat;
    return seat.token;
  }

  disconnect(token: string): void {
    this.seats[this.identity(token)].online = false;
  }

  start(token: string): void {
    if (this.identity(token) !== 0) throw new Error("只有房主可以开始或重开");
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
    this.resolutionAt = 0;
    this.ended = false;
    this.lastMoveAt = Date.now();
    this.queued = null;
  }

  end(token: string): void {
    if (this.identity(token) !== 0) throw new Error("只有房主可以结束对局");
    this.ended = true;
    this.queued = null;
    this.version++;
  }

  act(token: string, id: string, version: number, action: Action): void {
    const actor = this.identity(token);
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
    const actor = this.identity(token);
    const key = `${token}:chat:${id}`;
    if (this.accepted.has(key)) return;
    this.messages.push({
      id,
      name: seatDisplayName(this.seats[actor], actor, this.state),
      text,
      time: Date.now(),
    });
    if (this.messages.length > 200) this.messages.shift();
    this.accepted.add(key);
    if (this.accepted.size > 2048)
      this.accepted.delete(this.accepted.values().next().value!);
  }

  aiRequest(): {
    observation: GameState;
    actor: number;
    difficulty: NonNullable<Seat["difficulty"]>;
    seed: string;
    version: number;
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
      observation: this.engine.project(this.state, actor),
      actor,
      difficulty: this.seats[actor].difficulty!,
      seed: `decision:${this.id}:${this.version}:${actor}`,
      version: this.version,
    };
  }

  acceptDecision(decision: Decision, version: number): boolean {
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
    this.decisions.push(decision);
    const chosen = decision.candidates.find(
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
    const state = this.state ? this.engine.project(this.state, actor) : null;
    const finished =
      this.ended || (this.state ? this.engine.finished(this.state) : false);
    return {
      apiVersion: protocolVersion,
      rulesVersion: gameCatalogue[this.config.kind].version,
      room: this.id,
      kind: this.config.kind,
      config: this.config,
      version: this.version,
      actor,
      seats: this.seats.map((seat, index) => ({
        name: seatDisplayName(seat, index, this.state),
        difficulty: seat.difficulty,
        online: seat.online,
        ready: seat.ready,
      })),
      state: this.ended ? null : state,
      candidates:
        state && !finished && !this.paused
          ? this.engine.candidates(state, actor)
          : [],
      chat: this.messages,
      decisions: finished || this.config.training ? this.decisions : [],
      paused: this.paused,
      replay: finished ? this.replay : null,
      records: this.records,
      summaries: this.summaries.slice(-30),
      finished,
      resolving: !!this.state && this.engine.needsResolution(this.state),
    };
  }

  setTempo(token: string, delayMs: number): void {
    if (this.identity(token) !== 0) throw new Error("只有房主可以调整节奏");
    this.config.aiDelayMs = delayMs;
  }

  queueDecision(decision: Decision, version: number): boolean {
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
    const actor = this.seats.findIndex((seat) => seat.token === token);
    if (actor < 0) throw new Error("房间身份无效");
    return actor;
  }

  get paused(): boolean {
    return (
      !!this.state &&
      !this.ended &&
      !this.engine.finished(this.state) &&
      this.seats.some((seat) => !seat.difficulty && !seat.online)
    );
  }
  setReady(token: string, ready: boolean): void {
    const seat = this.seats[this.identity(token)];
    if (this.state && !this.ended && !this.engine.finished(this.state))
      throw new Error("对局中不能更改准备状态");
    seat.ready = ready;
  }
  leave(token: string): void {
    const actor = this.identity(token);
    if (actor === 0) throw new Error("房主需要关闭房间");
    if (this.state && !this.ended && !this.engine.finished(this.state))
      throw new Error("请先结束对局再离开");
    this.seats[actor] = {
      name: "",
      difficulty: null,
      online: false,
      ready: false,
    };
  }
  configureSeat(token: string, index: number, config: SeatConfig): void {
    if (this.identity(token) !== 0) throw new Error("只有房主可以调整席位");
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
      version: this.version,
      roundVersion: this.roundVersion,
      ended: this.ended,
      replay: this.replay,
      records: this.records,
      messages: this.messages,
      decisions: this.decisions,
      summaries: this.summaries,
      accepted: [...this.accepted],
    };
  }
  static restore(archive: RoomArchive): Room {
    if (archive.format !== 1) throw new Error("房间存档版本不支持");
    const room = new Room(archive.id, archive.config, archive.seed);
    room.seats.splice(
      0,
      room.seats.length,
      ...archive.seats.map((seat) => ({ ...seat, online: !!seat.difficulty })),
    );
    room.version = archive.version;
    room.roundVersion = archive.roundVersion;
    room.ended = archive.ended;
    room.replay = archive.replay;
    room.records = archive.records;
    room.messages = archive.messages;
    room.decisions = archive.decisions;
    room.summaries = archive.summaries;
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
  version: number;
  roundVersion: number;
  ended: boolean;
  replay: ReplayRecord | null;
  records: ReplayRecord[];
  messages: ChatMessage[];
  decisions: Decision[];
  summaries: DecisionSummary[];
  accepted: string[];
}
