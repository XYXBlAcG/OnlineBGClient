import type { Action } from "./actions";
import type { CatanView, CatanMove } from "./catan-actions";
export function catanIntent(
  previous: CatanView,
  next: CatanView & { lastOp?: CatanView["lastOp"] & { resource?: number } },
  actor: number,
  ops: Record<string, number>,
): Action {
  let move: CatanMove;
  const op = next.lastOp;
  if (
    !op &&
    ((next.actionRequest || 0) ^ (previous.actionRequest || 0)) ===
      1 << actor &&
    (next.actionRequest || 0) & (1 << actor) &&
    next.state === previous.state &&
    next.lastDice === previous.lastDice &&
    next.devCard === previous.devCard
  )
    move = { kind: "request-build" };
  else if (
    previous.actionRequest &&
    next.actionRequest !== previous.actionRequest &&
    op?.type === ops.RollDice
  ) {
    move = {
      kind: "discard",
      resources: previous.playerData[actor].resources.map(
        (value, index) => value - next.playerData[actor].resources[index],
      ),
    };
  } else if (
    op?.type === ops.PutHouse ||
    op?.type === ops.BuyHouse ||
    op?.type === ops.BuyCity
  ) {
    move = {
      kind: "build",
      building: op.house! & 1 ? "city" : "house",
      id: op.house!,
    };
  } else if (op?.type === ops.PutRoad || op?.type === ops.BuyRoad) {
    move =
      next.playerData[actor].cards[1] < previous.playerData[actor].cards[1]
        ? { kind: "road-card", id: op.road! }
        : { kind: "build", building: "road", id: op.road! };
  } else if (op?.type === ops.RollDice) move = { kind: "roll" };
  else if (op?.type === ops.MoveRobber || op?.type === ops.UseCardKnight)
    move = {
      kind: "robber",
      tile: op.to!,
      target: op.withPlayerId ?? -1,
      knight: op.type === ops.UseCardKnight,
    };
  else if (op?.type === ops.BuyDevCard) move = { kind: "buy-dev" };
  else if (op?.type === ops.UseCardResources)
    move = { kind: "abundance", resources: op.needs! };
  else if (op?.type === ops.UseCardMonopoly)
    move = { kind: "monopoly", resource: op.resource! };
  else if (op?.type === ops.ExchangeWithBank)
    move = { kind: "bank", give: op.costs!, take: op.needs! };
  else if (op?.type === ops.ExchangeWithPlayer)
    move = { kind: "respond", accept: true };
  else if (next.exchangeData)
    move = previous.exchangeData
      ? { kind: "respond", accept: false }
      : {
          kind: "trade",
          give: next.exchangeData.costs,
          take: next.exchangeData.needs,
          targets: next.exchangeData.responses.flatMap((response, index) =>
            response === 1 ? [index] : [],
          ),
        };
  else if (
    previous.exchangeData &&
    next.lastDice === previous.lastDice &&
    next.state === previous.state
  )
    move = { kind: "cancel-trade" };
  else if (
    next.actionRequest !== previous.actionRequest &&
    next.lastDice === previous.lastDice &&
    next.state === previous.state &&
    next.devCard === previous.devCard
  )
    move = { kind: "request-build" };
  else if (!op && !next.lastDice) move = { kind: "end" };
  else throw new Error("无法识别卡坦岛操作");
  return { type: "ktd-action", move };
}
