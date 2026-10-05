import { CatanStrategy } from "./catan-strategy";
import { SplendorStrategy } from "./splendor-strategy";
import type { SearchRequest } from "./strategy";
import { gameCatalogue, type GameKind } from "./catalogue";
import { Strategy } from "./strategy";
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
    options?: Pick<SearchRequest, "search" | "tradeEnabled">,
  ): Decision;
}
export class Strategies {
  private plugins = new Map<GameKind, StrategyPlugin>();
  private kernels = new Map<GameKind, () => Strategy>();
  constructor() {
    for (const [Factory, kinds] of [
      [Strategy, ["uno", "sgs", "fxq", "tq", "dy"]],
      [CatanStrategy, ["ktd"]],
      [SplendorStrategy, ["ccbs"]],
    ] as [typeof Strategy, GameKind[]][]) {
      let instance: Strategy | undefined;
      const kernel = () => (instance ||= new Factory());
      this.register({
        apiVersion: 1,
        version: Factory.version,
        games: Object.fromEntries(
          kinds.map((kind) => [kind, gameCatalogue[kind].version]),
        ),
        decide: (...args) => kernel().decide(...args),
      });
      for (const kind of kinds) this.kernels.set(kind, kernel);
    }
  }
  select(kind: GameKind): Strategy {
    const kernel = this.kernels.get(kind);
    if (!kernel) throw new Error(`${gameCatalogue[kind].name} AI 尚未接入`);
    return kernel();
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
    options?: Pick<SearchRequest, "search" | "tradeEnabled">,
  ): Decision {
    const plugin = this.plugins.get(observation.kind);
    if (!plugin)
      throw new Error(`${gameCatalogue[observation.kind].name} AI 尚未接入`);
    if (version && version !== plugin.version)
      throw new Error("审核策略版本不兼容");
    return plugin.decide(observation, actor, difficulty, seed, options);
  }
}
