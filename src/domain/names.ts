import { heroName } from "./terms";
import type { GameState, Seat } from "./types";

export const automaticNames = [
  "青竹",
  "流星",
  "云雀",
  "小满",
  "星河",
  "松风",
  "月白",
];
export function seatDisplayName(
  seat: Seat,
  index: number,
  state: GameState | null,
): string {
  if (seat.automaticName && state?.kind === "sgs" && state.view.hero[index])
    return heroName(state.view.hero[index]);
  return seat.name;
}
