import { tileSuit, tileType, type MahjongState } from "./types";
export function sampleMahjong(
  input: MahjongState,
  actor: number,
  random: () => number,
): MahjongState {
  const state = structuredClone(input),
    view = state.view;
  if (
    view.pending?.rob &&
    view.hands[view.pending.actor].every((t) => t !== view.pending!.tile)
  ) {
    const hand = view.hands[view.pending.actor],
      index = hand.indexOf(-1);
    if (index >= 0) hand[index] = view.pending.tile;
  }
  const known = new Set(
      [
        ...view.hands.flat(),
        ...view.rivers.flat(),
        ...view.melds.flat().flatMap((m) => m.tiles),
      ].filter((t) => t >= 0),
    ),
    pool = Array.from({ length: 108 }, (_, i) => i).filter(
      (t) => !known.has(t),
    );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const hidden = view.melds.flatMap((melds, id) =>
      melds
        .filter((m) => m.type === "closed" && m.tiles[0] < 0)
        .map((meld) => ({ id, meld })),
    ),
    slots = view.hands.flatMap((hand, id) =>
      hand.flatMap((tile, index) => (tile < 0 ? [{ id, index }] : [])),
    );
  const assigned = new Map<number, number>();
  let solved = false;
  const allocate = (available: number[]) => {
    const owners = Array<number>(available.length).fill(-1),
      cleared = view.rivers.map(
        (river, id) =>
          view.lacks[id] >= 0 &&
          river.some((t) => tileSuit(t) !== view.lacks[id]),
      );
    const match = (slot: number, seen: Set<number>): boolean => {
      for (let i = 0; i < available.length; i++) {
        if (
          seen.has(i) ||
          (cleared[slots[slot].id] &&
            tileSuit(available[i]) === view.lacks[slots[slot].id])
        )
          continue;
        seen.add(i);
        if (owners[i] < 0 || match(owners[i], seen)) {
          owners[i] = slot;
          return true;
        }
      }
      return false;
    };
    for (let i = 0; i < slots.length; i++)
      if (!match(i, new Set())) return false;
    owners.forEach((slot, i) => {
      if (slot >= 0) assigned.set(slot, available[i]);
    });
    view.wall = available.filter((_, i) => owners[i] < 0);
    return true;
  };
  const choose = (depth: number, available: number[]): boolean => {
    if (depth === hidden.length) return allocate(available);
    const item = hidden[depth],
      types = [...new Set(available.map(tileType))];
    for (const type of types) {
      const group = available.filter((t) => tileType(t) === type);
      if (group.length !== 4 || tileSuit(group[0]) === view.lacks[item.id])
        continue;
      item.meld.tiles = [...group];
      if (
        choose(
          depth + 1,
          available.filter((t) => !group.includes(t)),
        )
      )
        return true;
    }
    return false;
  };
  solved = choose(0, pool);
  if (!solved) throw new Error("公开信息不满足麻将牌张约束");
  for (const [slot, tile] of assigned)
    view.hands[slots[slot].id][slots[slot].index] = tile;
  if (view.wall.length !== input.view.wall.length)
    throw new Error("采样牌墙张数不一致");
  return state;
}
