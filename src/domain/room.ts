import { fayuDuelGuessingComplete } from "./fayu/types";
import {
  advanceArcade,
  chooseArcade,
  createArcade,
  settleArcade,
} from "./arcade/campaign";
import { ArcadeSession, type ArcadeArchive } from "./arcade/session";
import { upgradeDrawRecord } from "./drawguess/legacy";
import { drawModeOf, isFayuState } from "./drawguess/state";
import { AiTempo } from "./ai-tempo";
import {
  arcadeOutcome,
  arcadeScenario,
  arcadeSupplement,
  type ArcadeScenario,
} from "./arcade/scenario";
import type { ArcadeAction } from "./protocol";
import { supportsLlmDecisions } from "./companion";
import {
  describePublicAction,
  type PublicAction,
} from "./table-mind/public-action";
import type { PartyQueue, QueuedGame } from "./protocol";
import { achievementById, type AchievementDefinition } from "./achievements";
import { gameRulesVersion } from "./catalogue";
import { migrateExpedition } from "./expedition/migration";
import { partyResults, partySignals } from "./party/facts";
import type { PartyEvent } from "./party/model";
import {
  PartyLedger,
  partyItems,
  observerSeats,
  type PartyAction,
  type PartyContext,
  type PartyState,
} from "./party";
import { v4 as randomId } from "uuid";
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
import { Replay, replayEventLimit, type ReplayRecord } from "./replay";
import { automaticNames, seatDisplayName } from "./names";
import type { z } from "zod";
import { GameEngine } from "./engine";
import { gameWinners } from "./game-result";
import { createSeries, recordSeriesRound, type Series } from "./series";
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
import {
  advanceChallenges,
  createChallengeBoard,
  type ChallengeBoard,
} from "./challenges";
import {
  aiProviderSettingsSchema,
  companionConfigSchema,
  type AiProviderSettings,
  type CompanionConfig,
  type PublicRoomContext,
} from "./companion";
import type { CompanionProfile } from "companion-core";
import type { TableEvent, TableEventKind } from "./table-mind/model";

export class Room {
  private partyQueue: PartyQueue = { revision: 0, entries: [] };
  setQueue(token: string, revision: number, entries: QueuedGame[]): void {
    if (!this.canManage(token)) throw new Error("只有房主可以修改下一局队列");
    if (revision !== this.partyQueue.revision)
      throw new Error("队列已更新，请重新查看");
    if (
      entries.length > 12 ||
      new Set(entries.map((item) => item.id)).size !== entries.length
    )
      throw new Error("队列无效");
    this.partyQueue = {
      revision: revision + 1,
      entries: entries.map((item) => ({
        id: item.id,
        config: configSchema.parse(item.config),
      })),
    };
    this.version++;
  }
  applyQueued(
    token: string,
    id: string,
    revision: number,
    setup: RoomSetup,
  ): void {
    if (!this.canManage(token)) throw new Error("只有房主可以应用下一局");
    if (
      this.partyQueue.revision !== revision ||
      this.partyQueue.entries[0]?.id !== id
    )
      throw new Error("下一局队列已更新");
    if (
      this.arcadeActive ||
      (this.state && !this.ended && !this.engine.finished(this.state))
    )
      throw new Error("请先完成或保存结束当前对局");
    this.changeGame(token, setup);
    this.partyQueue = {
      revision: revision + 1,
      entries: this.partyQueue.entries.slice(1),
    };
  }
  readonly engine = new GameEngine();
  readonly config: RoomConfig;
  readonly seats: Seat[];
  readonly seed: string;
  host: { id: string; name: string; token: string; online: boolean } | null =
    null;
  readonly spectators: {
    id: string;
    name: string;
    avatar: string;
    token: string;
    online: boolean;
  }[] = [];
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
  private minerPaused = false;
  version = 0;
  private messageSequence = 0;
  private messageTotals: Record<string, number> = {};
  private interactionTimes = new Map<string, number>();
  private interactionIds = new Set<string>();
  private bannerPolicy: BannerPolicy = { mode: "host", members: [] };
  private bannerTimes = new Map<string, number>();
  private chatEventTimes = new Map<string, number>();
  private messages: ChatMessage[] = [];
  private tableEventSequence = 0;
  private tableEvents: TableEvent[] = [];
  private party = new PartyLedger();
  series: Series | null = null;
  private decisions: Decision[] = [];
  private summaries: DecisionSummary[] = [];
  private accepted = new Set<string>();
  private resolutionAt = 0;
  private ended = false;
  private pendingResume: import("./types").GameState | null = null;
  private roundVersion = 0;
  private simultaneousSince = 0;
  private lastMoveAt = 0;
  private aiTempo = new AiTempo();
  private actionReadyAt = 0;
  private arcade?: ArcadeSession;
  private replay: ReplayRecord | null = null;
  private drawPartyBaseline = new Set<string>();
  private challenges: ChallengeBoard | null = null;
  private records: ReplayRecord[] = [];
  private queued: { decision: AiResult; version: number } | null = null;
  private drawWords?: import("./drawguess/words").DrawWord[];
  private appendReplayEvent(event: ReplayRecord["events"][number]) {
    if (!this.replay) return;
    if (this.replay.events.length >= replayEventLimit) {
      this.replay.truncated = true;
      return;
    }
    this.replay.events.push(event);
  }

  constructor(
    readonly id: string,
    config: z.input<typeof configSchema>,
    seed: string = randomId(),
  ) {
    this.seed = seed;
    this.config = configSchema.parse(config);
    this.seats = Room.createSeats(this.config);
    this.party.execute(
      -1,
      "initial-plugins",
      { type: "plugins", packs: this.config.plugins },
      this.partyContext(),
      true,
    );
    this.party.execute(
      -1,
      "initial-policy",
      { type: "policy", policy: this.config.party },
      this.partyContext(),
      true,
    );
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
        driver: entry.driver ?? "search",
        online: true,
        ready: true,
      })),
    ];
  }

  createHost(name: string): string {
    if (this.host || this.seats.some((seat) => seat.token))
      throw new Error("房间已存在身份");
    this.host = {
      id: randomId(),
      name,
      token: randomId(),
      online: true,
    };
    return this.host.token;
  }
  canManage(token: string): boolean {
    return this.host?.token === token || this.seats[0]?.token === token;
  }
  claim(name: string, token?: string, avatar = "😊"): string {
    if (token) {
      const wasPaused = this.paused;
      const seat = this.member(token);
      this.arcade?.sample(wasPaused, Date.now());
      seat.online = true;
      if (wasPaused && !this.paused) this.updateResolution();
      return token;
    }
    if (
      this.arcadeActive ||
      (this.state && !this.ended && !this.engine.finished(this.state))
    )
      throw new Error("对局已开始，需使用原身份重连");
    const seat = this.seats.find(
      (seat) => seat.difficulty === null && !seat.token,
    );
    if (!seat) throw new Error("真人席位已满");
    seat.avatar = avatarSchema.parse(avatar);
    seat.name = name;
    seat.id = randomId();
    seat.token = randomId();
    seat.online = true;
    seat.ready = this.seats[0] === seat;
    this.party.sync(this.partyContext());
    return seat.token;
  }

  watch(name: string, avatar = "😊"): string {
    if (this.spectators.length >= 24) throw Error("旁观席已满");
    const member = {
      id: randomId(),
      name,
      avatar: avatarSchema.parse(avatar),
      token: randomId(),
      online: true,
    };
    this.spectators.push(member);
    this.party.sync(this.partyContext());
    return member.token;
  }
  member(token: string) {
    const actor = this.identity(token);
    return actor === -1
      ? this.host!
      : actor < -1
        ? this.spectators[-actor - 2]
        : this.seats[actor];
  }
  setAvatar(token: string, avatar: string): void {
    const actor = this.identity(token);
    if (actor < 0) throw new Error("服务身份没有玩家头像");
    this.seats[actor].avatar = avatarSchema.parse(avatar);
  }

  disconnect(token: string): void {
    this.arcade?.sample(this.paused, Date.now());
    this.member(token).online = false;
  }

  start(token: string, drawWords?: import("./drawguess/words").DrawWord[]): void {
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
    this.drawWords =
      this.config.kind === "drawguess" && drawWords?.length
        ? structuredClone(drawWords)
        : undefined;
    if (this.config.arcade) {
      if (this.seats.length > 4) throw new Error("远征报名最多四席");
      if (this.arcade && this.arcade.run.phase !== "finished")
        throw new Error("请先完成当前远征");
      if (!this.seats.some((seat) => seat.token))
        throw new Error("等待真人玩家加入");
      this.arcade = new ArcadeSession({
        id: randomId(),
        run: createArcade(
          randomId(),
          this.seats.length,
          this.config.arcadeSettings,
        ),
        remainingMs: 0,
      });
      this.arcade.time(45_000);
      this.aiPaused = false;
      this.minerPaused = false;
      this.ended = false;
      this.version++;
      return;
    }
    if (this.pendingResume) {
      this.state = this.pendingResume;
      this.pendingResume = null;
      this.replay!.names = this.seats.map((seat) => seat.name);
      this.replay!.avatars = this.seats.map(seatAvatar);
      this.challenges = this.replay!.challenges ?? null;
    } else {
      if (this.replay) {
        this.records.push(this.replay);
        this.records = this.records.slice(-20);
      }
      const roundSeed =
        this.config.kind === "scmj" && this.config.mahjong.mode === "washizu"
          ? randomId()
          : `${this.seed}:round:${this.version}`;
      this.createRound(roundSeed);
    }
    this.activateRound();
  }

  private createRound(roundSeed: string, scenario?: ArcadeScenario): void {
    this.state = this.engine.create(
      this.config.kind,
      this.seats.length,
      roundSeed,
      this.config.team,
      {
        ...this.config,
        hostActor: this.seats.findIndex((seat) => seat.id === this.host?.id),
        drawguess: {
          mode: drawModeOf(this.config),
          ...(this.drawWords ? { words: this.drawWords } : {}),
        },
        arcadeScenario: scenario,
      },
    );
    this.series = scenario
      ? null
      : this.series &&
          this.series.kind === this.config.kind &&
          this.series.wins.length === this.seats.length
        ? this.series
        : createSeries(this.config.kind, this.seats.length);
    this.drawPartyBaseline.clear();
    this.replay = {
      format: 1,
      room: this.id,
      config: structuredClone(this.config),
      rulesVersion: gameRulesVersion(
        this.config.kind,
        this.config.mahjong.mode,
      ),
      names: this.seats.map((seat) => seat.name),
      avatars: this.seats.map(seatAvatar),
      memberIds: this.seats.map((s, i) => s.id ?? `ai:${i}`),
      seed: roundSeed,
      ...(scenario && this.arcade
        ? { arcadeScenario: scenario, arcadeRunId: this.arcade.archive.id }
        : {}),
      startedAt: Date.now(),
      ...(this.state.kind === "golf" ? { golfCourses: structuredClone(this.state.view.courses) } : {}),
      ...(isFayuState(this.state)
        ? { drawStart: { round: this.state.view.round, scores: [...this.state.view.scores] } }
        : {}),
      ...(this.state.kind === "drawguess" && this.drawWords
        ? { drawWords: structuredClone(this.drawWords) }
        : {}),
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
        ? {
            expeditionMap: structuredClone(this.state.view.map),
            expeditionCampaign: this.state.view.campaignVersion,
            expeditionTuning: this.state.view.tuning,
          }
        : {}),
      events: [],
    };
    this.challenges = scenario
      ? null
      : createChallengeBoard(this.config.kind, roundSeed, this.seats.length);
    if (this.challenges)
      this.replay.challenges = structuredClone(this.challenges);
  }

  private activateRound(): void {
    if (this.replay && this.state?.kind === "expedition")
      this.replay.expeditionRunId = this.state.view.runId;
    this.version++;
    this.appendTableEvent("game-start", this.config.kind);
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
    this.minerPaused = false;
    this.resolutionAt = 0;
    this.ended = false;
    this.lastMoveAt = Date.now();
    this.aiTempo.reset(this.state, this.lastMoveAt);
    this.actionReadyAt = 0;
    this.queued = null;
    this.updateResolution();
  }

  arcadeAction(token: string, action: ArcadeAction): void {
    const actor = this.identity(token);
    if (!this.arcade) throw new Error("路线已更新");
    const next = this.arcade.apply(
      action,
      actor,
      token === (this.host?.token ?? this.seats[0]?.token),
      this.paused,
      this.seats.length,
      this.seats.flatMap((seat, index) => (seat.difficulty ? [] : [index])),
    );
    this.version++;
    if (next === "enter") this.enterArcadeChallenge();
    else if (next === "advance") this.advanceArcadeRoute();
    else if (next === "retreat")
      this.completeArcadeRound(false, "队伍提前撤离");
  }

  private enterArcadeChallenge(): void {
    const arcade = this.arcade!;
    const challenge = chooseArcade(arcade.run, this.seats.length);
    const ai = arcadeSupplement(challenge.kind, this.seats);
    if (ai.length) {
      this.config.ai = [...this.config.ai, ...ai];
      this.seats.push(...Room.createSeats({ ...this.config, humans: 0, ai }));
      arcade.archive.temporarySeat = ai.length;
    }
    this.config.kind = challenge.kind;
    this.createRound(
      challenge.seed,
      arcadeScenario(challenge, arcade.settings, this.seats.flatMap((seat, index) => seat.difficulty ? [] : [index])),
    );
    this.activateRound();
    arcade.time(challenge.durationMs);
  }

  private archiveArcadeRound(): void {
    if (this.replay) this.records = [...this.records, this.replay].slice(-20);
    this.replay = null;
    if (this.arcade?.archive.temporarySeat) {
      const count = Number(this.arcade.archive.temporarySeat);
      this.arcade.archive.temporarySeat = undefined;
      this.config.ai = this.config.ai.slice(0, -count);
      this.config.kind = "miner";
      this.seats.splice(-count);
    }
    this.state = null;
    this.queued = null;
    this.computation = null;
    this.resolutionAt = 0;
    this.actionReadyAt = 0;
    this.version++;
    this.roundVersion = this.version;
    this.simultaneousSince = this.version;
  }

  private advanceArcadeRoute(): void {
    const arcade = this.arcade!;
    advanceArcade(arcade.run, this.seats.length, arcade.archive.reward);
    arcade.archive.reward = undefined;
    arcade.archive.rewardConfirmed = undefined;
    arcade.time(45_000);
    this.version++;
  }

  private tickArcade(now: number): boolean {
    const arcade = this.arcade;
    if (!arcade || arcade.run.phase === "finished") return false;
    const expired = arcade.sample(this.paused, now);
    if (this.paused) return false;
    const { phase, current } = arcade.run;
    if (phase === "route" && expired) {
      this.enterArcadeChallenge();
      return true;
    }
    if (phase === "reward" && expired) {
      this.advanceArcadeRoute();
      return true;
    }
    if (
      phase !== "playing" ||
      !this.state ||
      !current ||
      now < this.actionReadyAt
    )
      return false;
    const finished = this.engine.finished(this.state);
    if (this.state.kind === "miner" && !finished) return false;
    const result = arcadeOutcome(
      this.state,
      current.target,
      this.seats.map((seat) => !!seat.difficulty),
      finished,
    );
    if (result.readyAfterMs && now < this.lastMoveAt + result.readyAfterMs)
      return false;
    if (
      !finished &&
      !expired &&
      !("reached" in result && result.reached) &&
      (arcade.actionsLeft(this.replay!.events) !== 0 ||
        (this.state.kind === "sgs" &&
          this.state.view.dcdType !== this.engine.constants.qy.PLAY_CARD))
    )
      return false;
    this.completeArcadeRound(result.won, result.detail);
    return true;
  }

  private completeArcadeRound(won: boolean, detail: string): void {
    const arcade = this.arcade!;
    settleArcade(arcade.run, won, detail, this.playId!);
    arcade.time(this.arcadeActive ? 35_000 : 0);
    this.archiveArcadeRound();
  }

  get hasEnded(): boolean {
    return this.ended;
  }
  get playId(): string | undefined {
    return this.replay
      ? `${this.id}:${this.replay.drawStart?.sessionStartedAt ?? this.replay.startedAt}`
      : undefined;
  }
  get pendingRunId(): string | undefined {
    return this.pendingResume?.kind === "expedition"
      ? this.pendingResume.view.runId
      : undefined;
  }

  end(token: string, discardResume = false): void {
    if (!this.canManage(token)) throw new Error("只有房主可以结束对局");
    this.party.cancel();
    this.recordParty();
    this.ended = true;
    if (this.arcadeActive) {
      this.arcade!.run.phase = "finished";
      this.arcade!.time(0);
      this.archiveArcadeRound();
    }
    if (discardResume) this.pendingResume = null;
    this.queued = null;
    this.version++;
    this.appendTableEvent("game-end", this.config.kind);
  }

  changeGame(token: string, setup: RoomSetup): void {
    if (!this.canManage(token)) throw new Error("只有房主可以切换游戏");
    if (this.arcadeActive) throw new Error("请先结束当前远征");
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
    const aiSeatIndex = next.companion.aiSeatIndex;
    Object.assign(this.config, next, {
      party: this.party.export().policy,
      plugins: this.party.export().plugins,
      companion: {
        ...this.config.companion,
        aiSeatIndex:
          aiSeatIndex !== null && aiSeatIndex < next.ai.length
            ? aiSeatIndex
            : null,
      },
    });
    for (const member of members.filter(
      (seat) => !setup.retain.includes(seat.id!),
    )) {
      this.spectators.push({
        id: member.id!,
        token: member.token!,
        name: member.name,
        avatar: seatAvatar(member),
        online: member.online,
      });
    }
    this.seats.splice(0, this.seats.length, ...seats);
    this.bannerPolicy = {
      ...this.bannerPolicy,
      members: this.bannerPolicy.members.filter((id) =>
        seats.some((seat) => seat.id === id),
      ),
    };
    this.state = null;
    this.arcade = undefined;
    delete this.config.arcade;
    delete this.config.arcadeSettings;
    if (next.arcade) this.config.arcade = true;
    if (next.arcadeSettings) this.config.arcadeSettings = next.arcadeSettings;
    this.party.cancel();
    this.pendingResume = null;
    this.computation = null;
    this.aiPaused = false;
    this.minerPaused = false;
    this.replay = null;
    this.challenges = null;
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
    const identity = this.identity(token);
    const roundControl =
      isFayuState(this.state) &&
      (action.type === "draw-round" || action.type === "draw-end");
    if (roundControl && token !== (this.host?.token ?? this.seats[0]?.token))
      throw new Error("只有房主可以控制法语回合");
    if (!roundControl && identity < 0) throw new Error("服务身份不参与游戏");
    const actor = roundControl && isFayuState(this.state)
      ? this.state.view.host
      : identity;
    const key = `${token}:${id}`;
    if (this.accepted.has(key)) return;
    if (Date.now() < this.actionReadyAt)
      throw new Error("请等待当前动作播放完成");
    if (!roundControl && this.seats[actor].autoplay) throw new Error("请先取消托管，再手动操作");
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
    this.commitAction(actor, action, roundControl ? this.host ?? undefined : undefined);
    this.accepted.add(key);
    if (this.accepted.size > 2048)
      this.accepted.delete(this.accepted.values().next().value!);
  }

  chat(token: string, id: string, text: string): ChatMessage | undefined {
    this.identity(token);
    if (this.accepted.has(`${token}:chat:${id}`)) return;
    const banner = parseChatCommand(text);
    if (!banner) return this.addMessage(token, id, { type: "text", text });
    const member = this.member(token);
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
        return this.addMessage(token, id, {
          type: "clear",
          text: "清除了横幅",
        });
      if (banner.kind === "emote")
        return this.addMessage(token, id, {
          type: "emote",
          text: banner.text,
        });
      const results = rollDice(banner.count, banner.sides);
      return this.addMessage(token, id, {
        type: "roll",
        sides: banner.sides,
        results,
        text: `🎲 ${banner.count}d${banner.sides}：${results.join("、")}，合计 ${results.reduce((sum, value) => sum + value, 0)}（娱乐）`,
      });
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
    return this.addMessage(token, id, {
      type: "banner",
      text: banner.text,
      banner,
    });
  }
  setCompanion(token: string, input: CompanionConfig): void {
    if (!this.canManage(token)) throw new Error("只有房主可以设置 AI");
    const next: CompanionConfig = {
      ...companionConfigSchema.parse(input),
      provider: this.config.companion.provider,
    };
    const aiSeats = this.seats.filter((seat) => seat.difficulty !== null);
    if (next.aiSeatIndex !== null && next.aiSeatIndex >= aiSeats.length)
      throw new Error("聊天 AI 席位无效");
    if (JSON.stringify(next) === JSON.stringify(this.config.companion)) return;
    const identity = this.companionProfile();
    if (next.policy.enabled && !identity)
      throw new Error("请先在准备页面添加 AI 席位");
    const wasEnabled = this.config.companion.policy.enabled;
    this.config.companion = next;
    if (!wasEnabled && next.policy.enabled && identity)
      this.addSystemMessage(
        randomId().slice(0, 8),
        `AI「${identity.name}」已接入聊天，@${identity.name} 可以搭话。`,
      );
    if (wasEnabled && !next.policy.enabled)
      this.addSystemMessage(
        randomId().slice(0, 8),
        identity ? `AI「${identity.name}」已离开聊天。` : "AI 聊天已关闭。",
      );
    this.version++;
  }
  setAiProvider(token: string, provider: AiProviderSettings): void {
    if (!this.canManage(token)) throw new Error("只有房主可以配置 AI");
    const next = aiProviderSettingsSchema.parse(provider);
    if (JSON.stringify(next) === JSON.stringify(this.config.companion.provider))
      return;
    this.config.companion.provider = next;
    this.version++;
  }
  companionProfile(): CompanionProfile | null {
    const aiSeats = this.seats
      .map((seat, index) => ({ seat, index }))
      .filter(({ seat }) => seat.difficulty !== null);
    if (!aiSeats.length) return null;
    const selected = this.config.companion.aiSeatIndex;
    const target =
      (selected !== null ? aiSeats[selected] : undefined) ?? aiSeats[0]!;
    return {
      id: this.config.companion.profile.id,
      name: seatDisplayName(target.seat, target.index, this.state),
      avatar: seatAvatar(target.seat),
      persona: this.config.companion.profile.persona,
      source: this.config.companion.profile.source,
    };
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
  achievementChat(token: string, id: string, achievementId: string): void {
    const definition = achievementById.get(achievementId);
    if (!definition || definition.game !== this.config.kind)
      throw new Error("成就不属于当前游戏");
    const actor = this.identity(token);
    const member = this.member(token);
    const name =
      actor < 0
        ? member.name
        : seatDisplayName(this.seats[actor], actor, this.state);
    this.addAchievementMessage(id, member.id!, name, definition);
  }
  private addAchievementMessage(
    id: string,
    sender: string,
    name: string,
    definition: AchievementDefinition,
  ): void {
    const key = `system:${id}`;
    if (this.accepted.has(key)) return;
    this.messages.push({
      type: "achievement",
      text: `${name} 达成了「${definition.title}」成就`,
      achievementId: definition.id,
      title: definition.title,
      symbol: definition.symbol,
      rarity: definition.rarity,
      game: definition.game,
      id,
      sequence: ++this.messageSequence,
      sender,
      name,
      time: Date.now(),
      source: "system",
    });
    if (this.messages.length > 200) this.messages.shift();
    this.appendTableEvent(
      "achievement",
      `${name} 达成了「${definition.title}」成就`,
      sender,
      name,
    );
    this.accepted.add(key);
    if (this.accepted.size > 2048)
      this.accepted.delete(this.accepted.values().next().value!);
  }
  private addSystemMessage(id: string, text: string): void {
    const key = `system:${id}`;
    if (this.accepted.has(key)) return;
    this.messages.push({
      type: "system",
      text,
      id,
      sequence: ++this.messageSequence,
      sender: "system",
      name: "系统",
      time: Date.now(),
      source: "system",
    });
    if (this.messages.length > 200) this.messages.shift();
    this.accepted.add(key);
    if (this.accepted.size > 2048)
      this.accepted.delete(this.accepted.values().next().value!);
  }
  private addMessage(
    token: string,
    id: string,
    content: ChatContent,
  ): ChatMessage | undefined {
    const actor = this.identity(token);
    const key = `${token}:chat:${id}`;
    if (this.accepted.has(key)) return;
    const member = this.member(token);
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
      source: "human",
    };
    this.messages.push(message);
    this.appendTableEvent("chat", message.text, sender, message.name);
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
    return message;
  }
  addCompanionMessage(
    triggerId: string,
    text: string,
  ): ChatMessage | undefined {
    if (!this.config.companion.policy.enabled) return;
    const profile = this.companionProfile();
    if (!profile) return;
    const id = `companion:${triggerId}`;
    const key = `companion:${triggerId}`;
    if (this.accepted.has(key)) return;
    const message: ChatMessage = {
      type: "text",
      text,
      id,
      sequence: ++this.messageSequence,
      sender: `companion:${profile.id}`,
      name: profile.name,
      time: Date.now(),
      source: "ai",
    };
    this.messages.push(message);
    this.appendTableEvent("chat", message.text, message.sender, message.name);
    if (this.messages.length > 200) this.messages.shift();
    this.accepted.add(key);
    if (this.accepted.size > 2048)
      this.accepted.delete(this.accepted.values().next().value!);
    return message;
  }
  private seatActorId(index: number): string {
    return this.seats[index]?.id ?? `ai:${index}`;
  }
  private appendTableEvent(
    kind: TableEventKind,
    label: string,
    actor?: string,
    actorName?: string,
    payload?: PublicAction,
  ): void {
    const seq = ++this.tableEventSequence;
    this.tableEvents.push({
      id: `table:${seq}`,
      seq,
      version: this.version,
      at: Date.now(),
      kind,
      actor,
      actorName,
      label: label.slice(0, 200),
      public: true,
      payload: payload ? structuredClone(payload) : undefined,
    });
    if (this.tableEvents.length > 500) this.tableEvents.shift();
  }
  drainTableEvents(): TableEvent[] {
    const events = this.tableEvents;
    this.tableEvents = [];
    return events;
  }
  publicContext(): PublicRoomContext {
    const phase: PublicRoomContext["phase"] =
      this.hasEnded || (this.state && this.engine.finished(this.state))
        ? "finished"
        : this.state
          ? "playing"
          : "lobby";
    return {
      game: gameCatalogue[this.config.kind].name,
      phase,
      players: this.seats.map((seat, index) =>
        seatDisplayName(seat, index, this.state),
      ),
      recentChat: this.messages
        .filter(
          (message) =>
            message.type === "text" ||
            message.type === "system" ||
            message.type === "achievement",
        )
        .slice(-20),
    };
  }
  private partyContext(): PartyContext {
    return {
      players: [
        ...this.seats.map((s, i) => ({
          id: s.id ?? `ai:${i}`,
          name: s.name,
          human: !!s.token,
        })),
        ...this.spectators.map((s) => ({
          id: s.id,
          name: s.name,
          human: true,
        })),
      ],
      observers: [
        ...(this.ended ? [] : observerSeats(this.state, this.seats.length)),
        ...this.spectators.map((_, i) => this.seats.length + i),
      ],
      round:
        this.replay?.config.mahjong.mode === "washizu"
          ? `${this.id}:${this.replay.startedAt}`
          : (this.replay?.seed ?? "lobby"),
      playing: !!this.state && !this.ended && !this.engine.finished(this.state),
      finished: !!this.state && !this.ended && this.engine.finished(this.state),
      state: this.state,
      ...partyResults(
        this.state,
        this.seats.map((seat, i) => ({
          id: seat.id ?? `ai:${i}`,
          name: seat.name,
        })),
        this.engine,
      ),
    };
  }
  partyAction(
    token: string,
    id: string,
    action: PartyAction,
    now = Date.now(),
  ): PartyEvent | undefined {
    const event = this.party.execute(
      this.partyActor(token),
      id,
      action,
      this.partyContext(),
      this.canManage(token),
      now,
    );
    if (event && this.state?.kind === "graphwar") {
      const view = this.state.view;
      const from =
        view.soldiers.find(
          (s) =>
            this.partyContext().players[s.player]?.id === event.from &&
            s.hp > 0 &&
            s.id === view.currentSoldier,
        ) ??
        view.soldiers.find(
          (s) =>
            this.partyContext().players[s.player]?.id === event.from &&
            s.hp > 0,
        ) ??
        view.soldiers.find(
          (s) => this.partyContext().players[s.player]?.id === event.from,
        );
      const target =
        view.soldiers.find(
          (s) =>
            this.partyContext().players[s.player]?.id === event.target &&
            s.hp > 0,
        ) ??
        view.soldiers.find(
          (s) => this.partyContext().players[s.player]?.id === event.target,
        );
      if (from && target)
        event.units = { game: "graphwar", from: from.id, target: target.id };
    }
    this.config.party = this.party.export().policy;
    this.config.plugins = this.party.export().plugins;
    this.recordParty();
    return event;
  }
  partyActor(token: string): number {
    const actor = this.identity(token);
    return actor < -1 ? this.seats.length - actor - 2 : actor;
  }
  tickParty(now = Date.now()): boolean {
    const changed = this.party.sync(this.partyContext(), now);
    if (changed) this.recordParty();
    return changed;
  }
  private recordParty(): void {
    if (!this.replay) return;
    const current = this.party.export().events,
      history = (this.replay.party ??= []);
    for (const event of current) {
      const saved = history.find((e) => e.event.id === event.id);
      if (saved) saved.event = event;
      else if (!this.drawPartyBaseline.has(event.id))
        history.push({ frame: this.replay.events.length, event });
    }
    this.replay.party = history.filter(
      (saved) =>
        saved.event.time <= Date.now() ||
        current.some((e) => e.id === saved.event.id),
    );
  }
  interact(
    token: string,
    id: string,
    target: number,
    kind: InteractionKind,
    units?: InteractionUnits,
  ): InteractionEvent | undefined {
    if (kind in partyItems) throw new Error("请从房间派对购买道具");
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
    driver: "search" | "llm";
    seed: string;
    version: number;
    audit: boolean;
    choices: boolean;
  } | null {
    if (
      Date.now() < this.actionReadyAt ||
      !this.state ||
      this.ended ||
      this.paused ||
      this.queued ||
      this.engine.finished(this.state)
    )
      return null;
    for (const actor of this.engine.actors(this.state)) {
      const seat = this.seats[actor];
      if (
        !seat.difficulty &&
        !(["scmj", "expedition"].includes(this.config.kind) && seat.autoplay)
      )
        continue;
      if (
        this.state.kind === "miner" &&
        (!this.engine.candidates(this.state, actor).length ||
          this.aiReadyAt(actor) > Date.now())
      )
        continue;
      const observation = this.engine.project(this.state, actor);
      const driver = seat.driver ?? "search";
      return {
        tradeEnabled: this.config.catanTrades,
        audit: this.config.auditEnabled,
        choices: driver === "llm" && supportsLlmDecisions(this.config.kind),
        observation,
        actor,
        difficulty: seat.difficulty ?? "normal",
        driver,
        seed: `decision:${this.id}:${this.version}:${actor}`,
        version: this.version,
      };
    }
    return null;
  }

  private commitAction(
    actor: number,
    action: Action,
    moderator?: { id: string; name: string },
  ): void {
    const previous = this.state!;
    const seed = `${this.seed}:move:${this.version}`;
    const next = this.engine.apply(previous, actor, action, seed);
    const nextVersion = this.version + 1;
    if (
      this.engine.actionWindow(previous, action) !==
      this.engine.actionWindow(next, action)
    )
      this.simultaneousSince = nextVersion;
    this.party.trigger(
      partySignals(previous, next, actor, action, this.engine),
      this.partyContext(),
      nextVersion,
    );
    this.state = next;
    this.recordSeriesFinish(previous);
    this.challenges = advanceChallenges(
      this.challenges,
      previous,
      next,
      actor,
      action,
      nextVersion,
      this.seats[actor].difficulty === null,
    );
    if (this.challenges && this.replay)
      this.replay.challenges = structuredClone(this.challenges);
    this.queued = null;
    this.lastMoveAt = Date.now();
    this.aiTempo.observe(next, this.lastMoveAt);
    this.actionReadyAt = this.lastMoveAt + this.engine.actionDelay(next);
    this.version = nextVersion;
    const event = describePublicAction(action);
    this.appendTableEvent(
      "action",
      event.label,
      moderator?.id ?? this.seatActorId(actor),
      moderator?.name ?? seatDisplayName(this.seats[actor], actor, next),
      event.payload,
    );
    if (isFayuState(next) && action.type === "draw-round" && this.replay) {
      const previousRound = this.replay;
      this.records = [...this.records, previousRound].slice(-20);
      this.drawPartyBaseline = new Set(this.party.export().events.map(({ id }) => id));
      this.replay = {
        ...previousRound,
        startedAt: Math.max(this.lastMoveAt, previousRound.startedAt + 1),
        drawStart: {
          round: next.view.round,
          scores: [...next.view.scores],
          sessionStartedAt: previousRound.drawStart?.sessionStartedAt ?? previousRound.startedAt,
        },
        truncated: undefined,
        social: undefined,
        party: undefined,
        events: [],
      };
    } else this.appendReplayEvent({
      type: "action",
      actor,
      action: structuredClone(action),
      seed,
      version: nextVersion,
      graphwarShot:
        next.kind === "graphwar" && action.type === "graphwar-fire"
          ? structuredClone(next.view.lastShot!)
          : undefined,
      poolShot:
        next.kind === "pool" && action.type === "pool-shot"
          ? structuredClone(next.view.lastShot!)
          : undefined,
    });
    const duelDone = isFayuState(next) && fayuDuelGuessingComplete(next.view);
    if (duelDone) this.resolveStep();
    if (duelDone || !(
      this.engine.keepsDeadline(previous, action) ||
      (this.engine.acceptsLateActions(previous) &&
        this.engine.acceptsLateActions(next))
    ))
      this.updateResolution();
    else this.syncResolutionParty();
    if (this.arcadeActive) this.tickArcade(Date.now());
  }

  acceptDecision(decision: AiResult, version: number): boolean {
    if (
      Date.now() < this.actionReadyAt ||
      !this.state ||
      this.ended ||
      this.paused ||
      (version !== this.version &&
        !(
          version < this.version &&
          version >= this.simultaneousSince &&
          this.engine.acceptsLateActions(this.state)
        ))
    )
      return false;
    if (
      this.state.kind === "miner" &&
      ["shop", "intermission"].includes(this.state.view.phase) &&
      !this.engine
        .candidates(this.state, decision.actor)
        .some(
          ({ action }) =>
            JSON.stringify(action) === JSON.stringify(decision.chosen),
        )
    )
      return false;
    this.commitAction(decision.actor, decision.chosen);
    if (this.config.auditEnabled && decision.audit && this.state) {
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
    return true;
  }

  resolveIfDue(now = Date.now()): boolean {
    if (this.tickArcade(now)) return true;
    if (
      !this.state ||
      this.ended ||
      this.paused ||
      !this.engine.needsResolution(this.state)
    )
      return false;
    if (
      this.engine.acceptsLateActions(this.state) &&
      this.engine.actors(this.state).length
    ) {
      const step = this.engine.resolutionDelay(this.state)!;
      let count = 0;
      while (count < 4 && now >= this.resolutionAt) {
        this.resolveStep();
        count++;
        if (
          !this.engine.acceptsLateActions(this.state) ||
          !this.engine.actors(this.state).length
        ) {
          this.updateResolution();
          return true;
        }
        this.resolutionAt += step;
      }
      if (count) this.syncResolutionParty();
      return count > 0;
    }
    if (this.engine.actors(this.state).length && now < this.resolutionAt)
      return false;
    this.resolveStep();
    this.updateResolution();
    return true;
  }

  private resolveStep(): void {
    const previous = this.state!;
    this.state = this.engine.resolve(
      previous,
      `${this.seed}:resolve:${this.version}`,
    );
    this.recordSeriesFinish(previous);
    this.party.trigger(
      partySignals(previous, this.state, -1, undefined, this.engine),
      this.partyContext(),
      this.version + 1,
    );
    this.version++;
    if (
      previous.kind === "miner" &&
      this.state.kind === "miner" &&
      previous.view.phase !== this.state.view.phase
    )
      this.simultaneousSince = this.version;
    this.appendReplayEvent({
      type: "resolution",
      seed: `${this.seed}:resolve:${this.version - 1}`,
      version: this.version,
    });
    this.queued = null;
    this.lastMoveAt = Date.now();
    this.aiTempo.observe(this.state, this.lastMoveAt);
    this.actionReadyAt = 0;
  }

  private recordSeriesFinish(previous: GameState | null): void {
    if (
      !previous ||
      !this.state ||
      this.ended ||
      this.config.arcade ||
      this.engine.finished(previous) ||
      !this.engine.finished(this.state)
    )
      return;
    this.series = recordSeriesRound(
      this.series,
      this.config.kind,
      this.seats.length,
      gameWinners(this.state, this.seats.length),
    );
  }

  snapshot(token: string): Snapshot {
    const actor = this.identity(token);
    const paused = this.paused;
    const finished = this.arcade
      ? this.arcade.run.phase === "finished"
      : this.ended || (this.state ? this.engine.finished(this.state) : false);
    let projected = this.projection.get(actor);
    if (
      !projected ||
      projected.version !== this.version ||
      projected.paused !== paused
    ) {
      const state =
        (actor >= 0 ||
          actor < -1 ||
          isFayuState(this.state) ||
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
    const companionIdentity = this.companionProfile();
    const fayuState = isFayuState(projected.state) ? projected.state : undefined;
    const canvas = fayuState
      ? {
          canvases: structuredClone(fayuState.view.canvases),
          fills: structuredClone(fayuState.view.fills),
        }
      : undefined;
    const state = fayuState
      ? {
          ...fayuState,
          view: {
            ...fayuState.view,
            host: this.host ? -1 : fayuState.view.host,
            canvases: Array.from({ length: fayuState.view.players }, () => []),
            fills: {},
          },
        }
      : projected.state;
    return {
      arcade: this.arcade?.snapshot(paused, this.replay?.events),
      partyQueue: structuredClone(this.partyQueue),
      resumeRoles:
        this.pendingResume?.kind === "expedition"
          ? this.pendingResume.view.combat.heroes.map((h, i) => ({
              profession: heroContent[h.profession].name,
              name: this.replay?.names[i] ?? "",
            }))
          : undefined,
      serverTime: Date.now(),
      apiVersion: protocolVersion,
      rulesVersion: gameRulesVersion(
        this.config.kind,
        this.config.mahjong.mode,
      ),
      room: this.id,
      kind: this.config.kind,
      config: { ...this.config },
      version: this.version,
      actor,
      canManage: this.canManage(token),
      playing: this.arcadeActive || (!!this.state && !finished),
      playId: this.playId,
      host: this.host
        ? { id: this.host.id, name: this.host.name, online: this.host.online }
        : null,
      seats: this.seats.map((seat, index) => ({
        id: seat.id || `ai:${index}`,
        name: seatDisplayName(seat, index, this.state),
        avatar: seatAvatar(seat),
        difficulty: seat.difficulty,
        team:
          this.config.kind === "uno" && this.config.team
            ? index % 2
            : undefined,
        autoplay: seat.autoplay,
        driver: seat.driver,
        online: seat.online,
        ready: seat.ready,
      })),
      state,
      ...(canvas ? { canvas } : {}),
      candidates: projected.candidates,
      computation: this.computation,
      aiPaused: this.aiPaused,
      ...(this.minerPaused ? { minerPaused: true } : {}),
      companion: {
        enabled: this.config.companion.policy.enabled,
        name: companionIdentity?.name ?? "",
        avatar: companionIdentity?.avatar ?? "🤖",
        configured: false,
        available: !!companionIdentity,
      },
      bannerPolicy: this.bannerPolicy,
      party: this.party.snapshot(this.partyContext()),
      partyActor: this.partyActor(token),
      spectators: this.spectators.map(({ token: _token, ...member }) => member),
      chat: this.messages,
      chatSequence: this.messageSequence,
      chatTotals: this.messageTotals,
      decisions: finished || this.config.training ? this.decisions : [],
      paused: this.paused,
      replay: finished ? this.replay : null,
      records: this.records,
      summaries: this.summaries.slice(-30),
      challenges: this.challenges,
      finished,
      series: this.series ? structuredClone(this.series) : null,
      resolving:
        !!this.state &&
        this.engine.needsResolution(this.state) &&
        this.engine.resolutionDelay(this.state) === undefined,
      turnDeadline:
        this.state?.kind === "golf" && this.state.view.phase === "scorecard"
          ? this.actionReadyAt
          : ["graphwar", "pool", "drawguess"].includes(this.state?.kind ?? "") &&
              !finished &&
              this.resolutionAt
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
  setMinerPaused(token: string, paused: boolean): void {
    if (
      !this.canManage(token) ||
      this.config.humans !== 1 ||
      this.state?.kind !== "miner" ||
      this.ended ||
      this.engine.finished(this.state)
    )
      throw new Error("仅单人黄金矿脉对局支持暂停");
    if (this.minerPaused === paused) return;
    const wasPaused = this.paused;
    this.minerPaused = paused;
    this.queued = null;
    this.computation = null;
    this.simultaneousSince = ++this.version;
    if (wasPaused && !this.paused) this.updateResolution();
  }

  setAiRunning(token: string, enabled: boolean): void {
    this.identity(token);
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
    if (this.config.aiDelayMs === delayMs) return;
    this.config.aiDelayMs = delayMs;
    this.version++;
  }

  queueDecision(decision: AiResult, version: number): boolean {
    if (
      !this.state ||
      this.ended ||
      this.queued ||
      (version !== this.version &&
        !(
          version < this.version &&
          version >= this.simultaneousSince &&
          this.engine.acceptsLateActions(this.state)
        ))
    )
      return false;
    if (this.computation?.version === version) {
      this.updateComputation(decision.actor, version, {
        ...this.computation,
        status: "completed",
      });
      this.computation!.source = decision.source ?? "search";
      this.computation!.fallbackReason = decision.fallbackReason;
    }
    this.queued = { decision, version };
    return true;
  }

  commitIfDue(now = Date.now()): boolean {
    if (this.paused || !this.queued || !this.state) return false;
    const { decision, version } = this.queued;
    if (now < this.aiReadyAt(decision.actor)) return false;
    this.queued = null;
    if (!this.acceptDecision(decision, version)) return false;
    this.aiTempo.committed(decision.actor, now);
    return true;
  }

  private aiReadyAt(actor: number): number {
    return this.aiTempo.readyAt(
      this.state!, actor, this.config, this.lastMoveAt, this.actionReadyAt,
    );
  }

  acceptsLateActions(): boolean {
    return !!this.state && this.engine.acceptsLateActions(this.state);
  }

  identity(token: string): number {
    if (this.host?.token === token) return -1;
    const spectator = this.spectators.findIndex((s) => s.token === token);
    if (spectator >= 0) return -spectator - 2;
    const actor = this.seats.findIndex((seat) => seat.token === token);
    if (actor < 0) throw new Error("房间身份无效");
    return actor;
  }

  private get arcadeActive(): boolean {
    return !!this.arcade && this.arcade.run.phase !== "finished";
  }

  get paused(): boolean {
    return (
      (this.arcadeActive ||
        (!!this.state && !this.ended && !this.engine.finished(this.state))) &&
      (this.aiPaused ||
        this.minerPaused ||
        this.seats.some(
          (seat) => !seat.difficulty && !seat.autoplay && !seat.online,
        ))
    );
  }
  setReady(token: string, ready: boolean): void {
    const actor = this.identity(token);
    if (actor < 0) throw new Error("服务身份不参与准备");
    const seat = this.seats[actor];
    if (
      this.arcadeActive ||
      (this.state && !this.ended && !this.engine.finished(this.state))
    )
      throw new Error("对局中不能更改准备状态");
    seat.ready = ready;
  }
  leave(token: string): void {
    const actor = this.identity(token);
    if (actor < -1) {
      this.spectators.splice(-actor - 2, 1);
      return;
    }
    if (actor <= 0) throw new Error("房主需要关闭房间");
    const seat = this.seats[actor];
    const id = seat.id;
    this.bannerPolicy = {
      ...this.bannerPolicy,
      members: this.bannerPolicy.members.filter((member) => member !== id),
    };
    if (id) delete this.messageTotals[id];
    if (
      this.arcadeActive ||
      (this.state && !this.ended && !this.engine.finished(this.state))
    ) {
      this.arcade?.sample(this.paused, Date.now());
      if (gameCatalogue[this.config.kind].ai) {
        seat.difficulty = "normal";
        seat.online = true;
        seat.ready = true;
        seat.autoplay = false;
        seat.token = undefined;
        seat.id = undefined;
      } else {
        seat.online = false;
        seat.ready = false;
      }
      this.party.sync(this.partyContext());
      return;
    }
    this.seats[actor] = {
      name: "",
      difficulty: null,
      online: false,
      ready: false,
    };
    this.party.sync(this.partyContext());
  }
  configureSeat(token: string, index: number, config: SeatConfig): void {
    if (!this.canManage(token)) throw new Error("只有房主可以调整席位");
    if (
      this.arcadeActive ||
      (this.state && !this.ended && !this.engine.finished(this.state))
    )
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
            driver: config.driver ?? "search",
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
        driver: seat.driver ?? "search",
        ...(balanceBySeat.get(seat) ? { balance: true } : {}),
      }));
  }
  export(): RoomArchive {
    return {
      format: 1,
      arcade: this.arcade ? structuredClone(this.arcade.archive) : undefined,
      partyQueue: structuredClone(this.partyQueue),
      pendingResume: this.pendingResume ?? undefined,
      checkpoint: this.state
        ? { version: this.version, state: structuredClone(this.state) }
        : undefined,
      id: this.id,
      seed: this.seed,
      config: this.config,
      seats: this.seats,
      spectators: this.spectators,
      host: this.host,
      version: this.version,
      roundVersion: this.roundVersion,
      simultaneousSince: this.simultaneousSince,
      ended: this.ended,
      aiPaused: this.aiPaused,
      ...(this.minerPaused ? { minerPaused: true } : {}),
      replay: this.replay,
      drawWords: this.drawWords,
      records: this.records,
      messageSequence: this.messageSequence,
      messageTotals: this.messageTotals,
      bannerPolicy: this.bannerPolicy,
      party: this.party.export(),
      bannerTimes: Object.fromEntries(this.bannerTimes),
      chatEventTimes: Object.fromEntries(this.chatEventTimes),
      messages: this.messages,
      decisions: this.decisions,
      summaries: this.summaries,
      series: this.series ? structuredClone(this.series) : null,
      accepted: [...this.accepted],
    };
  }
  static restore(archive: RoomArchive): Room {
    if (archive.format !== 1) throw new Error("房间存档版本不支持");
    if (!Number.isSafeInteger(archive.version) ||
        !Number.isSafeInteger(archive.roundVersion) ||
        !Array.isArray(archive.seats) ||
        !Array.isArray(archive.records) ||
        !Array.isArray(archive.messages))
      throw new Error("房间存档结构无效");
    archive = structuredClone(archive);
    if ((archive.config.kind as string) === "fayu")
      archive.config = configSchema.parse({ ...archive.config, kind: "drawguess", drawguess: { mode: "fayu" } });
    if (archive.replay) archive.replay = upgradeDrawRecord(archive.replay) as ReplayRecord;
    const checkpoint = archive.checkpoint?.state;
    if (checkpoint && (checkpoint.kind as string) === "fayu")
      Object.assign(checkpoint, { kind: "drawguess", mode: "fayu" });
    if (checkpoint?.kind === "drawguess" && !checkpoint.mode)
      Object.assign(checkpoint, { mode: drawModeOf(archive.config) });
    if (checkpoint?.kind === "golf" && checkpoint.view.courses && archive.replay && !archive.replay.golfCourses)
      archive.replay.golfCourses = checkpoint.view.courses;
    if (archive.messageSequence === undefined) {
      archive = structuredClone(archive);
      archive.seats.forEach((seat) => {
        if (seat.token && !seat.id) seat.id = randomId();
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
    room.spectators.push(
      ...(archive.spectators ?? []).map((s) => ({ ...s, online: false })),
    );
    room.host = archive.host ? { ...archive.host, online: false } : null;
    room.drawWords = archive.drawWords
      ? structuredClone(archive.drawWords)
      : undefined;
    room.party = new PartyLedger(archive.party);
    room.version = archive.version;
    room.roundVersion = archive.roundVersion;
    room.ended = archive.ended;
    room.aiPaused = archive.aiPaused ?? false;
    room.minerPaused = archive.minerPaused === true;
    room.simultaneousSince = archive.simultaneousSince ?? room.version;
    room.arcade = archive.arcade
      ? new ArcadeSession(archive.arcade)
      : undefined;
    room.partyQueue = archive.partyQueue ?? { revision: 0, entries: [] };
    room.replay = archive.replay;
    room.challenges = archive.replay?.challenges ?? null;
    room.records = archive.records;
    if (archive.replay?.drawStart?.sessionStartedAt !== undefined) {
      const priorPartyIds = new Set(room.records.flatMap((record) => (record.party ?? []).map(({ event }) => event.id)));
      room.drawPartyBaseline = new Set(room.party.export().events.filter(({ id }) => priorPartyIds.has(id)).map(({ id }) => id));
    }
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
    room.series = archive.series ? structuredClone(archive.series) : null;
    if (
      archive.replay &&
      ["miner", "pool"].includes(archive.replay.config.kind) &&
      archive.replay.rulesVersion !==
        gameRulesVersion(archive.replay.config.kind)
    ) {
      room.records = [...room.records, archive.replay].slice(-20);
      if (room.arcade?.run.phase === "playing") {
        room.arcade.run.phase = "finished";
        room.arcade.time(0);
      }
      room.replay = null;
      room.challenges = null;
      room.state = null;
      room.ended = false;
      room.aiPaused = false;
      room.minerPaused = false;
    } else if (archive.replay) {
      const replay = new Replay(archive.replay);
      if (replay.record.truncated && !archive.pendingResume && archive.checkpoint?.version !== archive.version)
        throw new Error("存档的回放已截断且缺少有效快照");
      room.state = archive.pendingResume
        ? null
        : archive.checkpoint?.version === archive.version
          ? structuredClone(archive.checkpoint.state)
          : replay.frame(replay.record.events.length);
      if (room.state?.kind === "golf") {
        room.state.view.courses ??= [...replay.golfCourses];
        room.replay!.golfCourses = room.state.view.courses;
      }
    }
    room.pendingResume = archive.pendingResume ?? null;
    if (room.state?.kind === "expedition") migrateExpedition(room.state.view);
    if (room.pendingResume?.kind === "expedition")
      migrateExpedition(room.pendingResume.view);
    if (room.pendingResume) room.state = null;
    room.lastMoveAt = Date.now();
    room.aiTempo.reset(room.state, room.lastMoveAt);
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

  private syncResolutionParty(): void {
    this.party.sync(this.partyContext());
    this.recordParty();
  }

  private updateResolution(): void {
    this.syncResolutionParty();
    this.resolutionAt =
      this.state && this.engine.needsResolution(this.state)
        ? Math.max(Date.now(), this.actionReadyAt) +
          (this.engine.resolutionDelay(this.state) ??
            Math.max(4500, this.config.aiDelayMs + 500))
        : 0;
  }
}

export interface RoomArchive {
  partyQueue?: PartyQueue;
  spectators?: Room["spectators"];
  party?: PartyState;
  format: 1;
  arcade?: ArcadeArchive;
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
  minerPaused?: boolean;
  replay: ReplayRecord | null;
  drawWords?: import("./drawguess/words").DrawWord[];
  records: ReplayRecord[];
  messageSequence: number;
  messageTotals: Record<string, number>;
  bannerPolicy?: BannerPolicy;
  bannerTimes?: Record<string, number>;
  chatEventTimes?: Record<string, number>;
  messages: ChatMessage[];
  decisions: Decision[];
  summaries: DecisionSummary[];
  series?: Series | null;
  accepted: string[];
}
