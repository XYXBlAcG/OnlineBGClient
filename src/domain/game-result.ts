import type { GameState } from "./types";
import { catanVictoryPoints } from "./catan";

function unoWinner(state: Extract<GameState, { kind: "uno" }>, actor: number) {
  const view = state.view;
  return view.teamMode
    ? view.teamWinner === view.teams?.[actor]
    : view.isEnd && (view.playerFinish[actor] ?? 0) > 0;
}

export function gameWinner(state: GameState, actor: number): boolean {
  switch (state.kind) {
    case "uno":
      return unoWinner(state, actor);
    case "ddz":
      return state.view.isFinish && state.view.winner === actor + 1;
    case "ccbs":
      return state.view.winner.includes(actor);
    case "dominion":
      return state.view.winners.includes(actor);
    case "graphwar":
      return state.view.winner === actor;
    case "fxq":
      return state.view.winners.includes(actor);
    case "scmj":
      return state.view.wins.some((win) => win.player === actor);
    case "tq":
      return state.view.winnerId.includes(actor);
    case "sgs":
      return state.view.winners.includes(actor);
    case "expedition":
      return state.view.phase === "won";
    case "dy":
      return (
        state.view.finish === 1 &&
        state.view.scores[actor] <= Math.min(...state.view.scores)
      );
    case "ktd": {
      const scores = state.view.playerData.map((_, index) =>
        catanVictoryPoints(state.view, index),
      );
      return scores[actor] === Math.max(...scores);
    }
    case "pool":
      return state.view.winner === actor;
  }
  return false;
}

export function gameWinners(state: GameState, players: number): number[] {
  const winners: number[] = [];
  for (let actor = 0; actor < players; actor += 1)
    if (gameWinner(state, actor)) winners.push(actor);
  return winners;
}
