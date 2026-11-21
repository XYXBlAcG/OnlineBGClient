import { Strategy } from "../strategy";
import type { SearchRequest } from "../strategy";
import type { Candidate, DecisionCandidate } from "../types";
import { minerContracts, minerItems } from "./content";
import type { MinerGameState, MinerMove } from "./types";

function moveScore(observation: MinerGameState, actor: number, move: MinerMove): number {
  const view = observation.view;
  if (move.type === "contract") {
    const contract = minerContracts[move.contractId];
    return contract.kind === "curse" ? 30 : 60;
  }
  if (move.type === "vote") {
    const node = view.map[view.floor]?.find((item) => item.id === move.nodeId);
    return (
      {
        vault: 100,
        guardian: 90,
        rich: 85,
        crystal: 80,
        contested: 70,
        common: 65,
        shop: 55,
        rest: 45,
        event: 35,
        hazard: 20,
        entrance: 10,
        exit: 5,
      }[node?.kind ?? "common"] ?? 0
    );
  }
  if (move.type === "mine") {
    const deposit = view.node?.deposits.find(
      (item) => item.id === move.depositId,
    );
    if (!deposit) return -100;
    const player = view.players[actor]!;
    const gem = deposit.gem?.value ?? 0;
    const room = player.bag.length < player.capacity ? 20 : -40;
    return (
      100 +
      room +
      (deposit.owner === actor ? 40 : 0) +
      deposit.progress +
      gem
    );
  }
  if (move.type === "steal") {
    const deposit = view.node?.deposits.find(
      (item) => item.id === move.depositId,
    );
    return deposit ? 65 + deposit.progress * 0.8 + (deposit.gem?.value ?? 0) : 0;
  }
  if (move.type === "rest") return 80;
  if (move.type === "event") return move.choice === "gamble" ? 55 : 70;
  if (move.type === "use-item")
    return minerItems[move.itemId].category === "consumable" ? 60 : 30;
  if (move.type === "use-relic") return 62;
  return 5;
}

export class MinerStrategy extends Strategy {
  static readonly version = "miner-heuristic-1";
  readonly version = MinerStrategy.version;
  budget(): { samples: number; depth: number; shortlist: number } {
    return { samples: 0, depth: 0, shortlist: 0 };
  }
  protected override evaluate(
    observation: MinerGameState,
    actor: number,
    candidate: Candidate,
    _seed: string,
    _audit = true,
  ): DecisionCandidate {
    const action = candidate.action;
    if (action.type !== "miner-action")
      return { ...candidate, score: -100, features: [] };
    const score = moveScore(observation, actor, action.move);
    return {
      ...candidate,
      score,
      features: [
        {
          name: "矿工启发式收益",
          value: score,
          weight: 1,
          contribution: score,
        },
      ],
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
