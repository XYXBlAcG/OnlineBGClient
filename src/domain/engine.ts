import { UpstreamRuntime } from "../upstream/runtime";
import { gameCatalogue, gameKinds, type GameKind } from "./catalogue";
import { CheckersRules } from "./checkers";
import { SgsRules } from "./sgs";
import { FlightRules } from "./flight";
import type { GameRules } from "./plugin";
import type { Action, Candidate, GameState } from "./types";

export class GameEngine {
  readonly runtime = new UpstreamRuntime();
  readonly checkers = new CheckersRules(this.runtime);
  readonly flight = new FlightRules(this.runtime);
  readonly uno = this.runtime.load(6435);
  readonly sgs = this.runtime.load(5051);
  readonly constants = this.runtime.load(8655);
  readonly rules = this.runtime.load(6749);
  readonly cards = this.runtime.load(8280);
  private plugins = new Map<GameKind, GameRules>(
    gameKinds.map((kind) => [kind, gameCatalogue[kind].rules(this.runtime)]),
  );
  private sgsRules = new SgsRules(this.runtime);

  seed(seed: string): () => number {
    const generator = this.runtime.load(6359) as unknown as (
      seed: string,
    ) => () => number;
    return (this.runtime.random = generator(seed));
  }
  create(
    kind: GameKind,
    players: number,
    seed: string,
    team = false,
  ): GameState {
    const game = gameCatalogue[kind];
    if (
      !game ||
      !Number.isInteger(players) ||
      players < game.minPlayers ||
      players > game.maxPlayers
    )
      throw new Error("玩家数量超出该游戏人数范围");
    this.seed(seed);
    return this.plugins.get(kind)!.create(players, team);
  }
  finished(state: GameState): boolean {
    return this.plugins.get(state.kind)!.finished(state);
  }
  actors(state: GameState): number[] {
    return this.plugins.get(state.kind)!.actors(state);
  }
  candidates(state: GameState, actor: number): Candidate[] {
    return this.plugins.get(state.kind)!.candidates(state, actor);
  }
  needsResolution(state: GameState): boolean {
    return this.plugins.get(state.kind)!.needsResolution(state);
  }
  resolve(state: GameState, seed: string): GameState {
    this.seed(seed);
    return this.plugins.get(state.kind)!.resolve(state, seed);
  }
  apply(
    state: GameState,
    actor: number,
    action: Action,
    seed: string,
  ): GameState {
    if (this.finished(state)) throw new Error("对局已结束");
    this.seed(seed);
    return this.plugins.get(state.kind)!.apply(state, actor, action);
  }
  project(state: GameState, actor: number): GameState {
    return this.plugins.get(state.kind)!.project(state, actor);
  }
  keepValue(card: number): number {
    return this.sgsRules.keepValue(card);
  }
}
