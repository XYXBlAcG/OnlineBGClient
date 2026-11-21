import type { GameOptions } from "../game-options";
import type { Rules } from "../plugin";
import type { Action, Candidate } from "../types";
import type { MapNode } from "../expedition/adventure-types";
import { minerItems, minerObjectPool, minerObjects } from "./content";
import {
  createNode,
  generateMinerMap,
  mapChoices,
  nodeLabel,
} from "./map";
import type {
  MinerGameState,
  MinerItemId,
  MinerMineNode,
  MinerObject,
  MinerPlayerView,
  MinerView,
} from "./types";

const TICK_MS = 120;
const MAX_LENGTH = 1.02;
const PIVOT_X = 0.5;
const PIVOT_Y = 0.03;
const SWING_SPEED = 58;
const SHOOT_SPEED = 1.45;
const BASE_REEL = 0.82;

function makePlayer(seat: number): MinerPlayerView {
  return {
    seat,
    score: 0,
    coins: 0,
    items: {},
    hook: {
      phase: "swing",
      angle: (seat % 2 ? 1 : -1) * 32,
      direction: seat % 2 ? -1 : 1,
      length: 0,
      targetId: null,
    },
    strengthTicks: 0,
    ropeNext: false,
    lucky: false,
    rockBook: false,
    lastCatch: "",
  };
}

function log(view: MinerView, text: string) {
  view.sequence++;
  view.log.push({ id: view.sequence, text });
  if (view.log.length > 100) view.log.splice(0, view.log.length - 100);
}

function setLastAction(
  view: MinerView,
  actor: number,
  kind: string,
  text: string,
) {
  view.lastAction = { actor, kind, text };
  log(view, text);
}

function rayHit(
  hook: MinerPlayerView["hook"],
  previous: number,
  next: number,
  objects: MinerObject[],
): MinerObject | undefined {
  const radians = (hook.angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = Math.cos(radians);
  let nearest: MinerObject | undefined;
  let nearestT = Infinity;
  for (const object of objects) {
    if (object.removed || object.hookedBy !== null) continue;
    const ox = object.x - PIVOT_X;
    const oy = object.y - PIVOT_Y;
    const t = ox * dx + oy * dy;
    if (t < previous || t > next || t > MAX_LENGTH) continue;
    const perpendicular = Math.abs(ox * dy - oy * dx);
    if (perpendicular > object.radius) continue;
    if (t < nearestT) {
      nearestT = t;
      nearest = object;
    }
  }
  return nearest;
}

function collect(
  view: MinerView,
  player: MinerPlayerView,
  object: MinerObject,
): void {
  object.removed = true;
  object.hookedBy = null;
  player.hook.targetId = null;
  player.hook.length = 0;
  player.hook.phase = "swing";
  const definition = minerObjects[object.kind];
  let value = object.value;
  if (object.kind === "rockSmall" || object.kind === "rockLarge")
    value *= player.rockBook ? 2 : 1;
  if (player.lucky) {
    value = Math.floor(value * 1.5);
    player.lucky = false;
  }
  player.score += value;
  player.coins += value;
  view.teamScore += value;
  player.lastCatch = definition.name;
  setLastAction(
    view,
    player.seat,
    object.kind === "tnt" ? "tnt" : "catch",
    object.kind === "tnt"
      ? `玩家 ${player.seat + 1} 钩到了 TNT，矿洞震了一下。`
      : `玩家 ${player.seat + 1} 收回了${definition.name}，+${value}。`,
  );
  if (object.kind === "tnt") {
    for (const other of view.node?.objects ?? []) {
      if (other.removed || other.id === object.id) continue;
      if (
        Math.hypot(other.x - object.x, other.y - object.y) <
        other.radius + 0.1
      ) {
        other.removed = true;
      }
    }
  }
}

function updateHook(
  view: MinerView,
  player: MinerPlayerView,
  node: MinerMineNode,
): void {
  const hook = player.hook;
  const dt = TICK_MS / 1000;
  if (hook.phase === "swing") {
    hook.angle += hook.direction * SWING_SPEED * dt;
    if (hook.angle > 80) {
      hook.angle = 80;
      hook.direction = -1;
    } else if (hook.angle < -80) {
      hook.angle = -80;
      hook.direction = 1;
    }
    return;
  }
  if (hook.phase === "shoot") {
    const previous = hook.length;
    hook.length = Math.min(MAX_LENGTH, hook.length + SHOOT_SPEED * dt);
    const hit = rayHit(hook, previous, hook.length, node.objects);
    if (hit) {
      hit.hookedBy = player.seat;
      hook.targetId = hit.id;
      hook.phase = "reel";
      hook.length = Math.max(
        0.08,
        Math.min(
          MAX_LENGTH,
          (hit.x - PIVOT_X) * Math.sin((hook.angle * Math.PI) / 180) +
            (hit.y - PIVOT_Y) * Math.cos((hook.angle * Math.PI) / 180),
        ),
      );
    } else if (hook.length >= MAX_LENGTH) {
      hook.phase = "reel";
    }
    return;
  }
  const target = hook.targetId
    ? node.objects.find((object) => object.id === hook.targetId)
    : undefined;
  const weight = target ? minerObjects[target.kind].weight : 0;
  const strength = player.strengthTicks > 0 ? 1.9 : 1;
  const rope = player.ropeNext ? 4 : 1;
  player.ropeNext = false;
  const speed = (BASE_REEL * strength * rope) / (1 + weight * 0.45);
  hook.length = Math.max(0, hook.length - speed * dt);
  if (hook.length <= 0.001) {
    if (target) collect(view, player, target);
    else {
      hook.phase = "swing";
      hook.length = 0;
      hook.targetId = null;
    }
  }
}

export class MinerRules implements Rules<"miner"> {
  constructor(private readonly random: () => number) {}

  create(
    players: number,
    _team: boolean,
    options?: GameOptions,
  ): MinerGameState {
    const seed = `${this.random()}:${this.random()}`;
    const map = generateMinerMap(seed);
    const view: MinerView = {
      phase: "map",
      map,
      floor: 0,
      current: null,
      path: [],
      node: null,
      votes: {},
      ready: [],
      players: Array.from({ length: players }, (_, seat) => makePlayer(seat)),
      teamQuota: options?.miner?.quota ?? 8000 + players * 3000,
      teamScore: 0,
      tick: 0,
      log: [],
      sequence: 0,
    };
    log(view, `矿灯亮起，${players} 名矿工进入矿脉。目标：${view.teamQuota}。`);
    return { kind: "miner", view };
  }

  finished(state: MinerGameState): boolean {
    return state.view.phase === "won" || state.view.phase === "lost";
  }

  actors(state: MinerGameState): number[] {
    const view = state.view;
    if (this.finished(state)) return [];
    if (view.phase === "map")
      return view.players
        .map((player) => player.seat)
        .filter((seat) => !(seat in view.votes));
    if (view.phase === "live") return view.players.map((player) => player.seat);
    if (view.phase === "shop" || view.phase === "camp" || view.phase === "event")
      return view.players
        .map((player) => player.seat)
        .filter((seat) => !view.ready.includes(seat));
    return [];
  }

  candidates(state: MinerGameState, actor: number): Candidate[] {
    const view = state.view;
    if (this.finished(state)) return [];
    if (view.phase === "map") {
      if (actor in view.votes) return [];
      return mapChoices(view).map((node) => ({
        action: {
          type: "miner-action" as const,
          move: { type: "vote" as const, nodeId: node.id },
        },
        label: `前往${nodeLabel(node.kind)}`,
      }));
    }
    const player = view.players[actor]!;
    if (view.phase === "live") {
      const result: Candidate[] = [];
      if (player.hook.phase === "swing")
        result.push({
          action: {
            type: "miner-action",
            move: { type: "drop", angle: player.hook.angle },
          },
          label: "下钩",
        });
      for (const [itemId, count] of Object.entries(player.items)) {
        if (!count) continue;
        result.push({
          action: {
            type: "miner-action",
            move: { type: "use-item", itemId: itemId as MinerItemId },
          },
          label: `使用${minerItems[itemId as MinerItemId].name}`,
        });
      }
      return result;
    }
    if (view.phase === "shop") {
      return [
        ...minerObjectPool
          .filter(() => false)
          .map(() => null as never)
          .filter(Boolean),
        ...Object.values(minerItems)
          .filter((item) => player.coins >= item.cost)
          .map((item) => ({
            action: {
              type: "miner-action" as const,
              move: { type: "buy" as const, itemId: item.id },
            },
            label: `购买${item.name}（${item.cost}）`,
          })),
        {
          action: {
            type: "miner-action" as const,
            move: { type: "ready" as const },
          },
          label: "离开商店",
        },
      ];
    }
    if (view.phase === "camp")
      return [
        {
          action: {
            type: "miner-action" as const,
            move: { type: "ready" as const },
          },
          label: "休整完毕",
        },
      ];
    if (view.phase === "event")
      return [
        {
          action: {
            type: "miner-action" as const,
            move: { type: "event" as const, choice: "risk" as const },
          },
          label: "赌一把",
        },
        {
          action: {
            type: "miner-action" as const,
            move: { type: "event" as const, choice: "safe" as const },
          },
          label: "稳妥拿钱",
        },
      ];
    return [];
  }

  needsResolution(state: MinerGameState): boolean {
    const view = state.view;
    if (view.phase === "live") return true;
    if (view.phase === "map")
      return view.players.every((player) => player.seat in view.votes);
    if (view.phase === "shop" || view.phase === "camp" || view.phase === "event")
      return view.players.every((player) => view.ready.includes(player.seat));
    return false;
  }

  resolutionDelay(): number {
    return TICK_MS;
  }

  actionDelay(): number {
    return 0;
  }

  acceptsLateActions(state: MinerGameState): boolean {
    return state.view.phase === "live";
  }

  actionWindow(state: MinerGameState, action: Action): string | undefined {
    if (action.type !== "miner-action") return;
    if (state.view.phase === "live") return "miner-live";
    if (state.view.phase === "map" && action.move.type === "vote")
      return `miner-vote-${state.view.floor}`;
    if (
      (state.view.phase === "shop" ||
        state.view.phase === "camp" ||
        state.view.phase === "event") &&
      action.move.type !== "vote"
    )
      return `miner-${state.view.phase}-${state.view.current}`;
    return undefined;
  }

  apply(
    state: MinerGameState,
    actor: number,
    action: Action,
  ): MinerGameState {
    if (action.type !== "miner-action") throw new Error("不是矿工动作");
    const view = structuredClone(state.view);
    const player = view.players[actor];
    if (!player) throw new Error("玩家不存在");
    const move = action.move;
    if (view.phase === "map") {
      if (move.type !== "vote") throw new Error("请选择路线");
      if (actor in view.votes) throw new Error("已经投过票");
      if (!mapChoices(view).some((node) => node.id === move.nodeId))
        throw new Error("不能前往该节点");
      view.votes[actor] = move.nodeId;
      setLastAction(
        view,
        actor,
        "vote",
        `玩家 ${actor + 1} 选择前往${mapChoices(view).find((node) => node.id === move.nodeId) ? nodeLabel(mapChoices(view).find((node) => node.id === move.nodeId)!.kind) : "矿点"}。`,
      );
      return { kind: "miner", view };
    }
    if (view.phase === "live") {
      if (move.type === "drop") {
        if (player.hook.phase !== "swing")
          throw new Error("钩子还在回收");
        player.hook.angle = Math.max(-85, Math.min(85, move.angle));
        player.hook.phase = "shoot";
        player.hook.length = 0;
        player.hook.targetId = null;
        setLastAction(
          view,
          actor,
          "drop",
          `玩家 ${actor + 1} 下钩，角度 ${Math.round(move.angle)}°。`,
        );
        return { kind: "miner", view };
      }
      if (move.type === "use-item") {
        this.useItem(view, actor, move.itemId);
        return { kind: "miner", view };
      }
      throw new Error("实时矿洞只能下钩或使用道具");
    }
    if (view.phase === "shop") {
      if (move.type === "buy") {
        const item = minerItems[move.itemId];
        if (player.coins < item.cost) throw new Error("金币不足");
        player.coins -= item.cost;
        player.items[move.itemId] = (player.items[move.itemId] ?? 0) + 1;
        setLastAction(
          view,
          actor,
          "buy",
          `玩家 ${actor + 1} 购买了${item.name}。`,
        );
        return { kind: "miner", view };
      }
      if (move.type !== "ready") throw new Error("请购买或离开商店");
      if (!view.ready.includes(actor)) view.ready.push(actor);
      setLastAction(view, actor, "ready", `玩家 ${actor + 1} 离开商店。`);
      return { kind: "miner", view };
    }
    if (view.phase === "camp") {
      if (move.type !== "ready") throw new Error("营地只能休整");
      if (!view.ready.includes(actor)) view.ready.push(actor);
      setLastAction(view, actor, "ready", `玩家 ${actor + 1} 休整完毕。`);
      return { kind: "miner", view };
    }
    if (view.phase === "event") {
      if (move.type !== "event") throw new Error("请选择事件结果");
      if (!view.ready.includes(actor)) {
        if (move.choice === "risk") {
          if (this.random() < 0.6) {
            player.score += 300;
            player.coins += 300;
            view.teamScore += 300;
            setLastAction(view, actor, "event", `玩家 ${actor + 1} 赌石成功，+300。`);
          } else {
            player.score = Math.max(0, player.score - 100);
            player.coins = Math.max(0, player.coins - 100);
            view.teamScore = Math.max(0, view.teamScore - 100);
            setLastAction(view, actor, "event", `玩家 ${actor + 1} 赌石失败，-100。`);
          }
        } else {
          player.score += 100;
          player.coins += 100;
          view.teamScore += 100;
          setLastAction(view, actor, "event", `玩家 ${actor + 1} 稳妥拿到 100。`);
        }
        view.ready.push(actor);
      }
      return { kind: "miner", view };
    }
    throw new Error("当前阶段不能执行动作");
  }

  resolve(state: MinerGameState): MinerGameState {
    const view = structuredClone(state.view);
    if (view.phase === "map") return { kind: "miner", view: this.resolveVote(view) };
    if (view.phase === "live") return { kind: "miner", view: this.tick(view) };
    if (view.phase === "shop" || view.phase === "camp" || view.phase === "event")
      return { kind: "miner", view: this.finishNode(view) };
    return { kind: "miner", view };
  }

  project(state: MinerGameState): MinerGameState {
    return structuredClone(state);
  }

  private useItem(
    view: MinerView,
    actor: number,
    itemId: MinerItemId,
  ): void {
    const player = view.players[actor]!;
    if (!player.items[itemId]) throw new Error("没有这个道具");
    player.items[itemId]--;
    if (itemId === "dynamite") {
      const target = view.node?.objects.find(
        (object) => object.id === player.hook.targetId,
      );
      if (target) {
        target.removed = true;
        target.hookedBy = null;
        player.hook.targetId = null;
        player.hook.phase = "reel";
        player.hook.length = Math.max(player.hook.length, 0.08);
      }
      setLastAction(view, actor, "item", `玩家 ${actor + 1} 使用了炸药。`);
      return;
    }
    if (itemId === "strength") player.strengthTicks = Math.ceil(20_000 / TICK_MS);
    if (itemId === "lucky") player.lucky = true;
    if (itemId === "rockBook") player.rockBook = true;
    if (itemId === "time" && view.node) view.node.timeLeftMs += 10_000;
    if (itemId === "rope") player.ropeNext = true;
    setLastAction(
      view,
      actor,
      "item",
      `玩家 ${actor + 1} 使用了${minerItems[itemId].name}。`,
    );
  }

  private resolveVote(view: MinerView): MinerView {
    const counts = new Map<string, number>();
    for (const nodeId of Object.values(view.votes))
      if (nodeId) counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
    const chosen = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0];
    const node = mapChoices(view).find((candidate) => candidate.id === chosen);
    if (!node) throw new Error("路线投票无效");
    this.enterNode(view, node);
    return view;
  }

  private enterNode(view: MinerView, node: MapNode): void {
    view.current = node.id;
    view.floor = node.floor;
    view.path.push(node.id);
    view.votes = {};
    view.ready = [];
    view.node = createNode(node, view.players.length, this.random);
    view.phase =
      view.node.scene === "mine"
        ? "live"
        : view.node.scene === "shop"
          ? "shop"
          : view.node.scene === "camp"
            ? "camp"
            : "event";
    for (const player of view.players) {
      player.hook = {
        phase: "swing",
        angle: (player.seat % 2 ? 1 : -1) * 32,
        direction: player.seat % 2 ? -1 : 1,
        length: 0,
        targetId: null,
      };
    }
    setLastAction(
      view,
      -1,
      "enter",
      `全队进入${view.node.name}${view.node.scene === "mine" ? `，限时 ${Math.round(view.node.durationMs / 1000)} 秒。` : "。"}`,
    );
  }

  private tick(view: MinerView): MinerView {
    const node = view.node;
    if (!node) return view;
    view.tick++;
    node.timeLeftMs -= TICK_MS;
    for (const player of view.players) {
      if (player.strengthTicks > 0) player.strengthTicks--;
      updateHook(view, player, node);
    }
    if (
      node.timeLeftMs <= 0 ||
      node.objects.every((object) => object.removed)
    ) {
      node.timeLeftMs = Math.max(0, node.timeLeftMs);
      return this.finishNode(view);
    }
    return view;
  }

  private finishNode(view: MinerView): MinerView {
    view.node = null;
    view.ready = [];
    const current = view.map.flat().find((node) => node.id === view.current);
    const choices = current ? mapChoices(view) : [];
    const final = !current || choices.length === 0 || current.floor >= view.map.length - 1;
    if (final) {
      const won = view.teamScore >= view.teamQuota;
      view.phase = won ? "won" : "lost";
      view.result = {
        won,
        quota: view.teamQuota,
        score: view.teamScore,
        ranking: [...view.players]
          .sort((a, b) => b.score - a.score)
          .map((player) => ({
            seat: player.seat,
            score: player.score,
            caught: 0,
          })),
      };
      log(
        view,
        won ? "全队完成矿脉目标，升井！" : "团队没有完成矿脉目标。",
      );
      return view;
    }
    view.phase = "map";
    view.votes = {};
    view.ready = [];
    log(view, "回到矿道，选择下一处矿点。");
    return view;
  }
}
