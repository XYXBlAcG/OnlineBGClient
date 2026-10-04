import { gameCatalogue, gameKinds, type GameKind } from "./catalogue";
import { Strategy, strategyConfig } from "./strategy";
import type { Decision, Difficulty, GameState } from "./types";

export interface StrategyPlugin {
  apiVersion: 1;
  version: string;
  games: Partial<Record<GameKind, string>>;
  decide(
    observation: GameState,
    actor: number,
    difficulty: Difficulty,
    seed: string,
  ): Decision;
}
export class Strategies {
  private plugins = new Map<GameKind, StrategyPlugin>();
  constructor() {
    const weighted = new Strategy();
    this.register({
      apiVersion: 1,
      version: strategyConfig.version,
      games: Object.fromEntries(
        gameKinds
          .filter((kind) => gameCatalogue[kind].ai)
          .map((kind) => [kind, gameCatalogue[kind].version]),
      ),
      decide: weighted.decide.bind(weighted),
    });
  }
  register(plugin: StrategyPlugin): void {
    if (plugin.apiVersion !== 1) throw new Error("策略契约版本不支持");
    const kinds = Object.keys(plugin.games) as GameKind[];
    for (const kind of kinds) {
      if (plugin.games[kind] !== gameCatalogue[kind]?.version)
        throw new Error("策略规则版本不兼容");
      if (this.plugins.has(kind)) throw new Error("该游戏已有策略");
    }
    for (const kind of kinds) this.plugins.set(kind, plugin);
  }
  decide(
    observation: GameState,
    actor: number,
    difficulty: Difficulty,
    seed: string,
    version?: string,
  ): Decision {
    const plugin = this.plugins.get(observation.kind);
    if (!plugin)
      throw new Error(`${gameCatalogue[observation.kind].name} AI 尚未接入`);
    if (version && version !== plugin.version)
      throw new Error("审核策略版本不兼容");
    return plugin.decide(observation, actor, difficulty, seed);
  }
}
