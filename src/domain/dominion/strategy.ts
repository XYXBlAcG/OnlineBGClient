import {
  Strategy,
  type SearchRequest,
  type RootSamples,
  type SampleValue,
} from "../strategy";
import type {
  Action,
  AiResult,
  Candidate,
  DecisionCandidate,
  GameState,
} from "../types";
import { cardDefinition, dominionCards, type CardId } from "./cards";
import type { DominionView } from "./types";
export class DominionStrategy extends Strategy {
  static readonly version = "dominion-deck-economy-1";
  readonly version = DominionStrategy.version;
  budget(request: SearchRequest) {
    return {
      easy: { samples: 0, depth: 0, shortlist: 0 },
      normal: { samples: 12, depth: 0, shortlist: 3 },
      hard: { samples: 48, depth: 0, shortlist: 5 },
    }[request.difficulty];
  }
  private value(view: DominionView, actor: number, card: CardId) {
    const inventory = view.players[actor].inventory ?? {},
      count = (id: CardId) => inventory[id] ?? 0;
    const remaining = view.supply.province ?? 0,
      late = remaining <= 3 || view.round > 22;
    const definition = cardDefinition(card);
    const total = Object.values(inventory).reduce((sum, n) => sum + n, 0);
    const terminals = (Object.keys(inventory) as CardId[]).reduce(
      (n, id) =>
        n +
        (cardDefinition(id).type === "action" &&
        !(cardDefinition(id).actions! > 0)
          ? count(id)
          : 0),
      0,
    );
    const actions = (Object.keys(inventory) as CardId[]).reduce(
      (n, id) => n + (cardDefinition(id).type === "action" ? count(id) : 0),
      0,
    );
    if (card === "province") return 100;
    if (card === "duchy") return late ? 48 : remaining <= 5 ? 22 : -6;
    if (card === "estate") return remaining <= 2 ? 15 : -10;
    if (card === "curse") return -35;
    if (card === "copper") return count("copper") < 4 && total < 12 ? 2 : -12;
    if (card === "silver") return 20 - count("silver") * 1.3;
    if (card === "gold") return 39 - count("gold") * 0.5;
    if (card === "gardens")
      return total >= 26 || count("gardens") > 0
        ? Math.floor(total / 10) * (late ? 14 : 8)
        : -3;
    if (card === "chapel")
      return count(card) || late || view.round > 6 ? -8 : 32;
    if (card === "village")
      return Math.min(33, terminals * 9 - count(card) * 9) - 3;
    if (card === "festival") return 24 + terminals * 3 - count(card) * 7;
    if (card === "witch")
      return (view.supply.curse ?? 0) > 0 ? 40 - count(card) * 15 : 13;
    if (card === "laboratory") return 36 - count(card) * 0.5;
    if (card === "market") return 32;
    if (card === "sentry") return late ? 24 : 37 - count(card) * 7;
    if (card === "merchant")
      return 18 + Math.min(3, count("silver")) * 2 - count(card) * 3;
    if (card === "moneylender")
      return count("copper") >= 5 && !count(card) && !late ? 27 : 0;
    if (card === "throne") return actions >= 4 && count(card) < 2 ? 26 : 3;
    const base: Partial<Record<CardId, number>> = {
      smithy: 26,
      militia: 26,
      moat: 13,
      bandit: 33,
      library: 27,
      council: 29,
      harbinger: 16,
      poacher: 23,
      remodel: 17,
      workshop: 12,
      artisan: 30,
      vassal: 14,
      cellar: 12,
      bureaucrat: 12,
    };
    return (
      (base[card] ?? definition.cost * 4) -
      count(card) * 10 -
      Math.max(0, terminals - count("village") - count("festival") - 2) * 6
    );
  }
  protected evaluate(
    observation: GameState,
    actor: number,
    candidate: Candidate,
    seed: string,
    audit = true,
  ): DecisionCandidate {
    if (
      observation.kind !== "dominion" ||
      candidate.action.type !== "dominion-action"
    )
      throw new Error("策略游戏不匹配");
    const view = observation.view,
      move = candidate.action.move;
    let score = -60,
      reason = "阶段推进";
    if (move.type === "buy") {
      score = this.value(view, actor, move.card);
      reason = "牌库构筑、供应余量与终局收益";
    }
    if (move.type === "play") {
      const card = cardDefinition(move.card);
      score =
        card.type === "treasure"
          ? 45
          : 55 +
            (card.actions ?? 0) * 12 +
            (card.cards ?? 0) * 3 +
            (card.coins ?? 0) * 2;
      if (move.card === "throne") score += 18;
      if (move.card === "library")
        score += Math.max(0, 7 - view.players[actor].hand.length) * 4;
      reason = "先扩展行动与抽牌，再执行终结行动";
    }
    if (move.type === "treasures") score = 5;
    if (move.type === "buy-phase") score = -10;
    if (move.type === "choose") {
      const prompt = view.prompt!;
      reason = prompt.title;
      const card =
        move.choice in dominionCards ? (move.choice as CardId) : undefined;
      if (card) {
        const value = this.value(view, actor, card);
        if (
          ["chapel", "remodel", "mine", "moneylender"].includes(prompt.kind)
        ) {
          const late = (view.supply.province ?? 0) <= 3;
          const desirability =
            card === "curse"
              ? 80
              : card === "estate" && !late
                ? 45
                : card === "copper" &&
                    (view.players[actor].inventory?.copper ?? 0) > 2
                  ? 35
                  : -value;
          score =
            prompt.kind === "mine"
              ? 50 - cardDefinition(card).cost
              : desirability;
        } else if (
          [
            "militia",
            "poacher",
            "bureaucrat",
            "topdeck",
            "cellar",
            "bandit",
          ].includes(prompt.kind)
        ) {
          const definition = cardDefinition(card);
          const handValue =
            definition.type === "victory" || definition.type === "curse"
              ? 0
              : (definition.value ?? 0) * 10 +
                (definition.cards ?? 0) * 7 +
                (definition.actions ?? 0) * 5 +
                (definition.coins ?? 0) * 8 +
                (definition.effect ? 5 : 0);
          score = 30 - handValue;
          if (prompt.kind === "cellar" && handValue > 0) score -= 40;
        } else score = value;
      } else {
        score =
          move.choice === "done"
            ? 0
            : move.choice === "block"
              ? 100
              : move.choice === "play"
                ? 65
                : -5;
        if (prompt.kind === "library")
          score =
            move.choice === "keep"
              ? 20 +
                (cardDefinition(prompt.cards[0] as CardId).actions ?? 0) * 12
              : view.actions > 0
                ? 0
                : 25;
        if (prompt.kind === "sentry") {
          const id = prompt.cards[0] as CardId,
            value = this.value(view, actor, id);
          score =
            move.choice === "trash"
              ? -value
              : move.choice === "discard"
                ? cardDefinition(id).type === "victory"
                  ? 20
                  : 0
                : value;
        }
      }
    }
    if (seed.includes(":easy-noise:")) score += this.engine.seed(seed)() * 4;
    return {
      ...candidate,
      score,
      features: audit
        ? [{ name: reason, value: score, weight: 1, contribution: score }]
        : [],
    };
  }
  score(request: SearchRequest, candidates: Candidate[]): DecisionCandidate[] {
    return candidates.map((candidate) => {
      const result = this.evaluate(
        request.observation,
        request.actor,
        candidate,
        request.difficulty === "easy"
          ? `${request.seed}:easy-noise:${JSON.stringify(candidate.action)}`
          : request.seed,
        request.audit,
      );
      if (
        request.difficulty === "easy" &&
        candidate.action.type === "dominion-action" &&
        candidate.action.move.type === "buy"
      ) {
        const definition = cardDefinition(candidate.action.move.card);
        result.score =
          definition.type === "action" ? result.score * 0.6 : result.score;
        if (request.audit)
          result.features = [
            {
              name: "简单难度：偏重财宝，保留少量行动牌",
              value: result.score,
              weight: 1,
              contribution: result.score,
            },
          ];
      }
      return result;
    });
  }
  simulate(
    request: SearchRequest,
    action: Action,
    indexes: number[],
  ): SampleValue[] {
    if (
      request.observation.kind !== "dominion" ||
      action.type !== "dominion-action"
    )
      return [];
    const view = request.observation.view,
      move = action.move;
    if (!(
      move.type === "buy" ||
      (move.type === "choose" &&
        ["gain", "chapel", "mine", "remodel", "moneylender"].includes(
          view.prompt?.kind ?? "",
        ) &&
        move.choice in dominionCards)
    ))
      return [];
    const card =
      move.type === "buy"
        ? move.card
        : ((move as { choice: string }).choice as CardId);
    const inventory = view.players[request.actor].inventory ?? {};
    const before = (Object.entries(inventory) as [CardId, number][]).flatMap(
        ([card, count]) => Array(count).fill(card) as CardId[],
      ),
      after = [...before];
    if (move.type === "choose" && view.prompt?.kind !== "gain")
      after.splice(after.indexOf(card), 1);
    else after.push(card);
    return indexes.map((index) => {
      const income = (cards: CardId[]) => {
        const deck = [...cards],
          random = this.engine.seed(`${request.seed}:income:${index}`);
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        let cardsToDraw = 5,
          coins = 0,
          actions = 1;
        for (let i = 0; i < Math.min(deck.length, cardsToDraw); i++) {
          const card = cardDefinition(deck[i]);
          coins += card.value ?? 0;
          if (card.type === "action" && actions > 0) {
            actions += (card.actions ?? 0) - 1;
            cardsToDraw += card.cards ?? 0;
            coins += card.coins ?? 0;
          }
        }
        return coins + (coins >= 8 ? 5 : coins >= 6 ? 2 : 0);
      };
      return { index, value: income(after) - income(before) };
    });
  }
  complete(
    request: SearchRequest,
    candidates: DecisionCandidate[],
    samples: RootSamples[],
  ): AiResult {
    const result = super.complete(request, candidates, samples);
    if (result.audit)
      result.audit.assumptions = [
        "仅使用本人的手牌、已知牌组成和公共供应，不读取真实牌库顺序或对手手牌。",
        "普通／困难对部分购牌与移除候选抽样估算洗牌后的五张手牌购买力；这是有限启发式评估，不是完整对局搜索或胜率。",
        "评分考虑行动拥堵、抽牌、财宝密度、攻击和终局时机；审核关闭时不生成解释记录。",
      ];
    return result;
  }
}
