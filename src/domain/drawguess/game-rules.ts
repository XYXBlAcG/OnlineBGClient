import type { GameOptions } from "../game-options";
import type { Rules } from "../plugin";
import type { Action, Candidate } from "../types";
import { FayuRules } from "../fayu/rules";
import type { FayuState } from "../fayu/types";
import { DrawRules } from "./rules";
import type { DrawState } from "./types";

type DrawGameState = DrawState | FayuState;

export class DrawGameRules implements Rules<"drawguess"> {
  private classic: DrawRules;
  private fayu: FayuRules;

  constructor(private readonly random: () => number) {
    this.classic = new DrawRules(random);
    this.fayu = new FayuRules(random);
  }

  private rules(state: DrawGameState) {
    return state.mode === "fayu" ? this.fayu : this.classic;
  }

  create(players: number, team: boolean, options?: GameOptions) {
    return options?.drawguess?.mode === "fayu"
      ? this.fayu.create(players, team, options)
      : this.classic.create(players, team, options);
  }

  finished(state: DrawGameState) {
    return this.rules(state).finished(state as never);
  }

  actors(state: DrawGameState) {
    return this.rules(state).actors(state as never);
  }

  candidates(state: DrawGameState, actor: number): Candidate[] {
    return this.rules(state).candidates(state as never, actor);
  }

  apply(state: DrawGameState, actor: number, action: Action): DrawGameState {
    const rules = this.rules(state);
    if (action.type !== "draw-edit") return rules.apply(state as never, actor, action);
    if (action.edit.round !== state.view.round || state.view.phase !== "drawing")
      throw new Error("这一轮已经更新");
    const history = state.mode === "fayu" ? state.drawingHistory?.[actor] : state.drawingHistory;
    if (history?.lastEdit === action.id) return state;
    const revision = history?.round === state.view.round ? history.revision : 0;
    if (action.revision !== revision) throw new Error("画板已更新，请同步后重试");
    const next = rules.apply(state as never, actor, action.edit);
    if (next.mode === "classic" && next.drawingHistory) {
      return { ...next, drawingHistory: { ...next.drawingHistory, lastEdit: action.id } };
    }
    if (next.mode === "fayu") {
      const edited = next.drawingHistory?.[actor];
      if (edited) return {
        ...next,
        drawingHistory: { ...next.drawingHistory, [actor]: { ...edited, lastEdit: action.id } },
      };
    }
    return next;
  }

  project(state: DrawGameState, actor: number) {
    return this.rules(state).project(state as never, actor);
  }

  needsResolution(state: DrawGameState) {
    return state.mode === "fayu"
      ? this.fayu.needsResolution(state)
      : this.classic.needsResolution(state);
  }

  resolve(state: DrawGameState, seed: string) {
    return state.mode === "fayu"
      ? this.fayu.resolve(state, seed)
      : this.classic.resolve(state);
  }

  resolutionDelay(state: DrawGameState) {
    return state.mode === "fayu"
      ? this.fayu.resolutionDelay(state)
      : this.classic.resolutionDelay(state);
  }

  actionDelay(state: DrawGameState) {
    return state.mode === "fayu" ? 0 : 0;
  }

  actionWindow(state: DrawGameState, input: Action) {
    const action = input.type === "draw-edit" ? input.edit : input;
    return state.mode === "fayu"
      ? this.fayu.actionWindow(state, action)
      : this.classic.actionWindow(state, action);
  }

  acceptsLateActions(state: DrawGameState) {
    return state.mode === "classic"
      ? this.classic.acceptsLateActions(state)
      : false;
  }

  keepsDeadline(state: DrawGameState, input: Action) {
    const action = input.type === "draw-edit" ? input.edit : input;
    return state.mode === "fayu" ? this.fayu.keepsDeadline(state, action) : false;
  }
}
