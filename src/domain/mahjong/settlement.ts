import { winningTiles } from "./hand";
import {
  tileSuit,
  type MahjongView,
  type MahjongPayment,
  type MahjongScore,
} from "./types";
export function pay(
  view: MahjongView,
  from: number,
  to: number,
  amount: number,
  reason: string,
  kind: MahjongPayment["kind"],
  ref?: number,
) {
  if (from === to || amount <= 0) return;
  view.scores[from] -= amount;
  view.scores[to] += amount;
  view.payments.push({
    from,
    to,
    amount,
    reason,
    kind,
    ...(ref === undefined ? {} : { ref }),
  });
}
export function activePlayers(view: MahjongView): number[] {
  return [0, 1, 2, 3].filter((id) => !view.wins.some((w) => w.player === id));
}
export function winPayment(
  view: MahjongView,
  player: number,
  from: number,
  tile: number,
  score: MahjongScore,
) {
  const payers =
    from === player
      ? activePlayers(view).filter((id) => id !== player)
      : [from];
  for (const payer of payers)
    pay(view, payer, player, score.value, score.labels.join("、"), "win");
  view.wins.push({ player, from, tile, ...score });
  view.events.push({ type: "win", actor: player, tiles: [tile], from });
}
export function settleDraw(view: MahjongView) {
  const alive = activePlayers(view),
    pigs = alive.filter((id) =>
      view.hands[id].some((t) => tileSuit(t) === view.lacks[id]),
    );
  for (const from of pigs)
    for (const to of alive.filter((id) => !pigs.includes(id)))
      pay(view, from, to, 2 ** view.options.cap, "查花猪", "penalty");
  const waits = new Map(
    alive
      .filter((id) => !pigs.includes(id))
      .map((id) => [
        id,
        winningTiles(
          view.hands[id],
          view.melds[id],
          view.lacks[id],
          view.options,
        ),
      ]),
  );
  const notReady = alive.filter(
    (id) => !pigs.includes(id) && !waits.get(id)?.length,
  );
  for (const from of notReady)
    for (const [to, tiles] of waits)
      if (tiles.length)
        pay(
          view,
          from,
          to,
          Math.max(...tiles.map((t) => t.score.value)),
          "查大叫",
          "penalty",
        );
  const refunds = view.payments
    .map((entry, ref) => ({ entry, ref }))
    .filter(
      ({ entry }) =>
        entry.kind === "kong" && [...pigs, ...notReady].includes(entry.to),
    );
  for (const { entry, ref } of refunds)
    pay(
      view,
      entry.to,
      entry.from,
      entry.amount,
      "未听牌退杠税",
      "refund",
      ref,
    );
  view.phase = "finished";
  view.finishedReason = "牌墙摸完，荒牌结算";
}
