import type { NodeKind } from "../expedition/adventure-types";
import { Strategy } from "../strategy";
import type { SearchRequest } from "../strategy";
import type { Candidate, DecisionCandidate } from "../types";
import { minerCharacters, minerItems } from "./content";
import { mapChoices } from "./map";
import type { MinerGameState, MinerMove } from "./types";

const kindValue: Record<NodeKind, number> = {
  boss: 100,
  treasure: 95,
  elite: 85,
  battle: 80,
  hunt: 65,
  rift: 70,
  secret: 75,
  shop: 60,
  camp: 45,
  event: 35,
  gamble: 30,
  oracle: 40,
  library: 35,
  forge: 55,
  pawnshop: 50,
  contract: 30,
  recruit: 25,
  empty: 10,
};

function angleFor(x: number, y: number): number {
  return Math.max(
    -84,
    Math.min(
      84,
      (Math.atan2(x - 0.5, y - 0.03) * 180) / Math.PI,
    ),
  );
}

function moveScore(observation: MinerGameState, actor: number, move: MinerMove): number {
  const view = observation.view;
  if (move.type === "character")
    return move.character === "strongman"
      ? 55
      : move.character === "merchant"
        ? 50
        : move.character === "beastTamer"
          ? 45
          : 40;
  if (move.type === "vote") {
    const node = mapChoices(view).find((item) => item.id === move.nodeId);
    return node ? kindValue[node.kind] : 0;
  }
  if (move.type === "drop") {
    const player = view.players[actor]!;
    const target = (view.node?.objects ?? [])
      .filter((object) => !object.removed && object.hookedBy === null)
      .map((object) => ({
        object,
        angle: angleFor(object.x, object.y),
      }))
      .sort(
        (a, b) =>
          Math.abs(a.angle - move.angle) - Math.abs(b.angle - move.angle),
      )[0]?.object;
    if (!target) return 5;
    return (
      target.value /
      (1 + target.weight * 0.5) +
      (target.kind === "diamond" ? 60 : 0) -
      (player.hook.phase === "swing" ? 0 : 200)
    );
  }
  if (move.type === "special") return 70;
  if (move.type === "haul") return 45;
  if (move.type === "spin") return 35;
  if (move.type === "team-gamble") return 25;
  if (move.type === "use-item") {
    if (move.itemId === "dynamite") return 20;
    if (move.itemId === "time") return 40;
    if (move.itemId === "lucky" || move.itemId === "rockBook") return 30;
    return 25;
  }
  if (move.type === "buy") {
    const item = minerItems[move.itemId];
    return item.cost <= (view.players[actor]?.coins ?? 0) ? 40 : -20;
  }
  if (move.type === "event") return move.choice === "risk" ? 30 : 25;
  return 10;
}

export class MinerStrategy extends Strategy {
  static readonly version = "miner-realtime-1";
  readonly version = MinerStrategy.version;
  budget(): { samples: number; depth: number; shortlist: number } {
    return { samples: 0, depth: 0, shortlist: 0 };
  }
  override candidates(request: SearchRequest): Candidate[] {
    if (request.observation.kind !== "miner")
      return super.candidates(request);
    const view = request.observation.view;
    const actor = request.actor;
    if (view.phase === "character")
      return Object.values(minerCharacters).map((character) => ({
        action: {
          type: "miner-action",
          move: { type: "character", character: character.id },
        },
        label: character.name,
      }));
    if (view.phase === "map")
      return mapChoices(view).map((node) => ({
        action: { type: "miner-action", move: { type: "vote", nodeId: node.id } },
        label: node.kind,
      }));
    if (view.phase === "live") {
      const player = view.players[actor]!;
      const candidates: Candidate[] = [];
      if (player.hook.phase === "swing") {
        const angles = new Set<number>();
        for (const object of view.node?.objects ?? []) {
          if (object.removed || object.hookedBy !== null) continue;
          angles.add(Math.round(angleFor(object.x, object.y)));
        }
        for (const angle of angles)
          candidates.push({
            action: { type: "miner-action", move: { type: "drop", angle } },
            label: `${angle}°`,
          });
      }
      if (
        player.specialCharge >= minerCharacters[player.character].charge &&
        (player.character !== "merchant" || player.hook.targetId !== null)
      )
        candidates.push({
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
        candidates.push({
          action: { type: "miner-action", move: { type: "haul" } },
          label: "haul",
        });
      for (const [itemId, count] of Object.entries(player.items)) {
        if (!count) continue;
        candidates.push({
          action: {
            type: "miner-action",
            move: { type: "use-item", itemId: itemId as keyof typeof minerItems },
          },
          label: itemId,
        });
      }
      return candidates;
    }
    if (view.phase === "shop") {
      const player = view.players[actor]!;
      return [
        ...Object.values(minerItems)
          .filter((item) => player.coins >= item.cost)
          .map((item) => ({
            action: {
              type: "miner-action" as const,
              move: { type: "buy" as const, itemId: item.id },
            },
            label: item.name,
          })),
        ...(!view.shopSpinsUsed.includes(actor) && player.coins >= 50
          ? [
              {
                action: {
                  type: "miner-action" as const,
                  move: { type: "spin" as const },
                },
                label: "spin",
              },
            ]
          : []),
        ...(!view.teamGambleUsed
          ? [
              {
                action: {
                  type: "miner-action" as const,
                  move: { type: "team-gamble" as const },
                },
                label: "gamble",
              },
            ]
          : []),
        {
          action: { type: "miner-action", move: { type: "ready" } },
          label: "离开",
        },
      ];
    }
    if (view.phase === "camp")
      return [
        {
          action: { type: "miner-action", move: { type: "ready" } },
          label: "休整",
        },
      ];
    if (view.phase === "event")
      return [
        {
          action: {
            type: "miner-action",
            move: { type: "event", choice: "risk" },
          },
          label: "赌一把",
        },
        {
          action: {
            type: "miner-action",
            move: { type: "event", choice: "safe" },
          },
          label: "稳妥",
        },
      ];
    return [];
  }
  protected override evaluate(
    observation: MinerGameState,
    actor: number,
    candidate: Candidate,
    _seed: string,
    _audit = true,
  ): DecisionCandidate {
    const action = candidate.action;
    return {
      ...candidate,
      score:
        action.type === "miner-action"
          ? moveScore(observation, actor, action.move)
          : -100,
      features: [],
    };
  }
  override score(
    request: SearchRequest,
    moves: Candidate[],
  ): DecisionCandidate[] {
    if (request.observation.kind !== "miner")
      throw new Error("矿工 AI 观测类型错误");
    return moves.map((move) =>
      this.evaluate(
        request.observation as MinerGameState,
        request.actor,
        move,
        request.seed,
        request.audit,
      ),
    );
  }
}
