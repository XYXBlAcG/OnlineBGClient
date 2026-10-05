import type { UpstreamRuntime } from "../upstream/runtime";
import type { Action, Candidate } from "./types";
import { catanMoveSchema, type CatanView } from "./catan-actions";
type State = { kind: "ktd"; view: CatanView };
type Position = [number[], number];
export const catanResourceNames = ["木材", "砖块", "羊毛", "谷物", "矿石"];
export class CatanRules {
  readonly original;
  readonly maps;
  readonly geometry;
  readonly ops;
  readonly constants;
  constructor(readonly runtime: UpstreamRuntime) {
    this.original = runtime.load(552);
    this.maps = runtime.load(9796);
    this.geometry = runtime.load(6912);
    this.constants = runtime.load(6634);
    this.ops = this.constants.K8;
  }
  create(players: number): State {
    const mapId = players > 6 ? 2 : players > 4 ? 1 : 0;
    const codec = this.runtime.load(738).AD;
    const view = this.original.Bx(
      { playerList: Array(players).fill({}) },
      codec.encode({ mapId }).finish(),
    ) as CatanView;
    view.mapProp = Array.from(view.mapProp);
    view.playerData = view.playerData.map((player) => structuredClone(player));
    return { kind: "ktd", view };
  }
  phase(view: CatanView, actor: number) {
    return this.original.ky(
      {
        position: actor + 1,
        playerList: view.playerData.map(() => ({ nickname: "玩家" })),
      },
      view,
    ) as { isOver: boolean; waitFor: number; allowOps: number[]; hint: string };
  }
  finished(state: State): boolean {
    return this.phase(state.view, state.view.state).isOver;
  }
  actors(state: State): number[] {
    if (this.finished(state)) return [];
    if (state.view.exchangeData?.responses.includes(1)) return state.view.exchangeData.responses.flatMap((response, actor) => response === 1 ? [actor] : []);
    return state.view.playerData.flatMap((_, actor) =>
      this.phase(state.view, actor).allowOps.length ||
      state.view.exchangeData?.responses[actor] === 1 ||
      this.requestable(state.view, actor)
        ? [actor]
        : [],
    );
  }
  requestable(view: CatanView, actor: number): boolean {
    return (
      view.playerData.length > 4 &&
      actor !== view.state &&
      !(view.devCard & 16) &&
      !!view.lastDice &&
      !(
        this.original.bg(view.lastDice) === 7 &&
        view.lastOp?.type === this.ops.RollDice
      ) &&
      !((view.actionRequest || 0) & (1 << actor))
    );
  }
  positions(
    view: CatanView,
    actor: number,
    building: "house" | "road" | "city",
    free: boolean,
  ): number[] {
    const positions: Position[] =
      building === "house"
        ? free
          ? this.geometry.q9(view)
          : this.geometry.xG(view, actor)
        : building === "city"
          ? this.geometry.fH(view, actor)
          : free && !(view.devCard & 2)
            ? this.geometry.Z7(view)
            : this.geometry.jc(view, actor);
    const map = this.maps.ZP[view.mapId];
    return positions.map(
      ([xy, side]) =>
        (map.xyToId.get(`${xy[0]},${xy[1]}`) << 2) |
        (building === "road"
          ? side
          : (side << 1) | (building === "city" ? 1 : 0)),
    );
  }
  exchange(
    view: CatanView,
    actor: number,
    give: number[],
    take: number[],
  ): void {
    const player = view.playerData[actor];
    if (
      give.some((count, index) => count > player.resources[index]) ||
      take.some((count, index) => count > view.bankData.resources[index])
    )
      throw new Error("资源不足");
    player.resources = player.resources.map(
      (count, index) => count - give[index] + take[index],
    );
    view.bankData.resources = view.bankData.resources.map(
      (count, index) => count + give[index] - take[index],
    );
  }
  candidates(state: State, actor: number): Candidate[] {
    const view = state.view,
      player = view.playerData[actor];
    if (!player || this.finished(state)) return [];
    const phase = this.phase(view, actor),
      ops = phase.allowOps,
      moves: Candidate[] = [],
      zero = [0, 0, 0, 0, 0];
    const add = (
      move: Extract<Action, { type: "ktd-action" }>["move"],
      label: string,
    ) => moves.push({ action: { type: "ktd-action", move }, label });
    for (const building of ["house", "road", "city"] as const) {
      const initial =
        building === "house"
          ? ops.includes(this.ops.PutHouse)
          : building === "road" && ops.includes(this.ops.PutRoad);
      const allowed =
        initial ||
        ops.includes(
          building === "house"
            ? this.ops.BuyHouse
            : building === "city"
              ? this.ops.BuyCity
              : this.ops.BuyRoad,
        );
      const cost = initial
        ? zero
        : (this.constants.Vf[
            building === "house" ? 2 : building === "road" ? 1 : 3
          ] as number[]);
      const count =
        building === "road"
          ? player.roads.length
          : player.houses.filter((id) => !!(id & 1) === (building === "city"))
              .length;
      if (
        allowed &&
        count < (building === "road" ? 15 : 5) &&
        cost.every((value, index) => player.resources[index] >= value)
      )
        for (const id of this.positions(view, actor, building, !!initial))
          add(
            { kind: "build", building, id },
            `${building === "road" ? "道路" : building === "city" ? "城市" : "村庄"} · ${id}`,
          );
    }
    if (ops.includes(this.ops.RollDice)) add({ kind: "roll" }, "掷骰子");
    if (
      ops.length > 1 &&
      !ops.includes(this.ops.RollDice) &&
      !view.exchangeData?.responses.includes(1)
    )
      add({ kind: "end" }, "结束回合");
    if (
      ops.includes(this.ops.BuyDevCard) &&
      view.bankData.cards.some((count) => count > 0) &&
      this.constants.Vf[4].every(
        (value: number, i: number) => player.resources[i] >= value,
      )
    )
      add({ kind: "buy-dev" }, "购买发展卡");
    if (ops.includes(this.ops.DiscardResource)) {
      let remaining = player.resources.reduce((a, b) => a + b) >> 1;
      const resources = player.resources.map((count) => {
        const value = Math.min(count, remaining);
        remaining -= value;
        return value;
      });
      add({ kind: "discard", resources }, "弃置一半资源（可在牌桌自选）");
    }
    for (const knight of [false, true])
      if (
        ops.includes(knight ? this.ops.UseCardKnight : this.ops.MoveRobber) &&
        (!knight || player.cards[0] > view.newCards[0])
      ) {
        for (let tile = 0; tile < this.maps.ZP[view.mapId].tileCount; tile++)
          if (tile !== view.robber) {
            const targets = view.playerData.flatMap((other, id) =>
              id !== actor &&
              other.resources.some((count) => count > 0) &&
              other.houses.some((house) =>
                this.geometry
                  .Qp(
                    this.maps.ZP[view.mapId].tiles[house >> 2],
                    (house >> 1) & 1,
                    this.maps.ZP[view.mapId],
                  )
                  .some(
                    (xy: number[]) =>
                      this.maps.ZP[view.mapId].xyToId.get(
                        `${xy[0]},${xy[1]}`,
                      ) === tile,
                  ),
              )
                ? [id]
                : [],
            );
            for (const target of targets.length ? targets : [-1])
              add(
                { kind: "robber", tile, target, knight },
                `${knight ? "骑士" : "强盗"} → 地块 ${tile}${target >= 0 ? `，偷取玩家 ${target + 1}` : ""}`,
              );
          }
      }
    if (
      ops.includes(this.ops.UseCardRoads) &&
      player.cards[1] > view.newCards[1] &&
      player.roads.length < 15
    )
      for (const id of this.positions(
        { ...view, devCard: view.devCard | 2 },
        actor,
        "road",
        true,
      ))
        add({ kind: "road-card", id }, `道路卡 · ${id}`);
    if (
      ops.includes(this.ops.UseCardMonopoly) &&
      player.cards[3] > view.newCards[3]
    )
      for (let resource = 0; resource < 5; resource++)
        add({ kind: "monopoly", resource }, `垄断 · ${catanResourceNames[resource]}`);
    if (
      ops.includes(this.ops.UseCardResources) &&
      player.cards[2] > view.newCards[2]
    )
      for (let a = 0; a < 5; a++)
        for (let b = a; b < 5; b++) {
          const resources = [0, 0, 0, 0, 0];
          resources[a]++;
          resources[b]++;
          if (
            resources.every((count, i) => count <= view.bankData.resources[i])
          )
            add(
              { kind: "abundance", resources },
              `丰收 · ${catanResourceNames[a]}、${catanResourceNames[b]}`,
            );
        }
    if (view.exchangeData) {
      if (actor === view.state) add({ kind: "cancel-trade" }, "撤回交易");
      else if (view.exchangeData.responses[actor] === 1) {
        if (
          view.exchangeData.needs.every(
            (count, i) => count <= player.resources[i],
          )
        )
          add({ kind: "respond", accept: true }, "同意交易");
        add({ kind: "respond", accept: false }, "拒绝交易");
      }
    }
    if (this.requestable(view, actor))
      add({ kind: "request-build" }, "请求特殊建造");
    if (ops.includes(this.ops.ExchangeWithBank)) {
      const ports = this.original.tY(
        view,
        this.maps.sI(view.mapId, view.mapProp),
        actor,
      ) as boolean[];
      for (let a = 0; a < 5; a++)
        for (let b = 0; b < 5; b++)
          if (a !== b) {
            const rate = ports[a] ? 2 : ports[7] ? 3 : 4;
            if (player.resources[a] >= rate && view.bankData.resources[b] > 0) {
              const give = [0, 0, 0, 0, 0],
                take = [0, 0, 0, 0, 0];
              give[a] = rate;
              take[b] = 1;
              add(
                { kind: "bank", give, take },
                `兑换 ${rate}${catanResourceNames[a]} → ${catanResourceNames[b]}`,
              );
            }
          }
    }
    return moves;
  }
  apply(state: State, actor: number, action: Action): State {
    if (
      action.type !== "ktd-action" ||
      !state.view.playerData[actor] ||
      this.finished(state)
    )
      throw new Error("不是合法的卡坦岛动作");
    const move = catanMoveSchema.parse(action.move),
      view = structuredClone(state.view),
      player = view.playerData[actor],
      phase = this.phase(view, actor),
      zero = [0, 0, 0, 0, 0];
    const allow = (op: number) => {
      if (!phase.allowOps.includes(op))
        throw new Error("当前阶段不能执行该动作");
    };
    const useCard = (card: number) => {
      if (view.devCard & 1 || player.cards[card] <= view.newCards[card])
        throw new Error("发展卡尚不可用");
      player.cards[card]--;
      view.devCard |= 1;
    };
    const op = (
      type: number,
      extra: Partial<NonNullable<CatanView["lastOp"]>> = {},
    ) => {
      view.lastOp = { type, playerId: actor, ...extra };
      delete view.exchangeData;
    };
    switch (move.kind) {
      case "roll":
        allow(this.ops.RollDice);
        return {
          kind: "ktd",
          view: {
            ...view,
            ...this.original.HU(
              view,
              this.maps.sI(view.mapId, view.mapProp),
              phase,
            ),
          },
        };
      case "end":
        if (
          phase.allowOps.length <= 1 ||
          phase.allowOps.includes(this.ops.RollDice) ||
          view.exchangeData?.responses.includes(1)
        )
          throw new Error("当前不能结束回合");
        return {
          kind: "ktd",
          view: {
            mapId: view.mapId,
            mapProp: view.mapProp,
            devCard: 0,
            tradeCount: 0,
            lastDice: 0,
            ...this.original.d7(view),
          },
        };
      case "build":
      case "road-card": {
        const building = move.kind === "road-card" ? "road" : move.building;
        const initial =
          building === "house"
            ? phase.allowOps.includes(this.ops.PutHouse)
            : building === "road" && phase.allowOps.includes(this.ops.PutRoad);
        const free = !!initial || move.kind === "road-card";
        if (move.kind === "road-card") {
          allow(this.ops.UseCardRoads);
          useCard(1);
          if (player.roads.length < 14) view.devCard |= 2;
        } else
          allow(
            initial
              ? building === "house"
                ? this.ops.PutHouse
                : this.ops.PutRoad
              : building === "house"
                ? this.ops.BuyHouse
                : building === "road"
                  ? this.ops.BuyRoad
                  : this.ops.BuyCity,
          );
        if (
          !this.positions(
            move.kind === "road-card"
              ? { ...state.view, devCard: state.view.devCard | 2 }
              : state.view,
            actor,
            building,
            free,
          ).includes(move.id)
        )
          throw new Error("建造位置不合法");
        const count =
          building === "road"
            ? player.roads.length
            : player.houses.filter((id) => !!(id & 1) === (building === "city"))
                .length;
        if (count >= (building === "road" ? 15 : 5))
          throw new Error("建筑数量已达上限");
        const cost = free
          ? zero
          : (this.constants.Vf[
              building === "house" ? 2 : building === "road" ? 1 : 3
            ] as number[]);
        this.exchange(view, actor, cost, zero);
        op(
          building === "road" ? this.ops.PutRoad : this.ops.PutHouse,
          building === "road"
            ? { road: move.id, costs: cost }
            : { house: move.id, costs: cost },
        );
        if (building === "road") {
          const before = player.roads.length;
          player.roads.push(move.id);
          if (initial && !(view.devCard & 16) && view.devCard & 2)
            view.devCard &= 125;
          if (before < 2)
            view.state = before
              ? Math.max(0, view.state - 1)
              : view.state === view.playerData.length - 1
                ? view.state
                : view.state + 1;
        } else {
          if (building === "city")
            player.houses.splice(player.houses.indexOf(move.id & ~1), 1);
          else if (player.houses.length === 1) {
            const map = this.maps.ZP[view.mapId],
              layout = this.maps.sI(view.mapId, view.mapProp),
              take = [0, 0, 0, 0, 0];
            for (const xy of this.geometry.Qp(
              map.tiles[move.id >> 2],
              (move.id >> 1) & 1,
              map,
            )) {
              const tile = map.xyToId.get(`${xy[0]},${xy[1]}`),
                resource = layout.tileTypes[tile];
              if (resource < 5) take[resource]++;
            }
            this.exchange(view, actor, zero, take);
          }
          player.houses.push(move.id);
        }
        const map = this.maps.ZP[view.mapId],
          all = new Set<string>();
        view.playerData.forEach((p) =>
          p.houses.forEach((h) => {
            const xy = map.tiles[h >> 2];
            all.add(`${xy[0]},${xy[1]},${(h >> 1) & 1}`);
          }),
        );
        view.playerData.forEach((p) => {
          const blocked = new Set(all);
          p.houses.forEach((h) => {
            const xy = map.tiles[h >> 2];
            blocked.delete(`${xy[0]},${xy[1]},${(h >> 1) & 1}`);
          });
          p.longestRoad = this.original.longestRoad(
            p.roads.map((r) => [map.tiles[r >> 2], r & 3]),
            blocked,
          );
        });
        const best = Math.max(...view.playerData.map((p) => p.longestRoad)),
          winners = view.playerData.flatMap((p, i) =>
            p.longestRoad === best ? [i + 1] : [],
          );
        view.bankData.longestRoad = best > 4 ? best : 0;
        view.bankData.longestRoadPos =
          best > 4
            ? winners.includes(view.bankData.longestRoadPos)
              ? view.bankData.longestRoadPos
              : winners.includes(view.state + 1)
                ? view.state + 1
                : winners[0]
            : 0;
        break;
      }
      case "buy-dev": {
        allow(this.ops.BuyDevCard);
        const deck = view.bankData.cards.flatMap((count, i) =>
          Array(count).fill(i),
        );
        if (!deck.length) throw new Error("发展卡已售完");
        this.exchange(view, actor, this.constants.Vf[4], zero);
        const card = deck[Math.floor(this.runtime.random() * deck.length)];
        view.bankData.cards[card]--;
        player.cards[card]++;
        view.newCards[card]++;
        op(this.ops.BuyDevCard, { costs: this.constants.Vf[4] });
        break;
      }
      case "discard": {
        allow(this.ops.DiscardResource);
        if (
          move.resources.reduce((a, b) => a + b) !==
          player.resources.reduce((a, b) => a + b) >> 1
        )
          throw new Error("必须弃置一半资源");
        this.exchange(view, actor, move.resources, zero);
        view.actionRequest = (view.actionRequest || 0) & ~(1 << actor);
        view.lastOp = {
          type: this.ops.RollDice,
          playerId: state.view.lastOp!.playerId,
        };
        break;
      }
      case "robber": {
        allow(move.knight ? this.ops.UseCardKnight : this.ops.MoveRobber);
        if (
          !this.candidates(state, actor).some(
            (candidate) =>
              JSON.stringify(candidate.action) ===
              JSON.stringify({ type: "ktd-action", move }),
          )
        )
          throw new Error("强盗目标不合法");
        if (move.knight) {
          useCard(0);
          player.robberCount++;
          if (
            player.robberCount > 2 &&
            player.robberCount > view.bankData.maxRobberCount
          ) {
            view.bankData.maxRobberCount = player.robberCount;
            view.bankData.maxRobberCountPos = actor + 1;
          }
        }
        op(move.knight ? this.ops.UseCardKnight : this.ops.MoveRobber, {
          from: view.robber,
          to: move.tile,
        });
        view.robber = move.tile;
        if (move.target >= 0) {
          const victim = view.playerData[move.target],
            cards = victim.resources.flatMap((count, i) =>
              Array(count).fill(i),
            ),
            resource = cards[Math.floor(this.runtime.random() * cards.length)];
          victim.resources[resource]--;
          player.resources[resource]++;
          const needs = [0, 0, 0, 0, 0];
          needs[resource] = 1;
          Object.assign(view.lastOp!, { withPlayerId: move.target, needs });
        }
        break;
      }
      case "abundance":
        allow(this.ops.UseCardResources);
        if (move.resources.reduce((a, b) => a + b) !== 2)
          throw new Error("丰收需要两张资源");
        useCard(2);
        this.exchange(view, actor, zero, move.resources);
        op(this.ops.UseCardResources, { needs: move.resources });
        break;
      case "monopoly": {
        allow(this.ops.UseCardMonopoly);
        useCard(3);
        let count = 0;
        view.playerData.forEach((p, id) => {
          if (id !== actor) {
            count += p.resources[move.resource];
            p.resources[move.resource] = 0;
          }
        });
        player.resources[move.resource] += count;
        const needs = [0, 0, 0, 0, 0];
        needs[move.resource] = count;
        op(this.ops.UseCardMonopoly, { needs });
        break;
      }
      case "bank": {
        allow(this.ops.ExchangeWithBank);
        const ports = this.original.tY(
            view,
            this.maps.sI(view.mapId, view.mapProp),
            actor,
          ),
          give = move.give.findIndex((count) => count > 0),
          take = move.take.findIndex((count) => count > 0),
          rate = ports[give] ? 2 : ports[7] ? 3 : 4;
        if (
          give < 0 ||
          take < 0 ||
          give === take ||
          move.give.filter(Boolean).length !== 1 ||
          move.take.reduce((a, b) => a + b) !== 1 ||
          move.give[give] !== rate
        )
          throw new Error("银行兑换比例不合法");
        this.exchange(view, actor, move.give, move.take);
        op(this.ops.ExchangeWithBank, { needs: move.take, costs: move.give });
        break;
      }
      case "trade": {
        view.tradeCount = (view.tradeCount || 0) + 1;
        allow(this.ops.ExchangeWithPlayer);
        if (
          view.exchangeData?.responses.includes(1) ||
          !move.give.some(Boolean) ||
          !move.take.some(Boolean) ||
          move.give.some(
            (count, i) =>
              count > player.resources[i] || (count > 0 && move.take[i] > 0),
          ) ||
          new Set(move.targets).size !== move.targets.length ||
          move.targets.some((id) => id === actor || !view.playerData[id])
        )
          throw new Error("交易配置不合法");
        view.exchangeData = {
          needs: move.take,
          costs: move.give,
          responses: view.playerData.map((_, id) =>
            move.targets.includes(id) ? 1 : 0,
          ),
        };
        delete view.lastOp;
        break;
      }
      case "respond": {
        const trade = view.exchangeData;
        if (!trade || actor === view.state || trade.responses[actor] !== 1)
          throw new Error("没有待回应交易");
        if (!move.accept) {
          trade.responses[actor] = 2;
          break;
        }
        const owner = view.playerData[view.state];
        if (
          trade.needs.some((count, i) => count > player.resources[i]) ||
          trade.costs.some((count, i) => count > owner.resources[i])
        )
          throw new Error("交易资源不足");
        player.resources = player.resources.map(
          (count, i) => count - trade.needs[i] + trade.costs[i],
        );
        owner.resources = owner.resources.map(
          (count, i) => count + trade.needs[i] - trade.costs[i],
        );
        view.lastOp = {
          type: this.ops.ExchangeWithPlayer,
          playerId: view.state,
          withPlayerId: actor,
          needs: trade.needs,
          costs: trade.costs,
        };
        delete view.exchangeData;
        break;
      }
      case "cancel-trade":
        if (actor !== view.state || !view.exchangeData)
          throw new Error("只有发起人可以撤回交易");
        delete view.exchangeData;
        delete view.lastOp;
        break;
      case "request-build":
        if (!this.requestable(view, actor)) throw new Error("不能请求特殊建造");
        view.actionRequest = (view.actionRequest || 0) | (1 << actor);
        break;
    }
    return { kind: "ktd", view };
  }
  project(state: State, actor: number): State {
    const result = structuredClone(state);
    if (this.finished(state)) return result;
    result.view.playerData.forEach((player, id) => {
      if (id !== actor) {
        player.resources = [
          player.resources.reduce((a, b) => a + b),
          0,
          0,
          0,
          0,
        ];
        player.cards = [player.cards.reduce((a, b) => a + b), 0, 0, 0, 0];
      }
    });
    result.view.bankData.cards = [
      result.view.bankData.cards.reduce((a, b) => a + b),
      0,
      0,
      0,
      0,
    ];
    if (actor !== state.view.state)
      result.view.newCards = [
        state.view.newCards.reduce((a, b) => a + b),
        0,
        0,
        0,
        0,
      ];
    const last = result.view.lastOp;
    if (
      last &&
      [this.ops.MoveRobber, this.ops.UseCardKnight].includes(last.type) &&
      actor !== last.playerId &&
      actor !== last.withPlayerId
    )
      delete last.needs;
    return result;
  }
}
