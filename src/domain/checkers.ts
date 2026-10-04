import { munkres } from "munkres";
import { UpstreamRuntime } from "../upstream/runtime";
import type { Action, Candidate, CheckersView } from "./types";

export class CheckersRules {
  readonly original;
  readonly codec;
  constructor(runtime: UpstreamRuntime) {
    this.original = runtime.load(5328);
    this.codec = runtime.load(1529).QY;
  }
  create(players: number): CheckersView {
    return this.original.my(
      this.original.Bx(
        { playerList: Array(players).fill({}) },
        this.codec.encode({ prop: 0 }).finish(),
      ),
      players,
    );
  }
  candidates(view: CheckersView, actor: number): Candidate[] {
    if (view.finish || view.waitFor !== actor) return [];
    return this.original
      .t2(view, actor)
      .map((route: number[]) => ({
        action: { type: "tq-move", route },
        label: `${route.length > 2 ? "连续跳跃" : "移动"} ${route[0]} → ${route.at(-1)}`,
      }));
  }
  apply(view: CheckersView, actor: number, action: Action): CheckersView {
    if (
      action.type !== "tq-move" ||
      !this.candidates(view, actor).some(
        (candidate) =>
          JSON.stringify(candidate.action) === JSON.stringify(action),
      )
    )
      throw new Error("不是合法的跳棋动作");
    return this.original.oe(view, action.route);
  }
  targets(view: CheckersView, actor: number): number[] {
    return this.original.bX((view.pos[actor] + 3) % 6, view.pieceCount);
  }
  distance(from: number, to: number): number {
    const [x, y] = this.original.Us(from);
    const [u, v] = this.original.Us(to);
    return Math.max(Math.abs(x - u), Math.abs(y - v), Math.abs(x + y - u - v));
  }
  cost(view: CheckersView, actor: number): number {
    const goals = this.targets(view, actor);
    const matrix = view.playerPieces[actor].map((piece) =>
      goals.map((goal) => this.distance(piece, goal) ** 2),
    );
    return munkres(matrix).reduce(
      (sum, [piece, goal]) => sum + matrix[piece][goal],
      0,
    );
  }
  escape(view: CheckersView, actor: number): number {
    const goals = this.targets(view, actor);
    let result = 0;
    for (let enemy = 0; enemy < view.playerPieces.length; enemy++) {
      if (enemy === actor) continue;
      const blockers = view.playerPieces[enemy].filter((piece) =>
        goals.includes(piece),
      );
      if (!blockers.length) continue;
      const enemyGoals = this.targets(view, enemy);
      const routes: number[][] = this.original.t2(view, enemy);
      for (const blocker of blockers) {
        const before = Math.min(
          ...enemyGoals.map((goal) => this.distance(blocker, goal)),
        );
        result += Math.max(
          0,
          ...routes
            .filter((route) => route[0] === blocker)
            .map(
              (route) =>
                before -
                Math.min(
                  ...enemyGoals.map((goal) =>
                    this.distance(route.at(-1)!, goal),
                  ),
                ),
            ),
        );
      }
    }
    return result;
  }
  settled(view: CheckersView, actor: number): number {
    const goals = this.targets(view, actor);
    return view.playerPieces[actor].filter((piece) => goals.includes(piece))
      .length;
  }
}
