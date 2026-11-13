import { Strategy, type SearchRequest } from "./strategy";
import { DdzRules, ddzTrickOwner } from "./ddz";
import type { Candidate, DecisionCandidate, GameState } from "./types";

export class DdzStrategy extends Strategy {
  static readonly version = "ddz-public-hand-1";
  readonly version = DdzStrategy.version;
  readonly rules = new DdzRules(this.engine.runtime);
  budget(_request: SearchRequest) {
    return { samples: 0, depth: 0, shortlist: 0 };
  }
  score(request: SearchRequest, moves: Candidate[]): DecisionCandidate[] {
    return moves.map((candidate) => {
      const result = this.evaluate(
        request.observation,
        request.actor,
        candidate,
        request.seed,
        request.audit,
      );
      if (request.observation.kind !== "ddz" || request.difficulty === "easy")
        return result;
      const view = request.observation.view,
        action = candidate.action;
      const owner = ddzTrickOwner(view);
      const partner =
        request.actor + 1 !== view.landlordId &&
        owner !== view.landlordId &&
        owner !== request.actor + 1;
      const adjustment =
        action.type === "ddz-pass" && partner && !view.canPlayAnyCards ? 60 : 0;
      result.score += adjustment;
      if (request.audit && adjustment)
        result.features.push({
          name: "保留农民队友领出权",
          value: 1,
          weight: adjustment,
          contribution: adjustment,
        });
      if (request.difficulty === "hard" && action.type === "ddz-play") {
        const remaining = view.playerCardLists[request.actor + 1].filter(
          (card) => !action.cards.includes(card),
        );
        const ranks = new Set(
          remaining.map((card) => this.rules.original.Vz(card) as number),
        );
        const links = [...ranks].filter(
          (rank) => rank < 14 && ranks.has(rank + 1),
        ).length;
        result.score += links * 3;
        if (request.audit)
          result.features.push({
            name: "保留连续牌连接",
            value: links,
            weight: 3,
            contribution: links * 3,
          });
      }
      return result;
    });
  }
  protected evaluate(
    observation: GameState,
    actor: number,
    candidate: Candidate,
    _seed: string,
    audit = true,
  ): DecisionCandidate {
    if (observation.kind !== "ddz") throw new Error("策略游戏不匹配");
    const view = observation.view,
      action = candidate.action;
    const cards = action.type === "ddz-play" ? action.cards : [];
    const hand = view.playerCardLists[actor + 1];
    const ranks = cards.map((card) => this.rules.original.Vz(card) as number);
    const remaining = hand.filter((card) => !cards.includes(card));
    const counts = new Map<number, number>();
    for (const card of remaining) {
      const rank = this.rules.original.Vz(card) as number;
      counts.set(rank, (counts.get(rank) ?? 0) + 1);
    }
    const features: [string, number, number][] = [
      ["出牌数量", cards.length, 12],
      [
        "保留大牌",
        ranks.reduce((sum, rank) => sum + Math.min(rank, 18), 0),
        -0.35,
      ],
      ["剩余散牌", [...counts.values()].filter((n) => n === 1).length, -2],
      ["一次出完", cards.length === hand.length ? 1 : 0, 10000],
    ];
    if (
      cards.length &&
      ranks.every((r) => r === ranks[0]) &&
      cards.length === 4
    )
      features.push(["保留炸弹", 1, -18]);
    if (cards.length === 2 && ranks.every((r) => r >= 53))
      features.push(["保留王炸", 1, -24]);
    return {
      ...candidate,
      score: features.reduce((s, [, v, w]) => s + v * w, 0),
      features: audit
        ? features.map(([name, value, weight]) => ({
            name,
            value,
            weight,
            contribution: value * weight,
          }))
        : [],
    };
  }
}
