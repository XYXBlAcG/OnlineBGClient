import type { GameOptions } from "../game-options";
import type { Rules } from "../plugin";
import type { Action, Candidate } from "../types";
import type { MapNode } from "../expedition/adventure-types";
import {
  minerCharacters,
  minerItemPool,
  minerItems,
  minerMechanicsPool,
  minerPerkPool,
  minerPerks,
  minerObjects,
} from "./content";
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
  MinerPerkId,
  MinerPlayerView,
  MinerView,
} from "./types";

const TICK_MS = 120;
const MAX_LENGTH = 1.02;
const PIVOT_Y = 0.1;
const SWING_SPEED = 58;
const SHOOT_SPEED = 1.45;
const BASE_REEL = 0.82;

function makePlayer(seat: number, players: number): MinerPlayerView {
  return {
    seat,
    score: 0,
    coins: 0,
    items: {},
    hook: {
      phase: "swing",
      angle: (seat % 2 ? 1 : -1) * 32,
      pivotX:
        players <= 1
          ? 0.5
          : 0.14 + (seat / (players - 1)) * 0.72,
      direction: seat % 2 ? -1 : 1,
      length: 0,
      targetId: null,
      nextBeatTick: 0,
    },
    character: "miner",
    specialCharge: 0,
    specialTicks: 0,
    strengthTicks: 0,
    ropeNext: false,
    lucky: false,
    rockBook: false,
    luckyStartUsed: false,
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

function perkCount(view: MinerView, id: MinerPerkId): number {
  return view.perks.filter((perk) => perk === id).length;
}

function specialRequired(player: MinerPlayerView, view: MinerView): number {
  return Math.max(
    1,
    minerCharacters[player.character].charge - perkCount(view, "specialist"),
  );
}

function shopPrice(view: MinerView, cost: number): number {
  return Math.max(
    1,
    Math.floor(cost * (1 - 0.15 * perkCount(view, "deepPockets"))),
  );
}

function perkOffers(random: () => number): MinerPerkId[] {
  const pool = [...minerPerkPool];
  return Array.from({ length: 3 }, () => {
    const index = Math.floor(random() * pool.length);
    return pool.splice(index, 1)[0]!;
  });
}

function rayHit(
  hook: MinerPlayerView["hook"],
  previous: number,
  next: number,
  node: MinerMineNode,
): MinerObject | undefined {
  const radians = (hook.angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = Math.cos(radians);
  let nearest: MinerObject | undefined;
  let nearestT = Infinity;
  for (const object of node.objects) {
    if (object.removed || object.hookedBy !== null) continue;
    if (node.waterLevel > 0 && object.y > node.waterLevel) continue;
    const ox = object.x - hook.pivotX;
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
  let value = object.phantom ? 0 : object.value;
  if (view.node?.mechanics.includes("goldFever") && view.tick % 150 < 40)
    value *= 2;
  value = Math.floor(value * (1 + perkCount(view, "goldTouch") * 0.1));
  if (
    (object.kind === "rockSmall" || object.kind === "rockLarge") &&
    perkCount(view, "rockSong") > 0
  )
    value *= 2 ** perkCount(view, "rockSong");
  if (perkCount(view, "luckyStart") > 0 && !player.luckyStartUsed) {
    value *= 2;
    player.luckyStartUsed = true;
  }
  if (object.kind === "rockSmall" || object.kind === "rockLarge")
    value *= player.rockBook ? 2 : 1;
  if (player.lucky) {
    value = Math.floor(value * 1.5);
    player.lucky = false;
  }
  player.score += value;
  player.coins += value;
  view.teamScore += value;
  view.teamScores[view.teams[player.seat] ?? 0] += value;
  if (
    (object.kind === "goldSmall" ||
      object.kind === "goldMedium" ||
      object.kind === "goldLarge") &&
    value > 0
  )
    player.specialCharge++;
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
  const quick =
    (player.character === "miner" && player.specialTicks > 0) ||
    perkCount(view, "quickHook") > 0;
  if (hook.phase === "swing") {
    hook.angle += hook.direction * SWING_SPEED * (quick ? 1.8 : 1) * dt;
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
    hook.length = Math.min(
      MAX_LENGTH,
      hook.length + SHOOT_SPEED * (quick ? 1.5 : 1) * dt,
    );
    const hit = rayHit(hook, previous, hook.length, node);
    if (hit?.frozen) {
      hit.frozen = false;
      hook.phase = "reel";
      hook.targetId = null;
      setLastAction(
        view,
        player.seat,
        "thaw",
        `玩家 ${player.seat + 1} 的钩子敲碎了冰层。`,
      );
    } else if (hit) {
      hit.hookedBy = player.seat;
      hook.targetId = hit.id;
      hook.phase = "reel";
      hook.nextBeatTick =
        minerObjects[hit.kind].weight >= 4 ? view.tick + 5 : 0;
      hook.length = Math.max(
        0.08,
        Math.min(
          MAX_LENGTH,
          (hit.x - hook.pivotX) * Math.sin((hook.angle * Math.PI) / 180) +
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
  const rawWeight = target ? minerObjects[target.kind].weight : 0;
  const weight =
    player.character === "strongman" && player.specialTicks > 0
      ? 0
      : rawWeight;
  const strength = player.strengthTicks > 0 ? 1.9 : 1;
  const rope = player.ropeNext ? 4 : 1;
  player.ropeNext = false;
  const speed =
    (BASE_REEL *
      strength *
      rope *
      (quick ? 1.25 : 1) *
      (1 + perkCount(view, "strongRope") * 0.2) *
      (rawWeight >= 4 ? 1 + perkCount(view, "thickRope") * 0.25 : 1)) /
    (1 + weight * 0.45);
  hook.length = Math.max(0, hook.length - speed * dt);
  if (hook.length <= 0.001) {
    if (target) collect(view, player, target);
    else {
      hook.phase = "swing";
      hook.length = 0;
      hook.targetId = null;
      hook.nextBeatTick = 0;
    }
  }
}

function advanceMechanics(view: MinerView, node: MinerMineNode): void {
  const dt = TICK_MS / 1000;
  if (node.crittersStoppedTicks > 0) node.crittersStoppedTicks--;
  if (node.freezeTicks > 0) {
    node.freezeTicks--;
    return;
  }
  if (node.mechanics.includes("flood"))
    node.waterLevel = Math.min(0.82, node.waterLevel + 0.0015);
  if (node.mechanics.includes("tide"))
    node.waterLevel = 0.42 + Math.sin(view.tick / 18) * 0.26;
  for (const [index, object] of node.objects.entries()) {
    if (object.removed) continue;
    if (object.kind === "critter") {
      if (node.crittersStoppedTicks > 0) continue;
      object.x += (index % 2 ? 1 : -1) * 0.05 * dt;
      object.y += Math.sin((view.tick + index) / 5) * 0.002;
    } else if (node.mechanics.includes("minecart")) {
      object.x += 0.075 * dt;
    } else if (node.mechanics.includes("conveyor")) {
      object.x += (index % 2 ? 1 : -1) * 0.035 * dt;
    } else if (node.mechanics.includes("zeroGravity")) {
      object.y += Math.sin((view.tick + index) / 6) * 0.0025;
      object.x += Math.cos((view.tick + index) / 9) * 0.0015;
    }
    if (node.mechanics.includes("fallingRocks"))
      object.y += 0.006 * dt;
    if (node.mechanics.includes("magnet")) {
      object.x += (0.5 - object.x) * 0.012 * dt;
      object.y += (0.45 - object.y) * 0.008 * dt;
    }
    if (node.mechanics.includes("geyser") && view.tick % 55 < 8)
      object.y -= 0.016 * dt;
    if (object.x < 0.07) object.x = 0.07;
    if (object.x > 0.93) object.x = 0.93;
    if (object.y < 0.16) object.y = 0.16;
    if (object.y > 0.92) object.y = 0.92;
  }
}

export class MinerRules implements Rules<"miner"> {
  constructor(private readonly random: () => number) {}

  create(
    players: number,
    team: boolean,
    options?: GameOptions,
  ): MinerGameState {
    const mode = options?.miner?.mode ?? "friendly";
    const seed =
      mode === "daily"
        ? `daily-${new Date().toISOString().slice(0, 10)}`
        : `${this.random()}:${this.random()}`;
    const map = generateMinerMap(seed);
    const teamMode = team && (players === 4 || players === 6);
    const view: MinerView = {
      phase: "character",
      map,
      floor: 0,
      current: null,
      path: [],
      node: null,
      votes: {},
      characterChoices: {},
      ready: [],
      shopSpinsUsed: [],
      teamGambleUsed: false,
      perkOffers: [],
      perkBought: false,
      perks: [],
      players: Array.from({ length: players }, (_, seat) =>
        makePlayer(seat, players),
      ),
      mode,
      teamQuota: options?.miner?.quota ?? 2500 + players * 2200,
      teamScore: 0,
      matchLevels:
        mode === "suddenDeath" ? 3 : (options?.miner?.levels ?? 6),
      levelsPlayed: 0,
      teams: teamMode
        ? Array.from({ length: players }, (_, seat) => seat % 2)
        : Array.from({ length: players }, () => 0),
      teamScores: [0, 0],
      lives: mode === "endless" ? 3 : 0,
      levelTarget:
        mode === "endless" ? 500 + players * 250 : 0,
      levelScore: 0,
      tick: 0,
      log: [],
      sequence: 0,
    };
    log(view, `矿灯亮起，${players} 名矿工选择角色。目标：${view.teamQuota}。`);
    return { kind: "miner", view };
  }

  finished(state: MinerGameState): boolean {
    return state.view.phase === "won" || state.view.phase === "lost";
  }

  actors(state: MinerGameState): number[] {
    const view = state.view;
    if (this.finished(state)) return [];
    if (view.phase === "character")
      return view.players
        .map((player) => player.seat)
        .filter((seat) => !(seat in view.characterChoices));
    if (view.phase === "map")
      return view.players
        .map((player) => player.seat)
        .filter((seat) => !(seat in view.votes));
    if (view.phase === "live") return view.players.map((player) => player.seat);
    if (
      view.phase === "intermission" ||
      view.phase === "shop" ||
      view.phase === "camp" ||
      view.phase === "event"
    )
      return view.players
        .map((player) => player.seat)
        .filter((seat) => !view.ready.includes(seat));
    return [];
  }

  candidates(state: MinerGameState, actor: number): Candidate[] {
    const view = state.view;
    if (this.finished(state)) return [];
    if (view.phase === "character") {
      if (actor in view.characterChoices) return [];
      return Object.values(minerCharacters).map((character) => ({
        action: {
          type: "miner-action" as const,
          move: { type: "character" as const, character: character.id },
        },
        label: `${character.name} · ${character.special}`,
      }));
    }
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
      if (
        player.specialCharge >= specialRequired(player, view) &&
        (player.character !== "merchant" || player.hook.targetId !== null)
      )
        result.push({
          action: { type: "miner-action", move: { type: "special" } },
          label: minerCharacters[player.character].special,
        });
      if (
        player.hook.phase === "reel" &&
        player.hook.targetId &&
        (view.node?.objects.find(
          (object) => object.id === player.hook.targetId,
        )?.weight ?? 0) >= 4
      )
        result.push({
          action: { type: "miner-action", move: { type: "haul" } },
          label: "节拍拉钩",
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
    if (view.phase === "shop" || view.phase === "intermission") {
      return [
        ...Object.values(minerItems)
          .filter((item) => player.coins >= shopPrice(view, item.cost))
          .map((item) => ({
            action: {
              type: "miner-action" as const,
              move: { type: "buy" as const, itemId: item.id },
            },
            label: `购买${item.name}（${shopPrice(view, item.cost)}）`,
          })),
        ...(view.shopSpinsUsed.includes(actor)
          ? []
          : [
              {
                action: {
                  type: "miner-action" as const,
                  move: { type: "spin" as const },
                },
                label: "老虎机（50 金币）",
              },
            ]),
        ...(!view.perkBought
          ? view.perkOffers.map((perkId) => ({
              action: {
                type: "miner-action" as const,
                move: { type: "buy-perk" as const, perkId },
              },
              label: `${minerPerks[perkId].emoji} ${minerPerks[perkId].name}（${minerPerks[perkId].cost}）`,
            }))
          : []),
        ...(view.teamGambleUsed
          ? []
          : [
              {
                action: {
                  type: "miner-action" as const,
                  move: { type: "team-gamble" as const },
                },
                label: "Team Gamble",
              },
            ]),
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
    if (view.phase === "character")
      return view.players.every((player) => player.seat in view.characterChoices);
    if (view.phase === "map")
      return view.players.every((player) => player.seat in view.votes);
    if (
      view.phase === "intermission" ||
      view.phase === "shop" ||
      view.phase === "camp" ||
      view.phase === "event"
    )
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
    if (state.view.phase === "character" && action.move.type === "character")
      return `miner-character-${state.view.tick}`;
    if (state.view.phase === "live") return "miner-live";
    if (state.view.phase === "map" && action.move.type === "vote")
      return `miner-vote-${state.view.floor}`;
    if (
      (state.view.phase === "intermission" ||
        state.view.phase === "shop" ||
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
    if (view.phase === "character") {
      if (move.type !== "character") throw new Error("请选择角色");
      if (actor in view.characterChoices) throw new Error("已经选过角色");
      view.characterChoices[actor] = move.character;
      setLastAction(
        view,
        actor,
        "character",
        `玩家 ${actor + 1} 选择了${minerCharacters[move.character].name}。`,
      );
      return { kind: "miner", view };
    }
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
      if (move.type === "special") {
        this.useSpecial(view, actor);
        return { kind: "miner", view };
      }
      if (move.type === "haul") {
        this.haul(view, actor);
        return { kind: "miner", view };
      }
      throw new Error("实时矿洞只能下钩、使用道具或释放 Special");
    }
    if (view.phase === "shop" || view.phase === "intermission") {
      if (move.type === "buy") {
        const item = minerItems[move.itemId];
        const price = shopPrice(view, item.cost);
        if (player.coins < price) throw new Error("金币不足");
        player.coins -= price;
        player.items[move.itemId] = (player.items[move.itemId] ?? 0) + 1;
        setLastAction(
          view,
          actor,
          "buy",
          `玩家 ${actor + 1} 购买了${item.name}。`,
        );
        return { kind: "miner", view };
      }
      if (move.type === "spin") {
        this.spin(view, actor);
        return { kind: "miner", view };
      }
      if (move.type === "team-gamble") {
        this.teamGamble(view, actor);
        return { kind: "miner", view };
      }
      if (move.type === "buy-perk") {
        if (view.perkBought || !view.perkOffers.includes(move.perkId))
          throw new Error("该天赋不可购买");
        const price =
          view.mode === "endless" ? 0 : minerPerks[move.perkId].cost;
        if (player.coins < price) throw new Error("金币不足");
        player.coins -= price;
        view.perks.push(move.perkId);
        view.perkBought = true;
        setLastAction(
          view,
          actor,
          "perk",
          `团队获得天赋：${minerPerks[move.perkId].name}。`,
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
    if (view.phase === "character")
      return { kind: "miner", view: this.resolveCharacter(view) };
    if (view.phase === "map") return { kind: "miner", view: this.resolveVote(view) };
    if (view.phase === "live") return { kind: "miner", view: this.tick(view) };
    if (view.phase === "intermission")
      return { kind: "miner", view: this.finishIntermission(view) };
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
    if (itemId === "freeze" && view.node)
      view.node.freezeTicks = Math.ceil(6_000 / TICK_MS);
    setLastAction(
      view,
      actor,
      "item",
      `玩家 ${actor + 1} 使用了${minerItems[itemId].name}。`,
    );
  }

  private resolveCharacter(view: MinerView): MinerView {
    for (const player of view.players) {
      const character = view.characterChoices[player.seat];
      if (!character) throw new Error("角色选择无效");
      player.character = character;
    }
    view.phase = "map";
    view.characterChoices = {};
    view.votes = {};
    log(view, "矿工们带着各自的特长下井。");
    return view;
  }

  private useSpecial(view: MinerView, actor: number): void {
    const player = view.players[actor]!;
    const character = minerCharacters[player.character];
    if (player.specialCharge < specialRequired(player, view))
      throw new Error("Special 尚未充能");
    if (player.character === "merchant") {
      const target = view.node?.objects.find(
        (object) => object.id === player.hook.targetId,
      );
      if (!target) throw new Error("钩子上没有物体");
      collect(view, player, target);
    } else {
      player.specialTicks = Math.ceil(
        (player.character === "strongman" ? 10_000 : 8_000) / TICK_MS,
      );
      if (player.character === "beastTamer" && view.node)
        view.node.crittersStoppedTicks = Math.ceil(6_000 / TICK_MS);
      setLastAction(
        view,
        actor,
        "special",
        `玩家 ${actor + 1} 释放${character.special}。`,
      );
    }
    player.specialCharge = 0;
  }

  private haul(view: MinerView, actor: number): void {
    const player = view.players[actor]!;
    const target = view.node?.objects.find(
      (object) => object.id === player.hook.targetId,
    );
    if (!target || target.weight < 4) throw new Error("没有需要节拍的重物");
    if (Math.abs(view.tick - player.hook.nextBeatTick) <= 1) {
      player.hook.length = Math.max(0, player.hook.length - 0.18);
      player.hook.nextBeatTick = view.tick + 6;
      setLastAction(view, actor, "haul", `玩家 ${actor + 1} 踩准节拍，重物加速。`);
    } else {
      setLastAction(view, actor, "haul", `玩家 ${actor + 1} 节拍失误。`);
    }
  }

  private spin(view: MinerView, actor: number): void {
    if (view.shopSpinsUsed.includes(actor)) throw new Error("已经转过老虎机");
    const player = view.players[actor]!;
    if (player.coins < 50) throw new Error("金币不足");
    player.coins -= 50;
    view.shopSpinsUsed.push(actor);
    const roll = this.random();
    if (roll < 0.12) {
      const item = minerItemPool[Math.floor(this.random() * minerItemPool.length)]!;
      player.items[item] = (player.items[item] ?? 0) + 1;
      setLastAction(view, actor, "spin", `老虎机中奖：${minerItems[item].name}。`);
    } else if (roll < 0.55) {
      player.coins += 80;
      setLastAction(view, actor, "spin", "老虎机：回收 80 金币。");
    } else if (roll < 0.85) {
      player.coins += 150;
      setLastAction(view, actor, "spin", "老虎机：+150 金币。");
    } else {
      setLastAction(view, actor, "spin", "老虎机：什么都没中。");
    }
  }

  private teamGamble(view: MinerView, _actor: number): void {
    if (view.teamGambleUsed) throw new Error("本商店已经赌过");
    view.teamGambleUsed = true;
    const wager = Math.max(100, Math.floor(view.teamScore * 0.15));
    if (this.random() < 0.5) {
      view.teamScore += wager;
      setLastAction(view, -1, "gamble", `Team Gamble 成功，团队 +${wager}。`);
    } else {
      view.teamScore = Math.max(0, view.teamScore - wager);
      setLastAction(view, -1, "gamble", `Team Gamble 失败，团队 -${wager}。`);
    }
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
    view.shopSpinsUsed = [];
    view.teamGambleUsed = false;
    const scene =
      view.mode === "bossRush" ? { ...node, kind: "boss" as const } : node;
    view.node = createNode(scene, view.players.length, this.random);
    if (view.mode === "suddenDeath") {
      view.node.durationMs = 25_000;
      view.node.timeLeftMs = 25_000;
    }
    if (view.mode === "party") {
      const extra =
        minerMechanicsPool[
          Math.floor(this.random() * minerMechanicsPool.length)
        ]!;
      if (view.node.scene === "mine" && !view.node.mechanics.includes(extra))
        view.node.mechanics.push(extra);
    }
    view.node.durationMs += perkCount(view, "timeWarp") * 8_000;
    view.node.timeLeftMs = view.node.durationMs;
    if (view.node.scene === "mine") view.levelScore = view.teamScore;
    view.perkOffers =
      view.node.scene === "shop" ? perkOffers(this.random) : [];
    view.perkBought = false;
    for (const player of view.players) {
      player.luckyStartUsed = false;
      if (view.node.scene === "mine" && perkCount(view, "blastStart") > 0)
        player.items.dynamite =
          (player.items.dynamite ?? 0) + perkCount(view, "blastStart");
    }
    view.phase =
      view.node.scene === "mine"
        ? "live"
        : view.node.scene === "shop"
          ? "shop"
          : view.node.scene === "camp"
            ? "camp"
            : "event";
    for (const player of view.players) {
      player.specialTicks = 0;
      player.hook = {
        phase: "swing",
        angle: (player.seat % 2 ? 1 : -1) * 32,
        pivotX: player.hook.pivotX,
        direction: player.seat % 2 ? -1 : 1,
        length: 0,
        targetId: null,
        nextBeatTick: 0,
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
    advanceMechanics(view, node);
    for (const player of view.players) {
      if (player.strengthTicks > 0) player.strengthTicks--;
      if (player.specialTicks > 0) player.specialTicks--;
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
    const node = view.node;
    view.node = null;
    view.ready = [];
    if (node?.scene === "mine") {
      const levelScore = view.teamScore - view.levelScore;
      view.levelScore = view.teamScore;
      view.levelsPlayed++;
      if (view.mode === "endless") {
        if (levelScore < view.levelTarget) {
          view.lives--;
          log(
            view,
            `本关 ${levelScore} 未达到目标 ${view.levelTarget}，失去 1 条命。`,
          );
          if (view.lives <= 0) return this.finalResult(view);
        } else {
          log(view, `本关 ${levelScore} 达标，继续深入。`);
        }
        view.levelTarget = Math.ceil(view.levelTarget * 1.18);
      } else if (view.levelsPlayed >= view.matchLevels) {
        return this.finalResult(view);
      }
      view.phase = "intermission";
      view.node = {
        id: `intermission-${view.levelsPlayed}`,
        sourceKind: "shop",
        scene: "shop",
        name: "关间商店",
        objects: [],
        mechanics: [],
        durationMs: 0,
        timeLeftMs: 0,
        waterLevel: 0,
        crittersStoppedTicks: 0,
        freezeTicks: 0,
      };
      view.shopSpinsUsed = [];
      view.teamGambleUsed = false;
      view.perkOffers = perkOffers(this.random);
      view.perkBought = false;
      log(view, `第 ${view.levelsPlayed} 关结束，进入关间商店。`);
      return view;
    }
    return this.continueMap(view);
  }

  private finishIntermission(view: MinerView): MinerView {
    view.node = null;
    view.ready = [];
    return this.continueMap(view);
  }

  private continueMap(view: MinerView): MinerView {
    const current = view.map.flat().find((node) => node.id === view.current);
    const choices = current ? mapChoices(view) : [];
    if (!current || choices.length === 0 || current.floor >= view.map.length - 1) {
      if (view.mode === "endless") {
        view.map = generateMinerMap(`${this.random()}:${this.random()}`);
        view.current = null;
        view.floor = 0;
        view.path = [];
        view.phase = "map";
        view.votes = {};
        view.ready = [];
        log(view, "矿道更深了，新的矿层出现。");
        return view;
      }
      return this.finalResult(view);
    }
    view.phase = "map";
    view.votes = {};
    view.ready = [];
    log(view, "回到矿道，选择下一处矿点。");
    return view;
  }

  private finalResult(view: MinerView): MinerView {
    const teamMode = view.teams.some((team) => team !== view.teams[0]);
    const won = !teamMode && view.teamScore >= view.teamQuota;
    const winningTeam: 0 | 1 | undefined =
      teamMode && view.teamScores[0] !== view.teamScores[1]
        ? view.teamScores[0] > view.teamScores[1]
          ? 0
          : 1
        : teamMode
          ? 0
          : undefined;
    view.phase = won || (teamMode && winningTeam !== undefined) ? "won" : "lost";
    view.result = {
      won,
      mode: view.mode,
      quota: view.teamQuota,
      score: view.teamScore,
      ranking: [...view.players]
        .sort((a, b) => b.score - a.score)
        .map((player) => ({
          seat: player.seat,
          score: player.score,
          caught: 0,
        })),
      ...(teamMode
        ? { teamScores: view.teamScores, winningTeam }
        : {}),
      ...(view.mode === "endless" ? { lives: view.lives } : {}),
    };
    log(
      view,
      teamMode
        ? `对局结束，${winningTeam === 0 ? "A" : "B"} 队获胜。`
        : won
          ? "全队完成矿脉目标，升井！"
          : "团队没有完成矿脉目标。",
    );
    return view;
  }
}
