import type { PoolView } from "../../domain/pool/types";

export function poolBallLabel(view: PoolView, id: number): string {
  if (view.mode === "party" && view.party) {
    const special = view.party.specials.find((item) => item.id === id);
    if (special) return special.kind === "bolt" ? "闪电球" : "金球";
    const owner = view.party.owners.findIndex((ids) => ids.includes(id));
    if (owner >= 0) return `${id} 号球 · 玩家${owner + 1}`;
  }
  return id === 0 ? "白球" : `${id} 号球`;
}
