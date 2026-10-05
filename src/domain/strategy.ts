import { GameEngine } from "./engine";
import type {
  Action,
  AiResult,
  Candidate,
  Decision,
  DecisionCandidate,
  Difficulty,
  Feature,
  GameState,
} from "./types";
export const strategyConfig = {
  version: "weighted-search-2",
  difficulties: {
    easy: {
      samples: 0,
      depth: 0,
      shortlist: 0,
    },
    normal: {
      samples: 6,
      depth: 4,
      shortlist: 4,
    },
    hard: {
      samples: 20,
      depth: 8,
      shortlist: 6,
    },
  },
  weights: {
    health: 18,
    hand: 3,
    equipment: 4,
    damage: 14,
    target: 6,
    tempo: 2,
    terminal: 1000,
    colour: 3,
    threat: 10,
    wild: 4,
    uno: 40,
    future: 0.6,
    hero: 1,
  },
};
export class Strategy {
  static readonly version: string = strategyConfig.version;
  readonly version: string = Strategy.version;
  budget(request: SearchRequest) {
    return strategyConfig.difficulties[request.difficulty];
  }
  candidates(request: SearchRequest): Candidate[] {
    return this.engine.candidates(request.observation, request.actor);
  }
  readonly engine = new GameEngine();
  decide(
    observation: GameState,
    actor: number,
    difficulty: Difficulty,
    seed: string,
    options?: Pick<SearchRequest, "search" | "tradeEnabled">,
  ): Decision {
    const request: SearchRequest = {
      ...options,
      observation,
      actor,
      difficulty,
      seed,
      audit: true,
    };
    const candidates = this.score(request, this.candidates(request));
    const roots = request.search
      ? request.search.map((plan) => ({ action: plan.action }))
      : this.roots(request, candidates);
    const samples = roots.map((candidate) => ({
      action: candidate.action,
      values: this.simulate(
        request,
        candidate.action,
        request.search?.find(
          (plan) =>
            JSON.stringify(plan.action) === JSON.stringify(candidate.action),
        )?.indexes ||
          Array.from(
            {
              length: this.budget(request).samples,
            },
            (_, i) => i,
          ),
      ),
    }));
    return this.complete(request, candidates, samples).audit!;
  }
  score(request: SearchRequest, moves: Candidate[]): DecisionCandidate[] {
    return moves.map((move) =>
      this.evaluate(
        request.observation,
        request.actor,
        move,
        `${request.seed}:evaluate`,
        request.audit,
      ),
    );
  }
  roots(
    request: SearchRequest,
    candidates: DecisionCandidate[],
  ): DecisionCandidate[] {
    return candidates.length < 2 ||
      candidates.some((candidate) => candidate.action.type === "sgs-hero")
      ? []
      : [...candidates]
          .sort((a, b) => b.score - a.score)
          .slice(0, this.budget(request).shortlist);
  }
  simulate(
    request: SearchRequest,
    action: Action,
    indexes: number[],
  ): SampleValue[] {
    const { observation, actor, seed, difficulty } = request;
    const budget = this.budget(request);
    return indexes.map((index) => {
      let sampled = this.sample(observation, actor, `${seed}:sample:${index}`);
      const before = this.position(sampled, actor);
      sampled = this.engine.apply(
        sampled,
        actor,
        action,
        `${seed}:root:${index}`,
      );
      const limit =
        observation.kind === "tq"
          ? Math.max(budget.depth, observation.view.playerPieces.length)
          : budget.depth;
      for (
        let depth = 0;
        depth < limit && !this.engine.finished(sampled);
        depth++
      ) {
        if (this.engine.needsResolution(sampled)) {
          sampled = this.engine.resolve(
            sampled,
            `${seed}:resolve:${index}:${depth}`,
          );
          if (this.engine.finished(sampled)) break;
        }
        const nextActor = this.engine.actors(sampled)[0];
        if (nextActor === undefined) break;
        const view = this.engine.project(sampled, nextActor),
          possible = this.engine.candidates(view, nextActor);
        if (!possible.length) throw new Error("模拟阶段缺少合法动作");
        let next: DecisionCandidate | undefined;
        for (const move of possible) {
          const evaluated = this.evaluate(
            view,
            nextActor,
            move,
            `${seed}:rollout:${index}:${depth}`,
            false,
          );
          if (!next || evaluated.score > next.score) next = evaluated;
        }
        sampled = this.engine.apply(
          sampled,
          nextActor,
          next!.action,
          `${seed}:move:${index}:${depth}`,
        );
      }
      return {
        index,
        value: this.position(sampled, actor) - before,
      };
    });
  }
  complete(
    request: SearchRequest,
    candidates: DecisionCandidate[],
    samples: RootSamples[],
  ): AiResult {
    if (!candidates.length) throw new Error("没有合法动作");
    let simulations = 0;
    for (const candidate of candidates) {
      const values = samples
        .filter(
          (sample) =>
            JSON.stringify(sample.action) === JSON.stringify(candidate.action),
        )
        .flatMap((sample) => sample.values)
        .sort((a, b) => a.index - b.index)
        .map((sample) => sample.value);
      simulations += values.length;
      if (!values.length) continue;
      const mean =
        values.reduce((sum, value) => sum + value, 0) / values.length;
      candidate.score += mean * strategyConfig.weights.future;
      if (request.audit) {
        const variance =
          values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
          Math.max(1, values.length - 1);
        candidate.simulation = {
          samples: values.length,
          mean,
          standardError: Math.sqrt(variance / values.length),
        };
        candidate.features.push({
          name: "模拟后的局面收益",
          value: mean,
          weight: strategyConfig.weights.future,
          contribution: mean * strategyConfig.weights.future,
        });
      }
    }
    candidates.sort(
      (a, b) =>
        b.score - a.score ||
        JSON.stringify(a.action).localeCompare(JSON.stringify(b.action)),
    );
    const result: AiResult = {
      actor: request.actor,
      chosen: candidates[0].action,
      difficulty: request.difficulty,
      simulations,
    };
    if (request.audit)
      result.audit = {
        version: this.version,
        actor: request.actor,
        difficulty: request.difficulty,
        seed: request.seed,
        observation: structuredClone(request.observation),
        candidates,
        chosen: result.chosen,
        assumptions:
          request.observation.kind === "dy"
            ? [
                "对手手牌仅从未见牌中按数量抽样，不读取真实手牌。",
                "计分、药锅容量与颜色多数沿用原规则；有限搜索不能保证最优。",
              ]
            : request.observation.kind === "tq"
              ? [
                  "棋盘信息完全公开；目标营地与合法路由沿用原规则。",
                  "以最优棋子目标分配的距离、入营及连续跳跃评分；有限搜索不能保证最优。",
                ]
              : request.observation.kind === "fxq"
                ? [
                    "棋盘信息公开，骰子由房间公平生成，不预测真实点数。",
                    "风险按对手下一次六种骰子结果及其最佳撞机机会估计；局面收益不是胜率。",
                  ]
                : request.observation.kind === "uno"
                  ? [
                      "对手手牌与牌堆从未见牌中按已知数量抽样；不读取真实牌序。",
                      "模拟收益是局面评分，不是获胜概率。",
                    ]
                  : [
                      "隐藏身份按尚未公开的身份构成抽样；对手手牌从未见牌中抽样。",
                      "对未知阵营使用身份先验与公开行动推断，判断可能错误。",
                      "模拟收益是局面评分，不是获胜概率。",
                    ],
        simulations,
        search: candidates
          .map((candidate) => ({
            action: candidate.action,
            indexes: samples
              .filter(
                (sample) =>
                  JSON.stringify(sample.action) ===
                  JSON.stringify(candidate.action),
              )
              .flatMap((sample) => sample.values.map((value) => value.index))
              .sort((a, b) => a - b),
          }))
          .filter((plan) => plan.indexes.length),
        tradeEnabled: request.tradeEnabled,
      };
    return result;
  }
  sample(observation: GameState, actor: number, seed: string): GameState {
    if (
      observation.kind === "ddz" ||
      observation.kind === "ktd" ||
      observation.kind === "ccbs"
    )
      throw new Error("该游戏 AI 尚未接入");
    const state = structuredClone(observation);
    if (state.kind === "fxq" || state.kind === "tq") return state;
    const random = this.engine.seed(seed);
    const shuffle = <T>(values: T[]): T[] => {
      const result = [...values];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };
    if (state.kind === "dy") {
      const known = new Set([
        ...state.view.players[actor],
        ...state.view.pots.flat(),
        ...state.view.eats.flat(),
      ]);
      const pool = shuffle(
        Array.from(
          {
            length: 50,
          },
          (_, card) => card,
        ).filter((card) => !known.has(card)),
      );
      state.view.players = state.view.players.map((cards, id) =>
        id === actor ? cards : pool.splice(0, cards.length),
      );
      return state;
    }
    if (state.kind === "uno") {
      const view = state.view;
      const known = new Set([...view.playerCards[actor], ...view.playedCards]);
      const pool = shuffle(
        Array.from(
          {
            length: 108,
          },
          (_, card) => card,
        ).filter((card) => !known.has(card)),
      );
      view.cardList = Array(108).fill(15);
      for (const card of view.playedCards) view.cardList[card] = 0;
      view.playerCards = view.playerCards.map((cards, id) =>
        id === actor ? cards : pool.splice(0, cards.length),
      );
      view.playerCards.forEach((cards, id) =>
        cards.forEach((card) => {
          view.cardList[card] = id + 1;
        }),
      );
      return {
        kind: "uno",
        view: this.engine.uno.my(this.engine.uno.qA(view)),
      };
    }
    const view = state.view;
    const known = new Set(
      view.cardPos
        .map((position, card) => (position >= 0 ? card : -1))
        .filter((card) => card >= 0),
    );
    for (const event of view.eventStack)
      for (const key of ["cardIds", "wuGuCardIds", "sourceCardIds"]) {
        if (Array.isArray(event[key]))
          for (const card of event[key] as number[])
            if (card >= 0) known.add(card);
      }
    const pool = shuffle(
      Array.from(
        {
          length: view.cardPos.length,
        },
        (_, card) => card,
      ).filter((card) => !known.has(card)),
    );
    view.cardPos = view.cardPos.map((position) =>
      position >= 0 ? position : 0,
    );
    view.playerHandCard = view.playerHandCard.map((cards, id) =>
      id === actor
        ? cards
        : cards.map((card) => (card >= 0 ? card : pool.shift()!)),
    );
    view.playerHandCard.forEach((cards) =>
      cards.forEach((card) => {
        view.cardPos[card] = 2;
      }),
    );
    view.drawCardPos = [];
    const unknownRoles = view.roles
      .map((role, id) => (role < 0 ? id : -1))
      .filter((id) => id >= 0);
    if (unknownRoles.length) {
      const rolesState = this.engine.create(
        "sgs",
        view.hero.length,
        `${seed}:roles`,
      );
      if (rolesState.kind !== "sgs") throw new Error("身份采样失败");
      const roles = [...rolesState.view.roles];
      for (const role of view.roles.filter((role) => role >= 0))
        roles.splice(roles.indexOf(role), 1);
      unknownRoles.forEach((id, index) => {
        view.roles[id] = roles[index];
      });
    }
    return {
      kind: "sgs",
      view: this.engine.sgs.my(this.engine.sgs.qA(view), view.hero.length),
    };
  }
  hostility(observation: GameState, actor: number, target: number): number {
    if (
      observation.kind === "ddz" ||
      observation.kind === "ktd" ||
      observation.kind === "ccbs"
    )
      throw new Error("该游戏 AI 尚未接入");
    if (actor === target) return -1;
    if (observation.kind !== "sgs") return 1;
    const view = observation.view;
    const role = view.roles[actor];
    const other = view.roles[target];
    const team = this.engine.sgs.bg(view.rule, view.hero.length)[1] === 1;
    if (team) return (role === 1) === (other === 1) ? -1 : 1;
    if (other >= 0) {
      if (role === 1) return other === 1 ? -1 : 1;
      if (role === 0 || role === 2) return other === 0 || other === 2 ? -1 : 1;
      return view.alivePlayerIds.length === 2 ? 1 : other === 2 ? -0.3 : 0.6;
    }
    const lord = view.roles.indexOf(2);
    const event = view.eventStack.at(-1);
    if (event?.playerPos === target + 1 && event.targetPlayerPos === lord + 1)
      return role === 1 ? -0.7 : 0.9;
    return role === 1 ? 0.15 : role === 3 ? 0.3 : 0.4;
  }
  protected evaluate(
    observation: GameState,
    actor: number,
    candidate: Candidate,
    seed: string,
    audit = true,
  ): DecisionCandidate {
    if (
      observation.kind === "ddz" ||
      observation.kind === "ktd" ||
      observation.kind === "ccbs"
    )
      throw new Error("该游戏 AI 尚未接入");
    const features: Feature[] = [];
    let score = 0;
    const add = (name: string, value: number, weight: number) => {
      score += value * weight;
      if (audit)
        features.push({
          name,
          value,
          weight,
          contribution: value * weight,
        });
    };
    const weights = strategyConfig.weights;
    const action = candidate.action;
    if (action.type === "sgs-hero") {
      const heroes = this.engine.runtime.load(8467).V6;
      const hero = heroes[action.hero];
      const skills: number[] = hero[4];
      const value =
        hero[3] * 3 +
        skills.reduce(
          (sum, skill) =>
            sum +
            ([31, 33, 38, 50, 18, 19, 21, 45].includes(skill)
              ? 6
              : [24, 25, 28, 46, 47, 48].includes(skill)
                ? 4
                : 2),
          0,
        );
      add("体力与武将技能的先验价值", value, weights.hero);
    } else if (observation.kind === "dy") {
      const sampled = this.sample(observation, actor, `${seed}:heuristic`);
      const after = this.engine.apply(sampled, actor, action, seed);
      if (sampled.kind !== "dy" || after.kind !== "dy")
        throw new Error("游戏类型不匹配");
      add(
        "收牌后计分负担",
        sampled.view.scores[actor] - after.view.scores[actor],
        6,
      );
      add(
        "药锅剩余容量",
        after.view.potValues.reduce((sum, value) => sum + 13 - value, 0) -
          sampled.view.potValues.reduce((sum, value) => sum + 13 - value, 0),
        0.15,
      );
      add(
        "颜色多数与终局分数",
        this.position(after, actor) - this.position(sampled, actor),
        1,
      );
    } else if (observation.kind === "tq") {
      const after = this.engine.apply(observation, actor, action, seed);
      if (after.kind !== "tq") throw new Error("游戏类型不匹配");
      add(
        "棋子与目标位置最优匹配的距离收益",
        this.engine.checkers.cost(observation.view, actor) -
          this.engine.checkers.cost(after.view, actor),
        1,
      );
      add(
        "目标营地棋子",
        this.engine.checkers.settled(after.view, actor) -
          this.engine.checkers.settled(observation.view, actor),
        6,
      );
      add(
        "疏通目标营地中异色棋子的离营路线",
        this.engine.checkers.escape(after.view, actor) -
          this.engine.checkers.escape(observation.view, actor),
        8,
      );
      add(
        "完成目标营地",
        after.view.winnerId.includes(actor) ? 1 : 0,
        weights.terminal,
      );
      if (action.type === "tq-move") {
        const recent = observation.view.recordList
          .filter((move) => move.playerId === actor)
          .slice(-12);
        const repeated = recent.filter(
          (move) =>
            move.route[0] === action.route[0] &&
            move.route.at(-1) === action.route.at(-1),
        ).length;
        const last = recent.at(-1)?.route;
        const reversed =
          last &&
          last[0] === action.route.at(-1) &&
          last.at(-1) === action.route[0]
            ? 1
            : 0;
        add("最近十二步重复同一路径", -repeated, 8);
        add("立即撤回上一步", -reversed, 12);
      }
    } else if (observation.kind === "fxq") {
      if (action.type === "fxq-roll") add("公平掷骰，点数由房间产生", 0, 1);
      else {
        const after = this.engine.apply(observation, actor, action, seed);
        if (after.kind !== "fxq") throw new Error("游戏类型不匹配");
        const before = observation.view;
        const next = after.view;
        add(
          "飞机前进与跳跃收益",
          this.engine.flight.progress(next, actor) -
            this.engine.flight.progress(before, actor),
          1,
        );
        add(
          "终点飞机",
          next.planePositionList
            .slice(actor * 4, actor * 4 + 4)
            .filter((position) => position >= 57).length -
            before.planePositionList
              .slice(actor * 4, actor * 4 + 4)
              .filter((position) => position >= 57).length,
          30,
        );
        add(
          "撞回对手的路程",
          before.planePositionList.reduce(
            (sum, position, index) =>
              sum +
              (Math.floor(index / 4) !== actor &&
              position > 0 &&
              next.planePositionList[index] === 0
                ? position
                : 0),
            0,
          ),
          0.8,
        );
        add(
          "下一轮被撞返航的预期损失",
          -this.engine.flight.risk(next, actor),
          0.7,
        );
        add(
          "赢得飞行棋",
          next.winners.includes(actor) ? 1 : 0,
          weights.terminal,
        );
      }
    } else if (observation.kind === "uno") {
      const view = observation.view;
      if (action.type === "uno-play") {
        const remaining = view.playerCards[actor].filter(
          (card) => card !== action.card,
        );
        const type = this.engine.uno.Vz(action.card);
        const color = type > 13 ? action.color : Math.floor(action.card / 25);
        add("减少手牌", 1, weights.hand);
        add("出完全部手牌", remaining.length === 0 ? 1 : 0, weights.terminal);
        add(
          "剩余同色牌的连贯性",
          remaining.filter((card) => Math.floor(card / 25) === color).length,
          weights.colour,
        );
        const next =
          (actor + (view.currentD ? 1 : view.playerCards.length - 1)) %
          view.playerCards.length;
        add(
          "压制即将获胜的对手",
          [11, 12, 13, 15].includes(type)
            ? 1 / Math.max(1, view.playerCards[next].length)
            : 0,
          weights.threat,
        );
        add(
          "保留万能牌",
          type > 13 && remaining.length > 2 ? -1 : 0,
          weights.wild,
        );
        add(
          "最后两张牌喊 UNO",
          view.playerCards[actor].length === 2 && !action.saidUno ? -1 : 0,
          weights.uno,
        );
      } else if (action.type === "uno-draw")
        add(
          "摸牌代价",
          view.isDrawThink ? 0 : -(view.currentPlus || 1),
          weights.hand,
        );
      else if (action.type === "uno-report")
        add("阻止漏喊 UNO 的对手", 2, weights.threat);
      else add("开局", 1, weights.tempo);
    } else {
      const sampled = this.sample(observation, actor, `${seed}:heuristic`);
      const after = this.engine.apply(sampled, actor, action, `${seed}:apply`);
      if (sampled.kind !== "sgs" || after.kind !== "sgs")
        throw new Error("策略游戏类型不匹配");
      const before = sampled.view;
      const next = after.view;
      add(
        "自身体力变化",
        next.playerBlood[actor] - before.playerBlood[actor],
        weights.health,
      );
      add(
        "自身手牌资源变化",
        next.playerHandCard[actor].length - before.playerHandCard[actor].length,
        weights.hand,
      );
      add(
        "装备变化",
        Object.keys(next.playerEquip[actor]).length -
          Object.keys(before.playerEquip[actor]).length,
        weights.equipment,
      );
      const damage = before.playerBlood.reduce(
        (sum, blood, id) =>
          id === actor
            ? sum
            : sum +
              (blood - next.playerBlood[id]) *
                this.hostility(observation, actor, id),
        0,
      );
      add("阵营体力收益", damage, weights.damage);
      if (action.type === "sgs-choice") {
        const type =
          action.cards[0] >= 0 ? this.engine.cards.e3(action.cards[0]) : -1;
        const healing =
          [4, 16].includes(type) || [22, 44, 47].includes(action.skill);
        const offensive =
          [0, 1, 2, 8, 9, 10, 11, 12, 19, 20].includes(type) ||
          [25, 28, 35, 39, 40, 49].includes(action.skill);
        const targetValue = action.targets.reduce(
          (sum, target) =>
            sum +
            this.hostility(observation, actor, target) *
              (healing ? -1 : offensive ? 1 : 0),
          0,
        );
        add(
          "行动目标的阵营价值",
          action.button === 0 ? targetValue : 0,
          weights.target,
        );
        const spent = action.cards
          .filter((card) => card >= 0)
          .reduce((sum, card) => sum + this.engine.keepValue(card), 0);
        add("使用或弃置手牌的保留价值", -spent * 0.1, 1);
        add(
          "推进有效行动",
          action.button === 0 && before.dcdType === 1 ? 1 : 0,
          weights.tempo,
        );
        if (before.dcdType === 1 && action.button === 1)
          add("结束出牌保留资源", 1, 0.3);
      }
      add(
        "终局阵营结果",
        this.engine.finished(after)
          ? next.winners.includes(actor)
            ? 1
            : -1
          : 0,
        weights.terminal,
      );
    }
    return {
      ...candidate,
      features,
      score,
    };
  }
  protected position(state: GameState, actor: number): number {
    if (state.kind === "ddz" || state.kind === "ktd" || state.kind === "ccbs")
      throw new Error("该游戏 AI 尚未接入");
    if (state.kind === "dy") {
      const own = state.view.scores[actor];
      const rivals = state.view.scores.filter((_, id) => id !== actor);
      return (
        -own * 4 +
        Math.min(...rivals) * 2 +
        (state.view.finish ? (own <= Math.min(...rivals) ? 100 : -100) : 0)
      );
    }
    if (state.kind === "uno") {
      if (state.view.playerFinish[actor]) return 100;
      if (this.engine.finished(state)) return -100;
      return (
        -state.view.playerCards[actor].length * 3 +
        state.view.playerCards.reduce(
          (sum, cards, id) => sum + (id === actor ? 0 : cards.length),
          0,
        )
      );
    }
    if (state.kind === "tq")
      return state.view.winnerId.includes(actor)
        ? 1000
        : -this.engine.checkers.cost(state.view, actor) +
            this.engine.checkers.settled(state.view, actor) * 6;
    if (state.kind === "fxq")
      return state.view.winners.includes(actor)
        ? 100
        : this.engine.flight.progress(state.view, actor) -
            this.engine.flight.risk(state.view, actor);
    const view = state.view;
    if (this.engine.finished(state))
      return view.winners.includes(actor) ? 100 : -100;
    return (
      view.playerBlood[actor] * 5 +
      view.playerHandCard[actor].length +
      view.playerBlood.reduce(
        (sum, blood, id) =>
          id === actor
            ? sum
            : sum - blood * this.hostility(state, actor, id) * 2,
        0,
      )
    );
  }
}
export interface SearchRequest {
  observation: GameState;
  actor: number;
  difficulty: Difficulty;
  seed: string;
  audit: boolean;
  tradeEnabled?: boolean;
  search?: { action: Action; indexes: number[] }[];
}
export interface SampleValue {
  index: number;
  value: number;
}
export interface RootSamples {
  action: Action;
  values: SampleValue[];
}
export type SearchTask =
  | {
      type: "score";
      request: SearchRequest;
      moves: Candidate[];
    }
  | {
      type: "simulate";
      request: SearchRequest;
      action: Action;
      indexes: number[];
    };
export type SearchOutput =
  | {
      type: "score";
      candidates: DecisionCandidate[];
    }
  | {
      type: "simulate";
      action: Action;
      values: SampleValue[];
    };
export function executeSearchTask(
  strategy: Strategy,
  task: SearchTask,
): SearchOutput {
  return task.type === "score"
    ? {
        type: "score",
        candidates: strategy.score(task.request, task.moves),
      }
    : {
        type: "simulate",
        action: task.action,
        values: strategy.simulate(task.request, task.action, task.indexes),
      };
}
