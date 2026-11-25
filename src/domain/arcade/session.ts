import {
  arcadeRewards,
  defaultArcadeSettings,
  healArcadeCamp,
  rerouteArcade,
  voteArcade,
  type ArcadeReward,
  type ArcadeRun,
} from "./campaign";
import type { ArcadeAction, ArcadeSnapshot } from "../protocol";

export interface ArcadeArchive {
  id: string;
  run: ArcadeRun;
  remainingMs: number;
  reward?: ArcadeReward;
  rewardConfirmed?: boolean;
  temporarySeat?: true | number;
}

export class ArcadeSession {
  private sampledAt = Date.now();

  constructor(readonly archive: ArcadeArchive) {}

  get run() {
    return this.archive.run;
  }

  get settings() {
    return this.run.settings ?? defaultArcadeSettings;
  }

  apply(
    action: ArcadeAction,
    actor: number,
    manages: boolean,
    paused: boolean,
    players: number,
    humans: number[],
  ) {
    const { run } = this;
    if (action.run !== this.archive.id || action.stage !== run.stage)
      throw new Error("路线已更新");
    if (paused) throw new Error("等待玩家恢复连接");
    if (action.type === "vote") {
      if (!humans.includes(actor)) throw new Error("只有玩家可以投票");
      voteArcade(run, actor, action.option);
      return humans.every((seat) => !!run.votes[seat]) ? "enter" : undefined;
    }
    if (action.type === "ready") {
      if (run.phase !== "reward" || (!manages && !humans.includes(actor)))
        throw new Error("当前没有待确认的结算");
      if (
        action.reward &&
        (!manages || !arcadeRewards(run).includes(action.reward))
      )
        throw new Error("该遗物不可选");
      if (manages) {
        this.archive.reward = action.reward;
        this.archive.rewardConfirmed = true;
      }
      if (actor >= 0 && !run.ready.includes(actor)) run.ready.push(actor);
      return humans.every((seat) => run.ready.includes(seat)) &&
        (!arcadeRewards(run).length || this.archive.rewardConfirmed)
        ? "advance"
        : undefined;
    }
    if (!manages) throw new Error("只有房主可以执行远征操作");
    if (action.type === "reroute") rerouteArcade(run, players);
    else if (action.type === "camp-heal") healArcadeCamp(run);
    else if (run.phase === "playing") return "retreat";
    else throw new Error("当前没有进行中的远征");
  }

  time(ms: number) {
    this.archive.remainingMs = this.settings.countdown ? ms : 0;
    this.sampledAt = Date.now();
  }

  sample(paused: boolean, now: number) {
    if (!this.settings.countdown) return false;
    if (!paused)
      this.archive.remainingMs = Math.max(
        0,
        this.remaining - Math.max(0, now - this.sampledAt),
      );
    this.sampledAt = now;
    return this.remaining === 0;
  }

  get remaining() {
    return this.archive.remainingMs;
  }

  actionsLeft(events: readonly { type: string }[] = []): number | undefined {
    const limit = this.run.current?.actionLimit ?? 0;
    return this.settings.actionLimit && this.run.phase === "playing" && limit
      ? Math.max(
          0,
          limit -
            events.reduce(
              (sum, event) => sum + Number(event.type === "action"),
              0,
            ),
        )
      : undefined;
  }

  snapshot(
    paused: boolean,
    events?: readonly { type: string }[],
  ): ArcadeSnapshot {
    const { seed: _seed, options, current, results, ...run } = this.run;
    const publicChallenge = ({
      seed: _hidden,
      ...challenge
    }: ArcadeRun["options"][number]) => challenge;
    return {
      ...structuredClone(run),
      id: this.archive.id,
      rewards: run.phase === "reward" ? arcadeRewards(this.run) : [],
      reward: this.archive.reward,
      rewardConfirmed: this.archive.rewardConfirmed,
      options: options.map(publicChallenge),
      current: current ? publicChallenge(current) : null,
      results: results.map(({ challenge, ...result }) => ({
        ...result,
        challenge: publicChallenge(challenge),
      })),
      remainingMs: this.remaining,
      deadline:
        this.remaining && !paused ? this.sampledAt + this.remaining : undefined,
      actionsLeft: this.actionsLeft(events),
    };
  }
}
