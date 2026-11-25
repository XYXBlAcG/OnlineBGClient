import type { GameState } from "./types";
import { golfFrameMs } from "./golf/physics";
import { isMinerShop } from "./miner/geometry";

const minimumMs: Partial<Record<GameState["kind"], number>> = {
  sgs: 1000,
  scmj: 1000,
  expedition: 950,
  pool: 1000,
  graphwar: 1050,
  golf: 2400,
};
const ballPlaybackRestMs = 450;

export class AiTempo {
  private window = "";
  private lastByActor = new Map<number, number>();
  private lastAiAt = 0;

  reset(state: GameState | null, now: number): void {
    this.window = "";
    this.lastAiAt = now;
    this.lastByActor.clear();
    this.observe(state, now);
  }

  observe(state: GameState | null, now: number): void {
    const window =
      state?.kind === "golf"
        ? `golf:${state.view.hole}`
        : state?.kind === "miner"
          ? `miner:${state.view.floor}:${state.view.phase}`
          : "";
    if (this.window === window) return;
    this.window = window;
    this.lastAiAt = now;
    this.lastByActor.clear();
  }

  committed(actor: number, now: number): void {
    this.lastAiAt = now;
    this.lastByActor.set(actor, now);
  }

  readyAt(
    state: GameState,
    actor: number,
    config: { humans: number; aiDelayMs: number },
    lastMoveAt: number,
    actionReadyAt: number,
  ): number {
    if (state.kind === "miner" && state.view.phase === "live")
      return actionReadyAt;
    if (!config.humans)
      return Math.max(actionReadyAt, lastMoveAt + config.aiDelayMs);
    const interval = Math.max(config.aiDelayMs, minimumMs[state.kind] ?? 700);
    if (state.kind === "golf" && state.view.phase === "putting") {
      const playedAt = this.lastByActor.get(actor);
      const frames = state.view.players[actor]?.lastShot?.frames.length ?? 0;
      const playbackReady =
        playedAt === undefined
          ? 0
          : playedAt + frames * golfFrameMs + ballPlaybackRestMs;
      return Math.max(actionReadyAt, this.lastAiAt + interval, playbackReady);
    }
    if (state.kind === "miner" && isMinerShop(state.view.phase))
      return Math.max(actionReadyAt, this.lastAiAt + interval);
    const afterAnimation =
      state.kind === "pool" && actionReadyAt > lastMoveAt
        ? actionReadyAt + ballPlaybackRestMs
        : actionReadyAt;
    return Math.max(afterAnimation, lastMoveAt + interval);
  }
}
