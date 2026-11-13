import type { GameKind } from "./catalogue";

export interface Series {
  kind: GameKind;
  rounds: number;
  wins: number[];
  draws: number;
}

export function createSeries(kind: GameKind, seats: number): Series {
  return { kind, rounds: 0, wins: Array(seats).fill(0), draws: 0 };
}

export function recordSeriesRound(
  series: Series | null,
  kind: GameKind,
  seats: number,
  winners: number[],
): Series {
  const base =
    series && series.kind === kind && series.wins.length === seats
      ? series
      : createSeries(kind, seats);
  const wins = [...base.wins];
  for (const winner of winners) if (winner >= 0 && winner < seats) wins[winner] += 1;
  return {
    kind,
    rounds: base.rounds + 1,
    wins,
    draws: base.draws + (winners.length ? 0 : 1),
  };
}
