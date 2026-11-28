import {
  firstHookContact,
  hookReach,
  isMinerShop,
  MAX_SWING,
} from "./geometry";
import type { NodeKind } from "../expedition/adventure-types";
import { Strategy } from "../strategy";
import type { SearchRequest } from "../strategy";
import type { Candidate, DecisionCandidate } from "../types";
import { minerObjects, minerPerks } from "./content";
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

function dropValue(
  observation: MinerGameState,
  actor: number,
  angle: number,
): number {
  const view = observation.view;
  if (!view.node) return 0;
  const player = view.players[actor]!;
  const hook = { angle, pivotX: player.hook.pivotX };
  const target = firstHookContact(hook, 0, hookReach(hook), view.node)?.object;
  if (!target) return 0;
  const definition = minerObjects[target.kind];
  return (
    target.value / (1 + target.weight * 0.5) +
    (definition.charge ?? 0) * 34 +
    (definition.timeChangeMs ?? 0) / 60 -
    Math.abs(player.hook.angle - angle) * 1.5
  );
}

function moveScore(
  observation: MinerGameState,
  actor: number,
  move: MinerMove,
): number {
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
    if (isMinerShop(view.phase)) return move.offer ? 48 : -100;
    if (!view.node) return 0;
    return Math.max(0, dropValue(observation, actor, move.angle));
  }
  if (move.type === "special") return 70;
  if (move.type === "haul") return 45;
  if (move.type === "buy-perk") {
    const cost = minerPerks[move.perkId].cost;
    return view.mode === "endless" || cost <= (view.players[actor]?.coins ?? 0)
      ? 55
      : -20;
  }
  if (isMinerShop(view.phase) && move.type === "ready") return 40;
  if (move.type === "spin") return 35;
  if (move.type === "team-gamble") return 25;
  if (move.type === "use-item") {
    if (move.itemId === "dynamite") return 20;
    if (move.itemId === "time") return 40;
    if (move.itemId === "lucky" || move.itemId === "rockBook") return 30;
    return 25;
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
    const candidates = super.candidates(request);
    if (request.observation.kind !== "miner") return candidates;
    const { view } = request.observation;
    const drop = candidates.find(
      ({ action }) =>
        action.type === "miner-action" && action.move.type === "drop",
    );
    if (view.phase !== "live" || !drop) return candidates;
    const player = view.players[request.actor]!;
    if (player.hook.phase !== "swing") return candidates;
    const angle = player.hook.angle;
    const offsets = {
      easy: [0, -7, 7],
      normal: [0, -4, 4, -8, 8],
      hard: [0, -3, 3, -6, 6, -10, 10, -14, 14],
    }[request.difficulty];
    const angles = new Set(
      offsets.map((offset) =>
        Math.max(-MAX_SWING, Math.min(MAX_SWING, Math.round(angle + offset))),
      ),
    );
    const aimed = Array.from(angles)
      .map((value) => ({ angle: value, value: dropValue(request.observation as MinerGameState, request.actor, value) }))
      .filter(({ value }) => value >= 8)
      .sort((a, b) => b.value - a.value);
    if (!aimed.length) return candidates.filter((candidate) => candidate !== drop);
    return [
      ...candidates.filter((candidate) => candidate !== drop),
      ...aimed.map(({ angle }): Candidate => ({
        action: { type: "miner-action", move: { type: "drop", angle } },
        label: `${angle}°`,
      })),
    ];
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
