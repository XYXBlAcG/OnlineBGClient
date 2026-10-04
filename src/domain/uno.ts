import { UpstreamRuntime } from "../upstream/runtime";
import type { Action, Candidate, GameState, UnoView } from "./types";
type UnoState = Extract<GameState, { kind: "uno" }>;
export class UnoRules {
  readonly original;
  constructor(runtime: UpstreamRuntime) {
    this.original = runtime.load(6435);
  }
  create(players: number): UnoState {
    return {
      kind: "uno",
      view: this.original.my(
        this.original.Lq({ playerList: Array(players).fill({}) }),
      ),
    };
  }
  finished(state: UnoState): boolean {
    return state.view.isEnd;
  }
  actors(state: UnoState): number[] {
    return state.view.isEnd
      ? []
      : [state.view.isStart ? state.view.waitFor : 0];
  }
  candidates(state: UnoState, actor: number): Candidate[] {
    return this.moves(state.view, actor);
  }
  apply(state: UnoState, actor: number, action: Action): UnoState {
    if (
      !this.moves(state.view, actor).some(
        (candidate) =>
          JSON.stringify(candidate.action) === JSON.stringify(action),
      )
    )
      throw new Error("不是合法的 UNO 动作");
    let next: UnoView;
    if (action.type === "uno-start") next = this.original.Lk(state.view, actor);
    else if (action.type === "uno-draw") next = this.original.Ih(state.view);
    else if (action.type === "uno-play")
      next = this.original.yS(
        state.view,
        action.card,
        action.color,
        action.jump ? actor + 1 : 0,
        Number(action.saidUno),
      );
    else if (action.type === "uno-report")
      next = this.original.o7(state.view, actor);
    else throw new Error("游戏类型不匹配");
    return { kind: "uno", view: this.original.my(this.original.qA(next)) };
  }
  project(state: UnoState, actor: number): UnoState {
    const projected = structuredClone(state);
    const view = projected.view;
    view.playerCards = view.playerCards.map((cards, id) =>
      id === actor ? cards : cards.map((_, index) => -index - 1),
    );
    view.drawCards.fill(-1);
    view.cardList = view.cardList.map((position) =>
      position === actor + 1 || position === 0 ? position : -1,
    );
    return projected;
  }
  private moves(view: UnoView, actor: number): Candidate[] {
    if (!view.playerCards[actor] || view.isEnd || view.playerFinish[actor])
      return [];
    if (!view.isStart)
      return [{ action: { type: "uno-start" }, label: "开始出牌" }];
    const result: Candidate[] = [];
    const isTurn = view.waitFor === actor;
    if (isTurn)
      result.push({
        action: { type: "uno-draw" },
        label: view.currentPlus
          ? `摸 ${view.currentPlus} 张`
          : view.isDrawThink
            ? "不出"
            : "摸牌",
      });
    for (const card of view.playerCards[actor]) {
      const type = this.original.Vz(card);
      const jump =
        !isTurn &&
        !!view.isAllowJumpIn &&
        this.original.e3(card) === this.original.e3(view.topCard);
      if (!isTurn && !jump) continue;
      if (!jump) {
        if (view.isLeadCard && [11, 13, 15].includes(view.currentNumber))
          continue;
        if (view.isDrawThink && card !== view.lastOpInfo.opCard) continue;
        if (
          view.currentPlus
            ? view.currentNumber === 13
              ? type !== 13 && type !== 15
              : type !== 15
            : type <= 13 &&
              view.currentColor !== 4 &&
              Math.floor(card / 25) !== view.currentColor &&
              type !== view.currentNumber
        )
          continue;
      }
      const colors = type > 13 ? [0, 1, 2, 3] : [0];
      for (const color of colors)
        for (const saidUno of view.playerCards[actor].length === 2
          ? [false, true]
          : [false])
          result.push({
            action: { type: "uno-play", card, color, jump, saidUno },
            label: `${jump ? "抢出" : "出"} ${this.original.SV[Math.min(3, Math.floor(card / 25))]} ${type === 14 ? "万能" : type === 15 ? "+4" : this.original.uj[type]}${type > 13 ? ` → ${this.original.SV[color]}` : ""}${saidUno ? "，UNO" : ""}`,
          });
    }
    const previous = view.lastOpInfo;
    if (
      previous.playerId !== actor &&
      [1, 2].includes(previous.opType) &&
      !previous.isSaidUno &&
      view.playerCards[previous.playerId]?.length === 1
    ) {
      result.push({ action: { type: "uno-report" }, label: "举报未喊 UNO" });
    }
    return result;
  }
}
