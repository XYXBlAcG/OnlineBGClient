import { EconomicStrategy } from "./economic-strategy";
import { SplendorRules } from "./splendor";
import type { GameState } from "./types";
export class SplendorStrategy extends EconomicStrategy {
  static readonly version = "splendor-information-search-1";
  readonly version = SplendorStrategy.version;
  readonly rules = new SplendorRules(this.engine.runtime);
  values(state: GameState, actor: number): [string, number, number][] {
    if (state.kind !== "ccbs") throw new Error("策略游戏不匹配");
    const v = state.view,
      cards = this.rules.cards,
      gems = v.playerGem[actor],
      bonuses = v.playerCardCount[actor];
    const market = [
      ...v.bankCard
        .flat()
        .filter(Boolean)
        .map((id) => id - 1),
      ...v.playerBooked[actor].filter((id) => id >= 0),
    ];
    const goals = market
      .map((id) => {
        const cost = (cards.s2[id] as number[]).map((n, i) =>
            Math.max(0, n - bonuses[i]),
          ),
          missing = Math.max(
            0,
            cost.reduce((s, n, i) => s + Math.max(0, n - gems[i]), 0) - gems[5],
          );
        const payment = cost.reduce((a, b) => a + b, 0),
          points = cards.KI[id] as number;
        const engineBonus =
          1 +
          Math.max(
            ...v.bankNoble
              .filter(Boolean)
              .map((n) =>
                Math.max(
                  0,
                  cards.Hf[n - 1][cards.dS[id]] - bonuses[cards.dS[id]],
                ),
              ),
            0,
          ) /
            4;
        return (
          (points * 7 + engineBonus * 5) / (1 + missing * 0.8 + payment * 0.1)
        );
      })
      .sort((a, b) => b - a);
    const nobles = v.bankNoble
      .filter(Boolean)
      .map((id) =>
        (cards.Hf[id - 1] as number[]).reduce(
          (s, n, i) => s + Math.max(0, n - bonuses[i]),
          0,
        ),
      );
    const leading = Math.max(...v.playerScore.filter((_, id) => id !== actor));
    const reserved = v.playerBooked[actor]
      .filter((id) => id >= 0)
      .reduce(
        (sum, id) =>
          sum +
          (cards.KI[id] + 1) /
            (1 +
              (cards.s2[id] as number[]).reduce(
                (s, n, i) => s + Math.max(0, n - bonuses[i] - gems[i]),
                0,
              )),
        0,
      );
    return [
      ["声望", v.playerScore[actor], 30],
      ["永久折扣", bonuses.reduce((a, b) => a + b), 5],
      ["目标购买效率", (goals[0] || 0) + (goals[1] || 0) * 0.2, 2],
      ["贵族距离", nobles.length ? 1 / (1 + Math.min(...nobles)) : 0, 15],
      ["黄金灵活性", gems[5], 2],
      ["预留目标", reserved, 1],
      ["预留占用", v.playerBooked[actor].length, -1.5],
      ["超量宝石", Math.max(0, gems.reduce((a, b) => a + b) - 10), -2],
      ["领先分数", v.playerScore[actor] - leading, 4],
      ["获胜", v.winner.includes(actor + 1) ? 1 : 0, 1000],
    ];
  }
  sample(observation: GameState, actor: number, seed: string): GameState {
    if (observation.kind !== "ccbs") throw new Error("策略游戏不匹配");
    const state = structuredClone(observation),
      v = state.view,
      random = this.engine.seed(seed),
      seen = new Set([
        ...v.bankCard
          .flat()
          .filter(Boolean)
          .map((n) => n - 1),
        ...v.playerCard.flat(),
        ...v.playerBooked.flat().filter((n) => n >= 0),
      ]);
    const pool = Array.from({ length: 90 }, (_, i) => i).filter(
      (id) => !seen.has(id),
    );
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    v.playerBooked = v.playerBooked.map((booked) =>
      booked.map((id) => {
        if (id >= 0) return id;
        const index = pool.findIndex((c) => this.rules.cards.XO[c] === -1 - id);
        return pool.splice(index, 1)[0];
      }),
    );
    v.bankLeftCard = [0, 1, 2].map((level) =>
      pool.filter((id) => this.rules.cards.XO[id] === level),
    );
    v.bankLeftCardCount = v.bankLeftCard.map((cards) => cards.length);
    v.initial = null;
    v.recordList = [];
    return state;
  }
  complete(...args: Parameters<EconomicStrategy["complete"]>) {
    const result = super.complete(...args);
    if (result.audit)
      result.audit.assumptions = [
        "市场、宝石、已购牌和公开预留历史可见；对手暗抽预留牌与补牌从未见牌中抽样。",
        "比较折扣引擎、购买效率、贵族距离和终局威胁；有限信息集树搜索不保证最优，评分不是胜率。",
      ];
    return result;
  }
}
