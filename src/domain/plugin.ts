import type { GameOptions } from "./game-options";
import type { Action, Candidate, GameState } from "./types";

type State<K extends GameState["kind"]> = Extract<GameState, { kind: K }>;
export interface GameRules {
  create(players: number, team: boolean, options?: GameOptions): GameState;
  finished(state: GameState): boolean;
  actors(state: GameState): number[];
  candidates(state: GameState, actor: number): Candidate[];
  apply(state: GameState, actor: number, action: Action): GameState;
  project(state: GameState, actor: number): GameState;
  needsResolution(state: GameState): boolean;
  resolve(state: GameState, seed: string): GameState;
  resolutionDelay(state: GameState): number | undefined;
  actionWindow(state:GameState,action:Action):string|undefined;
}
export interface Rules<K extends GameState["kind"]> {
  create(players: number, team: boolean, options?: GameOptions): State<K>;
  finished(state: State<K>): boolean;
  actors(state: State<K>): number[];
  candidates(state: State<K>, actor: number): Candidate[];
  apply(state: State<K>, actor: number, action: Action): State<K>;
  project(state: State<K>, actor: number): State<K>;
  needsResolution?: (state: State<K>) => boolean;
  resolve?: (state: State<K>, seed: string) => State<K>;
  resolutionDelay?: (state: State<K>) => number;
  actionWindow?: (state:State<K>,action:Action)=>string|undefined;
}
export class GameAdapter<K extends GameState["kind"]> implements GameRules {
  constructor(
    readonly kind: K,
    private rules: Rules<K>,
  ) {}
  create(players: number, team: boolean, options?: GameOptions): GameState {
    return this.rules.create(players, team, options);
  }
  finished(state: GameState): boolean {
    return this.rules.finished(this.state(state));
  }
  actors(state: GameState): number[] {
    return this.rules.actors(this.state(state));
  }
  candidates(state: GameState, actor: number): Candidate[] {
    return this.rules.candidates(this.state(state), actor);
  }
  apply(state: GameState, actor: number, action: Action): GameState {
    return this.rules.apply(this.state(state), actor, action);
  }
  project(state: GameState, actor: number): GameState {
    return this.rules.project(this.state(state), actor);
  }
  needsResolution(state: GameState): boolean {
    return this.rules.needsResolution?.(this.state(state)) ?? false;
  }
  resolve(state: GameState, seed: string): GameState {
    if (!this.rules.resolve) throw new Error("没有待结算阶段");
    return this.rules.resolve(this.state(state), seed);
  }
  resolutionDelay(state: GameState): number | undefined {
    return this.rules.resolutionDelay?.(this.state(state));
  }
  actionWindow(state:GameState,action:Action):string|undefined {return this.rules.actionWindow?.(this.state(state),action);}
  private state(state: GameState): State<K> {
    if (state.kind !== this.kind) throw new Error("游戏类型不匹配");
    return state as State<K>;
  }
}
