import { heroContent } from "./expedition/content";
import {
  parseChatCommand,
  bannerCommands,
  rollDice,
  bannerPolicySchema,
  type BannerPolicy,
} from "./banner";
import { attachmentSchema, type Attachment } from "./attachments";
import { avatarSchema, seatAvatar } from "./avatar";
import type {
  AiComputation,
  ComputeProgress,
  PerformanceSettings,
} from "./performance";
import type {
  ChatContent,
  InteractionEvent,
  InteractionKind,
  InteractionUnits,
} from "./social";
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
  private bannerPolicy: BannerPolicy = { mode: "host", members: [] };
  private bannerTimes = new Map<string, number>();
  private chatEventTimes = new Map<string, number>();
  private messages: ChatMessage[] = [];
  private decisions: Decision[] = [];
  private summaries: DecisionSummary[] = [];
  private accepted = new Set<string>();
  private resolutionAt = 0;
  private ended = false;
  private pendingResume: import("./types").GameState | null = null;
  private roundVersion = 0;
  private simultaneousSince = 0;
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
  claim(name: string, token?: string, avatar = "😊"): string {
    if (token) {
      const wasPaused = this.paused;
      const actor = this.identity(token);
      const seat = actor < 0 ? this.host! : this.seats[actor];
      seat.online = true;
      if (wasPaused && !this.paused) this.updateResolution();
      return token;
    }
    if (this.state && !this.ended && !this.engine.finished(this.state))
      throw new Error("对局已开始，需使用原身份重连");
    const seat = this.seats.find(
      (seat) => seat.difficulty === null && !seat.token,
    );
    if (!seat) throw new Error("真人席位已满");
    seat.avatar = avatarSchema.parse(avatar);
    seat.name = name;
    seat.id = crypto.randomUUID();
    seat.token = crypto.randomUUID();
    seat.online = true;
    seat.ready = this.seats[0] === seat;
    return seat.token;
  }

  setAvatar(token: string, avatar: string): void {
    const actor = this.identity(token);
    if (actor < 0) throw new Error("服务身份没有玩家头像");
    this.seats[actor].avatar = avatarSchema.parse(avatar);
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
    this.seats.forEach((seat) => (seat.autoplay = false));
    if (this.pendingResume) {
      this.state = this.pendingResume;
      this.pendingResume = null;
      this.replay!.names = this.seats.map((seat) => seat.name);
      this.replay!.avatars = this.seats.map(seatAvatar);
    } else {
      if (this.replay) {
        this.records.push(this.replay);
        this.records = this.records.slice(-20);
      }
      this.state = this.engine.create(
        this.config.kind,
        this.seats.length,
        `${this.seed}:round:${this.version}`,
        this.config.team,
        {
          expedition: this.config.expedition,
          dominion: this.config.dominion,
          mahjong: this.config.mahjong,
          graphwar: this.config.graphwar,
        },
      );
      this.replay = {
        format: 1,
        room: this.id,
        config: structuredClone(this.config),
        rulesVersion: gameCatalogue[this.config.kind].version,
        names: this.seats.map((seat) => seat.name),
        avatars: this.seats.map(seatAvatar),
        seed: `${this.seed}:round:${this.version}`,
        startedAt: Date.now(),
        ...(this.state.kind === "graphwar"
          ? {
              graphwarInitial: structuredClone({
                teams: this.state.view.teams,
                terrain: this.state.view.terrain,
                soldiers: this.state.view.soldiers,
              }),
            }
          : {}),
        ...(this.state.kind === "expedition"
          ? { expeditionMap: structuredClone(this.state.view.map) }
          : {}),
        events: [],
      };
    }
    this.version++;
    this.roundVersion = this.version;
    this.simultaneousSince = this.version;
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
    this.updateResolution();
  }

  get hasEnded(): boolean {
    return this.ended;
  }
  get pendingRunId(): string | undefined {
    return this.pendingResume?.kind === "expedition"
      ? this.pendingResume.view.runId
      : undefined;
  }

  end(token: string, discardResume = false): void {
    if (!this.canManage(token)) throw new Error("只有房主可以结束对局");
    this.ended = true;
    if (discardResume) this.pendingResume = null;
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
    this.bannerPolicy = {
      ...this.bannerPolicy,
      members: this.bannerPolicy.members.filter((id) =>
        seats.some((seat) => seat.id === id),
      ),
    };
    this.state = null;
    this.pendingResume = null;
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
    this.simultaneousSince = this.version;
  }

  act(token: string, id: string, version: number, action: Action): void {
    const actor = this.identity(token);
    if (actor < 0) throw new Error("服务身份不参与游戏");
    const key = `${token}:${id}`;
    if (this.accepted.has(key)) return;
    if (this.seats[actor].autoplay) throw new Error("请先取消托管，再手动操作");
    const window = this.state
      ? this.engine.actionWindow(this.state, action)
      : undefined;
    const simultaneous = !!window && version >= this.simultaneousSince;
    if (
      version < this.roundVersion ||
      version > this.version ||
      (this.version !== version && !simultaneous)
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
    if (
      this.engine.actionWindow(this.state, action) !==
      this.engine.actionWindow(next, action)
    )
      this.simultaneousSince = this.version + 1;
    this.state = next;
    this.queued = null;
    this.lastMoveAt = Date.now();
    this.version++;
    this.replay!.events.push({
      type: "action",
      actor,
      action: structuredClone(action),
      graphwarShot:
        this.state.kind === "graphwar" && action.type === "graphwar-fire"
          ? structuredClone(this.state.view.lastShot!)
          : undefined,
      seed: `${this.seed}:move:${this.version - 1}`,
      version: this.version,
    });
    this.accepted.add(key);
    if (this.accepted.size > 2048)
      this.accepted.delete(this.accepted.values().next().value!);
    this.updateResolution();
  }

  chat(token: string, id: string, text: string): void {
    this.identity(token);
    if (this.accepted.has(`${token}:chat:${id}`)) return;
    const banner = parseChatCommand(text);
    if (!banner) {
      this.addMessage(token, id, { type: "text", text });
      return;
    }
    const actor = this.identity(token);
    const member = actor < 0 ? this.host! : this.seats[actor];
    const permission = bannerCommands.find(
      (command) => command.kind === banner.kind,
    )!.permission;
    if (banner.kind === "help") throw new Error("请在聊天编辑器中打开指令帮助");
    if (
      banner.kind === "clear" ||
      banner.kind === "roll" ||
      banner.kind === "emote"
    ) {
      if (permission === "host" && !this.canManage(token))
        throw new Error("只有房主可以清除横幅");
      const now = Date.now();
      if (now - (this.chatEventTimes.get(member.id!) ?? -Infinity) < 2000)
        throw new Error("指令太快，请稍后再试");
      this.chatEventTimes.set(member.id!, now);
      if (banner.kind === "clear")
        this.addMessage(token, id, { type: "clear", text: "清除了横幅" });
      else if (banner.kind === "emote")
        this.addMessage(token, id, { type: "emote", text: banner.text });
      else {
        const results = rollDice(banner.count, banner.sides);
        this.addMessage(token, id, {
          type: "roll",
          sides: banner.sides,
          results,
          text: `🎲 ${banner.count}d${banner.sides}：${results.join("、")}，合计 ${results.reduce((sum, value) => sum + value, 0)}（娱乐）`,
        });
      }
      return;
    }
    const policy = this.bannerPolicy;
    if (
      policy.mode === "off" ||
      (!this.canManage(token) &&
        policy.mode !== "all" &&
        !(policy.mode === "selected" && policy.members.includes(member.id!)))
    )
      throw new Error("你尚未获得房主的横幅使用授权");
    const now = Date.now();
    if (now - (this.bannerTimes.get(member.id!) ?? -Infinity) < 10000)
      throw new Error("横幅发送太快，请稍后再试");
    this.bannerTimes.set(member.id!, now);
    this.addMessage(token, id, { type: "banner", text: banner.text, banner });
  }
  setBannerPolicy(token: string, input: BannerPolicy): void {
    if (!this.canManage(token)) throw new Error("只有房主可以设置横幅权限");
    const policy = bannerPolicySchema.parse(input);
    if (
      policy.members.some(
        (id) => !this.seats.some((seat) => seat.token && seat.id === id),
      )
    )
      throw new Error("授权玩家已不在房间");
    this.bannerPolicy = policy;
  }
  chatImage(token: string, id: string, attachment: Attachment): void {
    this.addMessage(token, id, {
      type: "image",
      text: "[图片]",
      attachment: attachmentSchema.parse(attachment),
    });
  }
  private addMessage(token: string, id: string, content: ChatContent): void {
    const actor = this.identity(token);
    const key = `${token}:chat:${id}`;
    if (this.accepted.has(key)) return;
    const member = actor < 0 ? this.host! : this.seats[actor];
    const sender = member.id!;
    this.messageTotals[sender] = (this.messageTotals[sender] || 0) + 1;
    const message: ChatMessage = {
      ...content,
      id,
      sequence: ++this.messageSequence,
      sender,
      name:
        actor < 0
          ? member.name
          : seatDisplayName(this.seats[actor], actor, this.state),
      time: Date.now(),
    };
    this.messages.push(message);
    if (
      (content.type === "banner" ||
        content.type === "roll" ||
        content.type === "emote" ||
        content.type === "clear") &&
      this.replay &&
      this.state &&
      !this.ended &&
      !this.engine.finished(this.state)
    ) {
      this.replay.social ??= [];
      if (this.replay.social.length < 1000)
        this.replay.social.push({
          frame: this.replay.events.length,
          ...(content.type === "banner"
            ? { banner: content.banner }
            : { message: content }),
          name: message.name,
        });
    }
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
    units?: InteractionUnits,
  ): InteractionEvent | undefined {
    const from = this.identity(token);
    if (from < 0) throw new Error("服务身份不参与牌桌互动");
    if (
      !this.seats[target] ||
      (!this.seats[target].token && !this.seats[target].difficulty)
    )
      throw new Error("互动目标不存在");
    if (units) {
      if (this.state?.kind !== "graphwar")
        throw new Error("士兵互动不属于当前游戏");
      const soldiers = this.state.view.soldiers,
        source = soldiers.find(
          (s) => s.id === units.from && s.player === from && s.hp > 0,
        ),
        destination = soldiers.find(
          (s) => s.id === units.target && s.player === target && s.hp > 0,
        );
      if (!source || !destination)
        throw new Error("互动士兵不存在或不属于该玩家");
    }
    const key = `${token}:${id}`;
    if (this.interactionIds.has(key)) return;
    const now = Date.now();
    if (now - (this.interactionTimes.get(token) ?? 0) < 1200)
      throw new Error("互动太快，请稍后再试");
    this.interactionIds.add(key);
    if (this.interactionIds.size > 2048)
      this.interactionIds.delete(this.interactionIds.values().next().value!);
    this.interactionTimes.set(token, now);
    return { id, from, target, kind, time: now, ...(units ? { units } : {}) };
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
      .find(
        (actor) =>
          this.seats[actor].difficulty !== null ||
          (["scmj", "expedition"].includes(this.config.kind) &&
            this.seats[actor].autoplay),
      );
    if (actor === undefined) return null;
    return {
      tradeEnabled: this.config.catanTrades,
      audit: this.config.auditEnabled,
      observation: this.engine.project(this.state, actor),
      actor,
      difficulty: this.seats[actor].difficulty || "normal",
      seed: `decision:${this.id}:${this.version}:${actor}`,
      version: this.version,
    };
  }

  acceptDecision(decision: AiResult, version: number): boolean {
    if (!this.state || this.ended || this.paused || version !== this.version)
      return false;
    const oldWindow = this.engine.actionWindow(this.state, decision.chosen);
    this.state = this.engine.apply(
      this.state,
      decision.actor,
      decision.chosen,
      `${this.seed}:move:${this.version}`,
    );
    this.version++;
    if (oldWindow !== this.engine.actionWindow(this.state, decision.chosen))
      this.simultaneousSince = this.version;
    this.lastMoveAt = Date.now();
    this.replay!.events.push({
      type: "action",
      actor: decision.actor,
      action: structuredClone(decision.chosen),
      graphwarShot:
        this.state.kind === "graphwar" &&
        decision.chosen.type === "graphwar-fire"
          ? structuredClone(this.state.view.lastShot!)
          : undefined,
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
        (actor >= 0 ||
          (["tq", "scmj"].includes(this.config.kind) && !this.config.humans)) &&
        this.state &&
        !this.ended
          ? this.engine.project(this.state, actor)
          : null;
      projected = {
        version: this.version,
        paused,
        state,
        candidates:
          actor >= 0 &&
          state &&
          !finished &&
          !paused &&
          !this.seats[actor].autoplay
            ? this.engine.candidates(state, actor)
            : [],
      };
      this.projection.set(actor, projected);
    }
    return {
      resumeRoles:
        this.pendingResume?.kind === "expedition"
          ? this.pendingResume.view.combat.heroes.map((h, i) => ({
              profession: heroContent[h.profession].name,
              name: this.replay?.names[i] ?? "",
            }))
          : undefined,
      serverTime: Date.now(),
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
        avatar: seatAvatar(seat),
        difficulty: seat.difficulty,
        autoplay: seat.autoplay,
        online: seat.online,
        ready: seat.ready,
      })),
      state: projected.state,
      candidates: projected.candidates,
      computation: this.computation,
      aiPaused: this.aiPaused,
      bannerPolicy: this.bannerPolicy,
      chat: this.messages,
      chatSequence: this.messageSequence,
      chatTotals: this.messageTotals,
      decisions: finished || this.config.training ? this.decisions : [],
      paused: this.paused,
      replay: finished ? this.replay : null,
      records: this.records,
      summaries: this.summaries.slice(-30),
      finished,
      resolving:
        !!this.state &&
        this.engine.needsResolution(this.state) &&
        this.engine.resolutionDelay(this.state) === undefined,
      turnDeadline:
        this.state?.kind === "graphwar" && !finished && this.resolutionAt
          ? this.resolutionAt
          : undefined,
    };
  }

  setAutoplay(token: string, enabled: boolean, index?: number): void {
    const caller = this.identity(token),
      actor = index ?? caller;
    if (actor !== caller && !this.canManage(token))
      throw new Error("只有房主可以托管其他席位");
    if (
      actor < 0 ||
      !["scmj", "expedition"].includes(this.config.kind) ||
      !this.seats[actor] ||
      this.seats[actor].difficulty !== null ||
      !this.state ||
      this.ended ||
      this.engine.finished(this.state)
    )
      throw new Error("当前不能托管此席位");
    const wasPaused = this.paused;
    this.seats[actor].autoplay = enabled;
    if (wasPaused && !this.paused) this.updateResolution();
    this.queued = null;
    this.version++;
  }
  setAiRunning(token: string, enabled: boolean): void {
    if (!this.canManage(token)) throw new Error("仅房主可以控制 AI");
    const wasPaused = this.paused;
    this.aiPaused = !enabled;
    if (wasPaused && !this.paused) this.updateResolution();
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
        this.seats.some(
          (seat) => !seat.difficulty && !seat.autoplay && !seat.online,
        ))
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
    this.bannerPolicy = {
      ...this.bannerPolicy,
      members: this.bannerPolicy.members.filter(
        (id) => id !== this.seats[actor].id,
      ),
    };
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
    const balanceBySeat = new Map(
      this.seats
        .filter((s) => s.difficulty)
        .map((s, i) => [s, this.config.ai[i]?.balance]),
    );
    const wasBalance = balanceBySeat.get(this.seats[index]);
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
    if (wasBalance && config.type === "ai")
      balanceBySeat.set(this.seats[index], true);
    this.config.humans = this.seats.filter((seat) => !seat.difficulty).length;
    this.config.ai = this.seats
      .filter((seat) => !!seat.difficulty)
      .map((seat) => ({
        difficulty: seat.difficulty!,
        name: seat.automaticName ? "" : seat.name,
        ...(balanceBySeat.get(seat) ? { balance: true } : {}),
      }));
  }
  export(): RoomArchive {
    return {
      format: 1,
      pendingResume: this.pendingResume ?? undefined,
      checkpoint: this.state
        ? { version: this.version, state: structuredClone(this.state) }
        : undefined,
      id: this.id,
      seed: this.seed,
      config: this.config,
      seats: this.seats,
      host: this.host,
      version: this.version,
      roundVersion: this.roundVersion,
      simultaneousSince: this.simultaneousSince,
      ended: this.ended,
      aiPaused: this.aiPaused,
      replay: this.replay,
      records: this.records,
      messageSequence: this.messageSequence,
      messageTotals: this.messageTotals,
      bannerPolicy: this.bannerPolicy,
      bannerTimes: Object.fromEntries(this.bannerTimes),
      chatEventTimes: Object.fromEntries(this.chatEventTimes),
      messages: this.messages,
      decisions: this.decisions,
      summaries: this.summaries,
      accepted: [...this.accepted],
    };
  }
  static restore(archive: RoomArchive): Room {
    if (archive.format !== 1) throw new Error("房间存档版本不支持");
    archive = structuredClone(archive);
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
    room.aiPaused = archive.aiPaused ?? false;
    room.simultaneousSince = archive.simultaneousSince ?? room.version;
    room.replay = archive.replay;
    room.records = archive.records;
    room.bannerPolicy = bannerPolicySchema.parse(
      archive.bannerPolicy ?? { mode: "host", members: [] },
    );
    room.bannerTimes = new Map(Object.entries(archive.bannerTimes ?? {}));
    room.chatEventTimes = new Map(Object.entries(archive.chatEventTimes ?? {}));
    room.messages = archive.messages;
    room.messageSequence = archive.messageSequence;
    room.messageTotals = archive.messageTotals;
    room.decisions = room.config.auditEnabled ? archive.decisions : [];
    room.summaries = room.config.auditEnabled ? archive.summaries : [];
    room.accepted = new Set(archive.accepted);
    if (archive.replay) {
      const replay = new Replay(archive.replay);
      room.state = archive.pendingResume
        ? null
        : archive.checkpoint?.version === archive.version
          ? structuredClone(archive.checkpoint.state)
          : replay.frame(replay.record.events.length);
    }
    room.pendingResume = archive.pendingResume ?? null;
    if (room.pendingResume) room.state = null;
    room.lastMoveAt = Date.now();
    room.updateResolution();
    return room;
  }

  static resumeRun(archive: RoomArchive, token: string): Room {
    const room = Room.restore(archive);
    if (
      room.state?.kind !== "expedition" ||
      room.state.view.rulesVersion !== 1 ||
      room.state.view.contentVersion !== 1
    )
      throw new Error("远征内容版本不兼容，原存档保留");
    room.pendingResume = room.state;
    room.state = null;
    room.ended = false;
    room.aiPaused = false;
    room.seats.forEach((seat, index) => {
      if (!seat.difficulty && seat.token !== token)
        room.seats[index] = {
          name: "",
          difficulty: null,
          ready: false,
          online: false,
        };
    });
    room.claim("", token);
    room.version++;
    room.roundVersion = room.version;
    room.simultaneousSince = room.version;
    room.accepted.clear();
    return room;
  }

  private updateResolution(): void {
    this.resolutionAt =
      this.state && this.engine.needsResolution(this.state)
        ? Date.now() +
          (this.engine.resolutionDelay(this.state) ??
            Math.max(4500, this.config.aiDelayMs + 500))
        : 0;
  }
}

export interface RoomArchive {
  format: 1;
  pendingResume?: import("./types").GameState;
  checkpoint?: { version: number; state: import("./types").GameState };
  id: string;
  seed: string;
  config: RoomConfig;
  seats: Seat[];
  host?: Room["host"];
  version: number;
  roundVersion: number;
  simultaneousSince?: number;
  ended: boolean;
  aiPaused?: boolean;
  replay: ReplayRecord | null;
  records: ReplayRecord[];
  messageSequence: number;
  messageTotals: Record<string, number>;
  bannerPolicy?: BannerPolicy;
  bannerTimes?: Record<string, number>;
  chatEventTimes?: Record<string, number>;
  messages: ChatMessage[];
  decisions: Decision[];
  summaries: DecisionSummary[];
  accepted: string[];
}
