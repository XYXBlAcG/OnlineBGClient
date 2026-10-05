import { EconomicStrategy } from "./economic-strategy";
import { CatanRules } from "./catan";
import type { CatanView } from "./catan-actions";
import type { SearchRequest } from "./strategy";
import type { Candidate, DecisionCandidate, GameState } from "./types";
export class CatanStrategy extends EconomicStrategy {
  static readonly version = "catan-information-search-1";
  readonly version = CatanStrategy.version;
  readonly rules = new CatanRules(this.engine.runtime);
  production(view: CatanView, house: number): number[] {
    const map = this.rules.maps.ZP[view.mapId],
      layout = this.rules.maps.sI(view.mapId, view.mapProp),
      resources = [0, 0, 0, 0, 0];
    for (const xy of this.rules.geometry.Qp(
      map.tiles[house >> 2],
      (house >> 1) & 1,
      map,
    ) as number[][]) {
      const tile = map.xyToId.get(`${xy[0]},${xy[1]}`),
        resource = layout.tileTypes[tile],
        number = layout.tileNums[tile];
      if (resource < 5)
        resources[resource] +=
          (6 - Math.abs(7 - number)) *
          (tile === view.robber ? 0.3 : 1) *
          (house & 1 ? 2 : 1);
    }
    return resources;
  }
  values(state: GameState, actor: number): [string, number, number][] {
    if (state.kind !== "ktd") throw new Error("策略游戏不匹配");
    const view = state.view,
      player = view.playerData[actor],
      map = this.rules.maps.ZP[view.mapId];
    const production = [0, 0, 0, 0, 0];
    for (const house of player.houses)
      this.production(view, house).forEach((n, i) => (production[i] += n));
    const ports = this.rules.original.tY(
      view,
      this.rules.maps.sI(view.mapId, view.mapProp),
      actor,
    ) as boolean[];
    const vp =
      player.houses.length +
      player.houses.filter((id) => id & 1).length +
      player.cards[4] +
      (view.bankData.longestRoadPos === actor + 1 ? 2 : 0) +
      (view.bankData.maxRobberCountPos === actor + 1 ? 2 : 0);
    const goalCosts =
      player.houses.length >= 5
        ? [
            [0, 0, 0, 2, 3],
            [0, 0, 1, 1, 1],
          ]
        : [
            [1, 1, 1, 1, 0],
            [0, 0, 0, 2, 3],
            [0, 0, 1, 1, 1],
          ];
    const progress = Math.max(
      ...goalCosts.map((cost) =>
        cost.reduce(
          (sum, n, i) =>
            sum + Math.min(n, player.resources[i]) * (n > 0 ? 1 / n : 0),
          0,
        ),
      ),
    );
    const hand = player.resources.reduce(
      (sum, count, i) =>
        sum + (Math.min(count, 4) * 2) / (1 + production[i] / 8),
      0,
    );
    const free = this.rules.positions(view, actor, "house", true);
    let expansion = 0;
    for (const id of free) {
      const xy = this.rules.geometry.sw(id, map.tiles) as number[];
      const endpoints = [
        ...player.houses.map((h) => this.rules.geometry.sw(h, map.tiles)),
        ...player.roads.map((r) => this.rules.geometry.cu(r, map.tiles)),
      ] as number[][];
      const distance = endpoints.length
        ? Math.min(
            ...endpoints.map((p) => Math.hypot(p[0] - xy[0], p[1] - xy[1])),
          ) / 200
        : 10;
      const quality = this.production(view, id).reduce((a, b) => a + b, 0);
      expansion = Math.max(expansion, quality / (1 + distance));
    }
    const opponents = view.playerData.map((p, id) =>
      id === actor
        ? 0
        : p.houses.length +
          p.houses.filter((h) => h & 1).length +
          (view.bankData.longestRoadPos === id + 1 ? 2 : 0) +
          (view.bankData.maxRobberCountPos === id + 1 ? 2 : 0),
    );
    let blocked = 0;
    view.playerData.forEach((p, id) => {
      if (id !== actor)
        for (const house of p.houses) {
          const unblocked = { ...view, robber: -1 };
          blocked +=
            this.production(unblocked, house).reduce((a, b) => a + b, 0) -
            this.production(view, house).reduce((a, b) => a + b, 0);
        }
    });
    return [
      ["胜利分", vp, 90],
      ["资源产量", production.reduce((a, b) => a + b, 0), 4],
      ["资源多样性", production.filter((n) => n > 0).length, 6],
      ["港口", ports.filter(Boolean).length, 3],
      ["建设资源", progress, 3],
      ["手牌资源价值", hand, 1],
      ["扩张空间", expansion, 4],
      ["最长道路进度", Math.min(player.longestRoad, 5), 1.5],
      ["发展卡", player.cards.slice(0, 4).reduce((a, b) => a + b), 5],
      ["骑士进度", Math.min(player.robberCount, 3), 5],
      ["压制对手产量", blocked, 0.3],
      ["领先对手", vp - Math.max(...opponents), 8],
      [
        "终局",
        this.engine.finished(state) && view.state === actor ? 1 : 0,
        1000,
      ],
    ];
  }
  candidates(request: SearchRequest): Candidate[] {
    if (request.observation.kind !== "ktd") throw new Error("策略游戏不匹配");
    const view = request.observation.view,
      actor = request.actor,
      moves = super.candidates(request),
      resources = view.playerData[actor].resources;
    const discard = moves.find(
      (c) => c.action.type === "ktd-action" && c.action.move.kind === "discard",
    );
    if (discard) {
      const total = resources.reduce((a, b) => a + b),
        cost = [1, 1, 1, 2, 3],
        keep = resources.map((n) => n),
        discarded = [0, 0, 0, 0, 0];
      for (let i = 0; i < total >> 1; i++) {
        let selected = -1,
          value = Infinity;
        for (let r = 0; r < 5; r++)
          if (keep[r] > 0) {
            const utility = cost[r] / keep[r];
            if (utility < value) {
              selected = r;
              value = utility;
            }
          }
        discarded[selected]++;
        keep[selected]--;
      }
      discard.action = {
        type: "ktd-action",
        move: { kind: "discard", resources: discarded },
      };
      discard.label = "按建设目标保留资源后弃牌";
    }
    if (
      request.tradeEnabled !== false &&
      !view.exchangeData &&
      (view.tradeCount || 0) < 2 &&
      this.rules
        .phase(view, actor)
        .allowOps.includes(this.rules.ops.ExchangeWithPlayer)
    ) {
      for (let give = 0; give < 5; give++)
        for (let take = 0; take < 5; take++)
          if (give !== take && resources[give] >= 3 && resources[take] === 0) {
            const targets = view.playerData.flatMap((p, id) =>
              id !== actor && p.resources.reduce((a, b) => a + b) > 0
                ? [id]
                : [],
            );
            if (targets.length) {
              const costs = [0, 0, 0, 0, 0],
                needs = [0, 0, 0, 0, 0];
              costs[give] = 1;
              needs[take] = 1;
              moves.push({
                action: {
                  type: "ktd-action",
                  move: { kind: "trade", give: costs, take: needs, targets },
                },
                label: `以富余资源 ${give + 1} 换取资源 ${take + 1}`,
              });
            }
          }
    }
    return moves;
  }
  protected evaluate(
    observation: GameState,
    actor: number,
    candidate: Candidate,
    seed: string,
    audit = true,
  ): DecisionCandidate {
    const evaluated = super.evaluate(
      observation,
      actor,
      candidate,
      seed,
      audit,
    );
    const action = candidate.action;
    if (action.type === "ktd-action" && action.move.kind === "trade") {
      const state = this.sample(observation, actor, `${seed}:belief`);
      if (state.kind !== "ktd") throw new Error("策略游戏不匹配");
      const move = action.move;
      const targets = move.targets.filter((id) =>
        move.take.every((n, r) => state.view.playerData[id].resources[r] >= n),
      );
      let gain = 0;
      for (const target of targets) {
        const offered = this.engine.apply(state, actor, action, seed);
        const accepted = this.engine.apply(
          offered,
          target,
          { type: "ktd-action", move: { kind: "respond", accept: true } },
          seed,
        );
        gain = Math.max(
          gain,
          this.position(accepted, actor) - this.position(state, actor),
        );
      }
      const contribution = gain * 0.65;
      evaluated.score += contribution;
      if (audit)
        evaluated.features.push({
          name: "交易获接受后的预期收益",
          value: gain,
          weight: 0.65,
          contribution,
        });
    }
    if (
      action.type === "ktd-action" &&
      action.move.kind === "respond" &&
      action.move.accept
    ) {
      const state = this.sample(observation, actor, `${seed}:belief`);
      if (state.kind !== "ktd") throw new Error("策略游戏不匹配");
      const accepted = this.engine.apply(state, actor, action, seed),
        owner = state.view.state;
      const danger = this.engine
        .candidates(accepted, owner)
        .some(
          (candidate) =>
            candidate.action.type === "ktd-action" &&
            ["build", "buy-dev"].includes(candidate.action.move.kind) &&
            this.engine.finished(
              this.engine.apply(
                accepted,
                owner,
                candidate.action,
                `${seed}:threat`,
              ),
            ),
        );
      if (danger) {
        evaluated.score -= 150;
        if (audit)
          evaluated.features.push({
            name: "资助对手立即获胜的风险",
            value: 1,
            weight: -150,
            contribution: -150,
          });
      }
    }
    return evaluated;
  }
  sample(observation: GameState, actor: number, seed: string): GameState {
    if (observation.kind !== "ktd") throw new Error("策略游戏不匹配");
    const state = structuredClone(observation),
      view = state.view,
      map = this.rules.maps.ZP[view.mapId],
      random = this.engine.seed(seed);
    const counts = view.playerData.map((p) =>
      p.resources.reduce((a, b) => a + b),
    );
    const pool: number[] = [];
    for (let r = 0; r < 5; r++)
      for (
        let n = 0;
        n <
        map.resCount -
          view.bankData.resources[r] -
          view.playerData[actor].resources[r];
        n++
      )
        pool.push(r);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const lower = view.playerData.map((_, id) =>
      id !== actor && id === view.state && view.exchangeData
        ? [...view.exchangeData.costs]
        : [0, 0, 0, 0, 0],
    );
    for (const resourceCounts of lower)
      for (let r = 0; r < 5; r++)
        for (let n = 0; n < resourceCounts[r]; n++) {
          const index = pool.indexOf(r);
          if (index < 0) throw new Error("公开交易与资源库存不一致");
          pool.splice(index, 1);
        }
    let offset = 0;
    view.playerData.forEach((p, id) => {
      if (id !== actor) {
        p.resources = lower[id];
        for (let n = lower[id].reduce((a, b) => a + b); n < counts[id]; n++)
          p.resources[pool[offset++]]++;
      }
    });
    const cards: number[] = [];
    for (let c = 0; c < 5; c++)
      for (
        let n = 0;
        n <
        map.devCount[c] -
          view.playerData[actor].cards[c] -
          (c === 0
            ? view.playerData.reduce((sum, p) => sum + p.robberCount, 0)
            : 0);
        n++
      )
        cards.push(c);
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    offset = 0;
    view.playerData.forEach((p, id) => {
      if (id !== actor) {
        const count = p.cards.reduce((a, b) => a + b);
        p.cards = [0, 0, 0, 0, 0];
        for (let n = 0; n < count; n++) p.cards[cards[offset++]]++;
      }
    });
    const count = view.bankData.cards.reduce((a, b) => a + b);
    view.bankData.cards = [0, 0, 0, 0, 0];
    for (let n = 0; n < count; n++) view.bankData.cards[cards[offset++]]++;
    if (actor !== view.state && !(view.devCard & 16)) {
      const owner = view.playerData[view.state],
        publicScore =
          owner.houses.length +
          owner.houses.filter((id) => id & 1).length +
          (view.bankData.longestRoadPos === view.state + 1 ? 2 : 0) +
          (view.bankData.maxRobberCountPos === view.state + 1 ? 2 : 0);
      const maxVP = map.settings[view.playerData.length][0] - publicScore - 1;
      for (const target of [
        view.bankData,
        ...view.playerData.filter((_, id) => id !== actor && id !== view.state),
      ]) {
        for (let c = 0; c < 4 && owner.cards[4] > maxVP; c++)
          while (target.cards[c] > 0 && owner.cards[4] > maxVP) {
            owner.cards[4]--;
            owner.cards[c]++;
            target.cards[c]--;
            target.cards[4]++;
          }
      }
      while (owner.cards[4] > maxVP) {
        const unused = cards.findIndex((c, i) => i >= offset && c < 4);
        if (unused < 0) throw new Error("公开终局与发展卡数量不一致");
        owner.cards[4]--;
        owner.cards[cards[unused]]++;
        cards[unused] = 4;
      }
    }
    if (actor !== view.state) {
      const newly = view.newCards.reduce((a, b) => a + b);
      view.newCards = [0, 0, 0, 0, 0];
      let left = newly;
      view.playerData[view.state].cards.forEach((n, i) => {
        view.newCards[i] = Math.min(n, left);
        left -= view.newCards[i];
      });
    }
    return state;
  }
  complete(...args: Parameters<EconomicStrategy["complete"]>) {
    const result = super.complete(...args);
    if (result.audit)
      result.audit.assumptions = [
        "仅使用自己的手牌与公开地图、总量、银行库存；隐藏资源按库存约束抽样，发展卡为公开组成的近似先验。",
        "信息集树搜索与有限候选剪枝，局面收益不是胜率；报价每回合最多两次。",
      ];
    return result;
  }
}
