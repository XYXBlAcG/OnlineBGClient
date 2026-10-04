import { UpstreamRuntime } from "../upstream/runtime";
import type { Action, Candidate, DdzView } from "./types";

export class DdzRules {
  readonly original;
  readonly codec;
  constructor(runtime: UpstreamRuntime) {
    this.original = runtime.load(6139);
    this.codec = runtime.load(9474).w;
  }
  create(players: number): DdzView {
    return this.original.my(
      this.original.Bx(
        { playerList: Array(players).fill({}) },
        this.codec.encode({ rule: 0 }).finish(),
      ),
      players,
    );
  }
  actors(view: DdzView): number[] {
    return view.isFinish ? [] : view.state === 0 ? [0, 1, 2] : [view.state - 1];
  }
  candidates(view: DdzView, actor: number): Candidate[] {
    if (view.isFinish) return [];
    if (view.state === 0)
      return [{ action: { type: "ddz-claim" }, label: "抢地主" }];
    if (view.state !== actor + 1) return [];
    const result: Candidate[] = [];
    if (this.original.GU(view, actor + 1))
      result.push({ action: { type: "ddz-pass" }, label: "不出" });
    for (const card of view.playerCardLists[actor + 1])
      if (this.original.DB(view, actor + 1, 3, [card]))
        result.push({
          action: { type: "ddz-play", cards: [card] },
          label: `出 ${this.cardName(card)}`,
        });
    return result;
  }
  cardName(card: number): string {
    const rank = this.original.Vz(card);
    return rank === 54
      ? "大王"
      : rank === 53
        ? "小王"
        : rank === 14
          ? "A"
          : rank === 15
            ? "2"
            : rank === 11
              ? "J"
              : rank === 12
                ? "Q"
                : rank === 13
                  ? "K"
                  : String(rank);
  }
  apply(view: DdzView, actor: number, action: Action): DdzView {
    if (action.type === "ddz-claim" && view.state === 0)
      return this.original.JY(view, actor + 1, 3);
    if (action.type === "ddz-pass" && this.original.GU(view, actor + 1))
      return this.original.Uj(view, actor + 1, 3);
    if (
      action.type !== "ddz-play" ||
      new Set(action.cards).size !== action.cards.length ||
      !action.cards.every((card) =>
        view.playerCardLists[actor + 1].includes(card),
      ) ||
      !this.original.DB(view, actor + 1, 3, action.cards)
    )
      throw new Error("不是合法的斗地主动作");
    return this.original.rG(view, actor + 1, 3, action.cards);
  }
  project(view: DdzView, actor: number): DdzView {
    const result = structuredClone(view);
    const visible = new Set([
      ...view.playerCardLists[actor + 1],
      ...view.playedCardList,
      ...(view.state !== 0 ? view.holeCardList : []),
    ]);
    result.playerCardLists = result.playerCardLists.map((cards, id) =>
      id === actor + 1 ? cards : cards.map((_, index) => -index - 1),
    );
    result.cardPositionList = result.cardPositionList.map((position, index) =>
      visible.has(index + 1) ? position : -1,
    );
    if (view.state === 0) result.holeCardList.fill(-1);
    return result;
  }
}
