import Majiang from "@kobalab/majiang-core";
import { tileType, type MahjongView } from "./types";

const { Shoupai, Util } = Majiang;
export function riichiTile(tile: number): string {
  const type = tileType(tile);
  return type < 27
    ? `${"mps"[Math.floor(type / 9)]}${(type % 9) + 1}`
    : `z${type - 26}`;
}

export function riichiHand(
  view: MahjongView,
  actor: number,
  tiles = view.hands[actor],
  drawn?: number,
) {
  const counts = Array.from({ length: 34 }, () => 0);
  for (const tile of tiles)
    if (tile >= 0 && tile !== drawn) counts[tileType(tile)]++;
  const closed =
    ["m", "p", "s", "z"]
      .map(
        (suit, i) =>
          suit +
          counts
            .slice(i * 9, i * 9 + 9)
            .map((count, n) => String(n + 1).repeat(count))
            .join(""),
      )
      .join("") + (drawn === undefined ? "" : riichiTile(drawn));
  const melds = view.melds[actor].map((meld) => {
    const codes = meld.tiles.map(riichiTile);
    const direction = "_+=-"[(meld.from - actor + 4) % 4];
    if (meld.type === "closed")
      return codes[0][0] + codes.map((code) => code[1]).join("");
    if (meld.type === "added")
      return codes[0][0] + codes[0][1].repeat(3) + direction + codes[0][1];
    if (meld.type !== "chi")
      return codes[0][0] + codes[0][1].repeat(codes.length) + direction;
    const claimed = meld.tiles[0];
    const ordered = [...meld.tiles].sort((a, b) => a - b);
    return (
      codes[0][0] +
      ordered
        .map(
          (tile) => riichiTile(tile)[1] + (tile === claimed ? direction : ""),
        )
        .join("")
    );
  });
  return Shoupai.fromString([closed, ...melds].join(","));
}

export function riichiDistance(
  view: MahjongView,
  actor: number,
  tiles: number[],
) {
  return Util.xiangting(riichiHand(view, actor, tiles));
}

export function riichiEffectiveTiles(
  view: MahjongView,
  actor: number,
  tiles: number[],
) {
  return Util.tingpai(riichiHand(view, actor, tiles)) ?? [];
}

export function riichiWaits(
  view: MahjongView,
  actor: number,
  tiles = view.hands[actor],
) {
  const hand = riichiHand(view, actor, tiles);
  return Util.xiangting(hand) === 0 ? (Util.tingpai(hand) ?? []) : [];
}

export function riichiWin(
  view: MahjongView,
  actor: number,
  self: boolean,
  sticks = 0,
) {
  const round = view.riichi!;
  const pending = view.pending;
  const drawn =
    self && view.lastDraw?.actor === actor ? view.lastDraw.tile : undefined;
  if (self ? drawn === undefined : !pending || pending.actor === actor)
    return null;
  const waits = self ? [] : riichiWaits(view, actor);
  if (
    !self &&
    (round.furiten[actor] ||
      round.discardedTypes[actor].some((type) =>
        waits.includes(riichiTile(type * 4)),
      ) ||
      !waits.includes(riichiTile(pending!.tile)))
  )
    return null;
  const hand = riichiHand(view, actor, view.hands[actor], drawn);
  const direction = "_+=-"[((pending?.actor ?? actor) - actor + 4) % 4];
  const result = Util.hule(
    hand,
    self ? null : riichiTile(pending!.tile) + direction,
    Util.hule_param({
      menfeng: actor,
      lizhi: round.ready[actor] ? 1 : 0,
      yifa: round.ippatsu[actor],
      qianggang: !self && !!pending?.rob,
      lingshang: self && !!view.lastDraw?.kong,
      haidi:
        view.wall.length === 0 && !pending?.rob && !view.lastDraw?.kong
          ? self
            ? 1
            : 2
          : 0,
      baopai: round.dora.map(riichiTile),
      fubaopai: round.ready[actor]
        ? round.dora
            .map((_, index) => round.deadWall[5 + index * 2])
            .filter((tile) => tile !== undefined)
            .map(riichiTile)
        : undefined,
      lizhibang: sticks,
    }),
  );
  return result?.hupai && result.defen && result.fenpei
    ? {
        fan: result.fanshu ?? (result.damanguan ?? 0) * 13,
        fu: result.fu,
        labels: result.hupai.map((yaku) => yaku.name),
        value: result.defen,
        payments: result.fenpei,
      }
    : null;
}
