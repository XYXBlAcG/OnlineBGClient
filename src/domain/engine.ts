import type { GameOptions } from "./game-options";
import { UpstreamRuntime } from "../upstream/runtime";
import { gameSeatMinimum, gameCatalogue, gameKinds, type GameKind } from "./catalogue";
import { gameRules } from "./rule-catalogue";
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
    gameKinds.map((kind) => [kind, gameRules[kind](this.runtime)]),
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
    options?: GameOptions,
  ): GameState {
    const game = gameCatalogue[kind];
    if (
      !game ||
      !Number.isInteger(players) ||
      players < gameSeatMinimum(kind, options?.drawguess?.mode) ||
      players > game.maxPlayers
    )
      throw new Error("玩家数量超出该游戏人数范围");
    if (options?.arcadeScenario?.kind === "pool")
      options = {
        ...options,
        pool: {
          mode: players === 2 ? "nine-ball" : "party",
          assist: true,
          shotSeconds: 0,
        },
      };
    if (options?.arcadeScenario?.kind === "graphwar")
      options = {
        ...options,
        graphwar: {
          mode: "classic",
          scenario: "classic",
          map: "open",
          size: "standard",
          soldiers: 1,
          preview: true,
          turnSeconds: 0,
        },
      };
    if (options?.arcadeScenario?.kind === "tq")
      options = {
        ...options,
        checkers: {
          ...options.checkers,
          mode:
            players === 2 && !options.arcadeScenario.noActionCap
              ? "siege"
              : "classic",
        },
      };
    if (options?.arcadeScenario?.kind === "scmj")
      options = {
        ...options,
        mahjong: { mode: "sichuan", cap: 3, selfDraw: "base" },
      };
    this.seed(seed);
    const state = this.plugins.get(kind)!.create(players, team, {
      ...options,
      roundSeed: seed,
    });
    if (
      state.kind === "graphwar" &&
      options?.arcadeScenario?.kind === "graphwar" &&
      options.arcadeScenario.noActionCap
    )
      state.view.arcadeUncapped = true;
    if (state.kind === "scmj" && options?.mahjong)
      state.view.options = structuredClone(options.mahjong);
    return state;
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
  actionDelay(state: GameState): number {
    return this.plugins.get(state.kind)!.actionDelay(state);
  }
  resolutionDelay(state: GameState): number | undefined {
    return this.plugins.get(state.kind)!.resolutionDelay(state);
  }
  acceptsLateActions(state: GameState): boolean {
    return this.plugins.get(state.kind)!.acceptsLateActions?.(state) ?? false;
  }
  keepsDeadline(state: GameState, action: Action): boolean {
    return this.plugins.get(state.kind)!.keepsDeadline?.(state, action) ?? false;
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
  actionWindow(state: GameState, action: Action): string | undefined {
    return this.plugins.get(state.kind)!.actionWindow(state, action);
  }
  keepValue(card: number): number {
    return this.sgsRules.keepValue(card);
  }
}
