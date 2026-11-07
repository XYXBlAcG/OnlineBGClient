import { munkres } from "munkres";
import { z } from "zod";
import { UpstreamRuntime } from "../upstream/runtime";
import type { GameOptions } from "./game-options";
import type { Action, Candidate, CheckersView } from "./types";

export const checkersOptionsSchema = z.object({
  mode: z.enum(["classic", "siege"]).default("classic"),
});
export type CheckersOptions = z.infer<typeof checkersOptionsSchema>;

export class CheckersRules {
  readonly original;
  readonly codec;
  constructor(runtime: UpstreamRuntime) {
    this.original = runtime.load(5328);
    this.codec = runtime.load(1529).QY;
  }
  create(players: number, _team = false, options?: GameOptions): CheckersView {
    const view = this.original.my(
      this.original.Bx(
        { playerList: Array(players).fill({}) },
        this.codec.encode({ prop: 0 }).finish(),
      ),
      players,
    ) as CheckersView;
    if (options?.checkers?.mode !== "siege") return view;
    if (players !== 2) throw new Error("据点攻防仅支持双人对局");
    const occupied = new Set(view.playerPieces.flat());
    const towers = Array.from({ length: 121 }, (_, cell) => cell)
      .filter((cell) => {
        const [x, y] = this.original.Us(cell);
        return (
          Math.abs(x - 8) <= 2 && Math.abs(y - 8) <= 2 && !occupied.has(cell)
        );
      })
      .slice(0, 3);
    return {
      ...view,
      special: {
        mode: "siege",
        rounds: 0,
        maxRounds: 18,
        settledGoal: 4,
        towers,
        starAwards: [0, 0],
        winner: null,
      },
    };
  }
  candidates(view: CheckersView, actor: number): Candidate[] {
    if (view.special?.winner != null || view.finish || view.waitFor !== actor)
      return [];
    return this.original.t2(view, actor).map((route: number[]) => ({
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
    const next = structuredClone(
      this.original.oe(view, action.route),
    ) as CheckersView;
    if (!next.special) return next;
    next.special.rounds++;
    const attackerSettled = this.settled(next, 0);
    const defenderTowers = next.playerPieces[1].filter((piece) =>
      next.special!.towers.includes(piece),
    ).length;
    const winner =
      attackerSettled >= next.special.settledGoal
        ? 0
        : actor === 1 && defenderTowers >= 3
          ? 1
          : next.special.rounds >= next.special.maxRounds
            ? 1
            : null;
    if (winner !== null) {
      next.special.winner = winner;
      next.finish = true;
      next.winnerId = [winner];
      next.winnerRound = [next.special.rounds];
    } else if (action.route.length >= 3) {
      next.special.starAwards[actor]++;
      next.waitFor = actor;
    }
    return next;
  }
  siegeWinner(view: CheckersView): number | null {
    if (!view.special) return null;
    if (view.special.winner !== null) return view.special.winner;
    if (this.settled(view, 0) >= view.special.settledGoal) return 0;
    if (
      view.playerPieces[1].filter((piece) =>
        view.special!.towers.includes(piece),
      ).length >= 3
    )
      return 1;
    return view.special.rounds >= view.special.maxRounds ? 1 : null;
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
