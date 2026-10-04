import { GameEngine } from "./engine";
import type {
  Action,
  Candidate,
  Decision,
  DecisionCandidate,
  Difficulty,
  Feature,
  GameState,
} from "./types";

export const strategyConfig = {
  version: "weighted-search-1",
  difficulties: {
    easy: { samples: 0, depth: 0, shortlist: 0 },
    normal: { samples: 6, depth: 4, shortlist: 4 },
    hard: { samples: 20, depth: 8, shortlist: 6 },
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
  readonly engine = new GameEngine();

  decide(
    observation: GameState,
    actor: number,
    difficulty: Difficulty,
    seed: string,
  ): Decision {
    if (observation.kind === "ddz") throw new Error("斗地主 AI 尚未接入");
    const actions = this.engine.candidates(observation, actor);
    if (!actions.length) throw new Error(`玩家 ${actor + 1} 没有合法动作`);
    const candidates = actions.map((candidate) =>
      this.evaluate(observation, actor, candidate, `${seed}:evaluate`),
    );
    const budget = strategyConfig.difficulties[difficulty];
    const shortlist = [...candidates]
      .sort((a, b) => b.score - a.score)
      .slice(0, budget.shortlist);
    let simulations = 0;
    if (!actions.some((candidate) => candidate.action.type === "sgs-hero")) {
      for (const candidate of shortlist) {
        const results: number[] = [];
        for (let index = 0; index < budget.samples; index++) {
          let sampled = this.sample(
            observation,
            actor,
            `${seed}:sample:${index}`,
          );
          const before = this.position(sampled, actor);
          sampled = this.engine.apply(
            sampled,
            actor,
            candidate.action,
            `${seed}:root:${index}`,
          );
          for (
            let depth = 0,
              limit =
                observation.kind === "tq"
                  ? Math.max(budget.depth, observation.view.playerPieces.length)
                  : budget.depth;
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
            const view = this.engine.project(sampled, nextActor);
            const possible = this.engine.candidates(view, nextActor);
            if (!possible.length) throw new Error("模拟阶段缺少合法动作");
            const next = possible
              .map((move) =>
                this.evaluate(
                  view,
                  nextActor,
                  move,
                  `${seed}:rollout:${index}:${depth}`,
                ),
              )
              .sort((a, b) => b.score - a.score)[0];
            sampled = this.engine.apply(
              sampled,
              nextActor,
              next.action,
              `${seed}:move:${index}:${depth}`,
            );
          }
          results.push(this.position(sampled, actor) - before);
          simulations++;
        }
        if (results.length) {
          const mean =
            results.reduce((sum, result) => sum + result, 0) / results.length;
          const variance =
            results.reduce((sum, result) => sum + (result - mean) ** 2, 0) /
            Math.max(1, results.length - 1);
          candidate.simulation = {
            samples: results.length,
            mean,
            standardError: Math.sqrt(variance / results.length),
          };
          candidate.features.push(
            this.feature(
              "模拟后的局面收益",
              mean,
              strategyConfig.weights.future,
            ),
          );
          candidate.score = candidate.features.reduce(
            (sum, feature) => sum + feature.contribution,
            0,
          );
        }
      }
    }
    candidates.sort(
      (a, b) =>
        b.score - a.score ||
        JSON.stringify(a.action).localeCompare(JSON.stringify(b.action)),
    );
    return {
      version: strategyConfig.version,
      actor,
      difficulty,
      seed,
      observation: structuredClone(observation),
      candidates,
      chosen: candidates[0].action,
      assumptions:
        observation.kind === "tq"
          ? [
              "棋盘信息完全公开；目标营地与合法路由沿用原规则。",
              "以最优棋子目标分配的距离、入营及连续跳跃评分；有限搜索不能保证最优。",
            ]
          : observation.kind === "fxq"
            ? [
                "棋盘信息公开，骰子由房间公平生成，不预测真实点数。",
                "风险按对手下一次六种骰子结果及其最佳撞机机会估计；局面收益不是胜率。",
              ]
            : observation.kind === "uno"
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
    };
  }

  sample(observation: GameState, actor: number, seed: string): GameState {
    if (observation.kind === "ddz") throw new Error("斗地主 AI 尚未接入");
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
    if (state.kind === "uno") {
      const view = state.view;
      const known = new Set([...view.playerCards[actor], ...view.playedCards]);
      const pool = shuffle(
        Array.from({ length: 108 }, (_, card) => card).filter(
          (card) => !known.has(card),
        ),
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
      Array.from({ length: view.cardPos.length }, (_, card) => card).filter(
        (card) => !known.has(card),
      ),
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
    if (observation.kind === "ddz") throw new Error("斗地主 AI 尚未接入");
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

  private evaluate(
    observation: GameState,
    actor: number,
    candidate: Candidate,
    seed: string,
  ): DecisionCandidate {
    if (observation.kind === "ddz") throw new Error("斗地主 AI 尚未接入");
    const features: Feature[] = [];
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
      features.push(
        this.feature("体力与武将技能的先验价值", value, weights.hero),
      );
    } else if (observation.kind === "tq") {
      const after = this.engine.apply(observation, actor, action, seed);
      if (after.kind !== "tq") throw new Error("游戏类型不匹配");
      features.push(
        this.feature(
          "棋子与目标位置最优匹配的距离收益",
          this.engine.checkers.cost(observation.view, actor) -
            this.engine.checkers.cost(after.view, actor),
          1,
        ),
      );
      features.push(
        this.feature(
          "目标营地棋子",
          this.engine.checkers.settled(after.view, actor) -
            this.engine.checkers.settled(observation.view, actor),
          6,
        ),
      );
      features.push(
        this.feature(
          "疏通目标营地中异色棋子的离营路线",
          this.engine.checkers.escape(after.view, actor) -
            this.engine.checkers.escape(observation.view, actor),
          8,
        ),
      );
      features.push(
        this.feature(
          "完成目标营地",
          after.view.winnerId.includes(actor) ? 1 : 0,
          weights.terminal,
        ),
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
        features.push(this.feature("最近十二步重复同一路径", -repeated, 8));
        features.push(this.feature("立即撤回上一步", -reversed, 12));
      }
    } else if (observation.kind === "fxq") {
      if (action.type === "fxq-roll")
        features.push(this.feature("公平掷骰，点数由房间产生", 0, 1));
      else {
        const after = this.engine.apply(observation, actor, action, seed);
        if (after.kind !== "fxq") throw new Error("游戏类型不匹配");
        const before = observation.view;
        const next = after.view;
        features.push(
          this.feature(
            "飞机前进与跳跃收益",
            this.engine.flight.progress(next, actor) -
              this.engine.flight.progress(before, actor),
            1,
          ),
        );
        features.push(
          this.feature(
            "终点飞机",
            next.planePositionList
              .slice(actor * 4, actor * 4 + 4)
              .filter((position) => position >= 57).length -
              before.planePositionList
                .slice(actor * 4, actor * 4 + 4)
                .filter((position) => position >= 57).length,
            30,
          ),
        );
        features.push(
          this.feature(
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
          ),
        );
        features.push(
          this.feature(
            "下一轮被撞返航的预期损失",
            -this.engine.flight.risk(next, actor),
            0.7,
          ),
        );
        features.push(
          this.feature(
            "赢得飞行棋",
            next.winners.includes(actor) ? 1 : 0,
            weights.terminal,
          ),
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
        features.push(this.feature("减少手牌", 1, weights.hand));
        features.push(
          this.feature(
            "出完全部手牌",
            remaining.length === 0 ? 1 : 0,
            weights.terminal,
          ),
        );
        features.push(
          this.feature(
            "剩余同色牌的连贯性",
            remaining.filter((card) => Math.floor(card / 25) === color).length,
            weights.colour,
          ),
        );
        const next =
          (actor + (view.currentD ? 1 : view.playerCards.length - 1)) %
          view.playerCards.length;
        features.push(
          this.feature(
            "压制即将获胜的对手",
            [11, 12, 13, 15].includes(type)
              ? 1 / Math.max(1, view.playerCards[next].length)
              : 0,
            weights.threat,
          ),
        );
        features.push(
          this.feature(
            "保留万能牌",
            type > 13 && remaining.length > 2 ? -1 : 0,
            weights.wild,
          ),
        );
        features.push(
          this.feature(
            "最后两张牌喊 UNO",
            view.playerCards[actor].length === 2 && !action.saidUno ? -1 : 0,
            weights.uno,
          ),
        );
      } else if (action.type === "uno-draw")
        features.push(
          this.feature(
            "摸牌代价",
            view.isDrawThink ? 0 : -(view.currentPlus || 1),
            weights.hand,
          ),
        );
      else if (action.type === "uno-report")
        features.push(this.feature("阻止漏喊 UNO 的对手", 2, weights.threat));
      else features.push(this.feature("开局", 1, weights.tempo));
    } else {
      const sampled = this.sample(observation, actor, `${seed}:heuristic`);
      const after = this.engine.apply(sampled, actor, action, `${seed}:apply`);
      if (sampled.kind !== "sgs" || after.kind !== "sgs")
        throw new Error("策略游戏类型不匹配");
      const before = sampled.view;
      const next = after.view;
      features.push(
        this.feature(
          "自身体力变化",
          next.playerBlood[actor] - before.playerBlood[actor],
          weights.health,
        ),
      );
      features.push(
        this.feature(
          "自身手牌资源变化",
          next.playerHandCard[actor].length -
            before.playerHandCard[actor].length,
          weights.hand,
        ),
      );
      features.push(
        this.feature(
          "装备变化",
          Object.keys(next.playerEquip[actor]).length -
            Object.keys(before.playerEquip[actor]).length,
          weights.equipment,
        ),
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
      features.push(this.feature("阵营体力收益", damage, weights.damage));
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
        features.push(
          this.feature(
            "行动目标的阵营价值",
            action.button === 0 ? targetValue : 0,
            weights.target,
          ),
        );
        const spent = action.cards
          .filter((card) => card >= 0)
          .reduce((sum, card) => sum + this.engine.keepValue(card), 0);
        features.push(
          this.feature("使用或弃置手牌的保留价值", -spent * 0.1, 1),
        );
        features.push(
          this.feature(
            "推进有效行动",
            action.button === 0 && before.dcdType === 1 ? 1 : 0,
            weights.tempo,
          ),
        );
        if (before.dcdType === 1 && action.button === 1)
          features.push(this.feature("结束出牌保留资源", 1, 0.3));
      }
      features.push(
        this.feature(
          "终局阵营结果",
          this.engine.finished(after)
            ? next.winners.includes(actor)
              ? 1
              : -1
            : 0,
          weights.terminal,
        ),
      );
    }
    return {
      ...candidate,
      features,
      score: features.reduce((sum, feature) => sum + feature.contribution, 0),
    };
  }

  private position(state: GameState, actor: number): number {
    if (state.kind === "ddz") throw new Error("斗地主 AI 尚未接入");
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

  private feature(name: string, value: number, weight: number): Feature {
    return { name, value, weight, contribution: value * weight };
  }
}
