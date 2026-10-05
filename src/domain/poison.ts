import type { UpstreamRuntime } from "../upstream/runtime";
import type { Action, Candidate, GameState, PoisonView } from "./types";
type PoisonState = Extract<GameState, { kind: "dy" }>;
export class PoisonRules {
  readonly original;
  constructor(runtime: UpstreamRuntime) {
    this.original = runtime.load(2437);
  }
  create(players: number): PoisonState {
    return {
      kind: "dy",
      view: this.original.my(
        this.original.Bx({ playerList: Array(players).fill({}) }),
        players,
      ),
    };
  }
  finished(state: PoisonState): boolean {
    return !!state.view.finish;
  }
  actors(state: PoisonState): number[] {
    return this.finished(state) ? [] : [state.view.state];
  }
  candidates(state: PoisonState, actor: number): Candidate[] {
    if (this.finished(state) || state.view.state !== actor) return [];
    return state.view.players[actor].flatMap((card) => {
      const [color, value] = this.original.nX(card) as [number, number];
      return (color ? [color - 1] : [0, 1, 2]).map((pot) => ({
        action: { type: "dy-play" as const, card, pot },
        label: `${color ? ["红", "蓝", "紫"][color - 1] : "毒药"} ${value} → ${["红", "蓝", "紫"][pot]}锅`,
      }));
    });
  }
  apply(state: PoisonState, actor: number, action: Action): PoisonState {
    if (
      !this.candidates(state, actor).some(
        (move) => JSON.stringify(move.action) === JSON.stringify(action),
      ) ||
      action.type !== "dy-play"
    )
      throw new Error("不是合法的毒药动作");
    const view: PoisonView = structuredClone(state.view);
    view.players[actor] = view.players[actor].filter(
      (card) => card !== action.card,
    );
    view.pots[action.pot].push(action.card);
    view.state = (actor + 1) % view.players.length;
    view.lastOp = {
      playerId: actor + 1,
      putCard: action.card,
      eatCardList: [],
    };
    return {
      kind: "dy",
      view: this.original.my(this.original.qA(view), view.players.length),
    };
  }
  project(state: PoisonState, actor: number): PoisonState {
    const result = structuredClone(state);
    result.view.players = result.view.players.map((cards, id) =>
      id === actor ? cards : cards.map((_, index) => -index - 1),
    );
    return result;
  }
}
