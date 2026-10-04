import { UpstreamRuntime } from "../upstream/runtime";
import type { Action, Candidate, FlightView } from "./types";

export class FlightRules {
  readonly original;
  readonly codec;
  constructor(runtime: UpstreamRuntime) {
    this.original = runtime.load(4062);
    this.codec = runtime.load(6630).b;
  }
  create(players: number): FlightView {
    return this.original.Bx(
      { playerList: Array(players).fill({}) },
      this.codec.encode({ rule: 0 }).finish(),
    );
  }
  finished(view: FlightView): boolean {
    return this.original.f0(view);
  }
  candidates(view: FlightView, actor: number): Candidate[] {
    if (this.finished(view) || (view.state & 3) !== actor) return [];
    if (!(view.state & 4))
      return [{ action: { type: "fxq-roll" }, label: "掷骰子" }];
    const seen = new Set<number>();
    return view.planePositionList.flatMap((position, plane) => {
      if (
        Math.floor(plane / 4) !== actor ||
        seen.has(position) ||
        !(position ? position < 57 : !(view.lastDice % 2) && view.sixTimes < 3)
      )
        return [];
      seen.add(position);
      return [
        {
          action: { type: "fxq-move", plane } as Action,
          label: `${view.sixTimes >= 3 ? "返航" : position ? "移动" : "起飞"} ${(plane % 4) + 1} 号飞机`,
        },
      ];
    });
  }
  apply(view: FlightView, actor: number, action: Action): FlightView {
    if (
      !this.candidates(view, actor).some(
        (candidate) =>
          JSON.stringify(candidate.action) === JSON.stringify(action),
      )
    )
      throw new Error("不是合法的飞行棋动作");
    if (action.type === "fxq-roll") return this.original.HU(view, actor);
    if (action.type === "fxq-move")
      return this.original.VX(view, actor, action.plane);
    throw new Error("游戏类型不匹配");
  }
  progress(view: FlightView, actor: number): number {
    return view.planePositionList
      .slice(actor * 4, actor * 4 + 4)
      .reduce((sum, position) => sum + Math.min(57, position), 0);
  }
  risk(view: FlightView, actor: number): number {
    if (this.finished(view)) return 0;
    let loss = 0;
    for (let enemy = 0; enemy < view.planePositionList.length / 4; enemy++) {
      if (enemy === actor || view.winners.includes(enemy)) continue;
      for (let dice = 1; dice <= 6; dice++) {
        const hypothetical = {
          ...view,
          state: enemy | 4,
          lastDice: dice,
          sixTimes: dice === 6 ? 1 : 0,
        };
        const losses = this.candidates(hypothetical, enemy).map((candidate) => {
          const result = this.apply(hypothetical, enemy, candidate.action);
          return view.planePositionList
            .slice(actor * 4, actor * 4 + 4)
            .reduce(
              (sum, position, index) =>
                sum +
                (position > 0 &&
                result.planePositionList[actor * 4 + index] === 0
                  ? position
                  : 0),
              0,
            );
        });
        loss += Math.max(0, ...losses) / 6;
      }
    }
    return loss;
  }
}
