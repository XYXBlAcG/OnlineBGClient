import type { UpstreamRuntime } from "../upstream/runtime";
import {
  splendorMoveSchema,
  type SplendorView,
  type SplendorMove,
} from "./splendor-actions";
import type { Action, Candidate } from "./types";
type State = { kind: "ccbs"; view: SplendorView };
export const splendorColors = ["白", "蓝", "绿", "红", "黑", "金"];
export class SplendorRules {
  readonly original;
  readonly cards;
  constructor(readonly runtime: UpstreamRuntime) {
    this.original = runtime.load(1124);
    this.cards = runtime.load(3797);
  }
  create(players: number): State {
    const view = this.original.kY(players) as SplendorView;
    view.publicBooked = Array.from({ length: players }, () => []);
    return { kind: "ccbs", view };
  }
  finished(state: State): boolean {
    return state.view.winner.length > 0;
  }
  actors(state: State): number[] {
    return this.finished(state) ? [] : [state.view.waitFor];
  }
  candidates(state: State, actor: number): Candidate[] {
    const moves = this.original.t2(state.view, actor) as SplendorMove[];
    return moves.map((move) => ({
      action: { type: "ccbs-action", move },
      label:
        move.kind === "take"
          ? `拿宝石 · ${move.selected.map((i) => splendorColors[i]).join("、")}`
          : move.kind === "book"
            ? `预留 · 卡牌 ${move.cardId + 1}`
            : move.kind === "deck"
              ? `暗抽预留 · ${move.level + 1} 级`
              : move.kind === "buy"
                ? `购买 · 卡牌 ${move.cardId + 1} · ${move.payment.spend.map((n, i) => (n ? `${n}${splendorColors[i]}` : "")).join("")}${move.payment.gold ? `${move.payment.gold}金` : ""}`
                : move.kind === "throw"
                  ? `归还 · ${move.gemDelta.map((n, i) => (n ? `${n}${splendorColors[i]}` : "")).join("")}`
                  : move.kind === "noble"
                    ? `贵族 · ${move.noblePos + 1}`
                    : "跳过回合",
    }));
  }
  apply(state: State, actor: number, action: Action): State {
    if (action.type !== "ccbs-action" || this.finished(state))
      throw new Error("不是合法的璀璨宝石动作");
    const move = splendorMoveSchema.parse(action.move);
    if (!this.original.Us(state.view, move, actor))
      throw new Error("当前阶段不能执行该动作");
    const view = this.original.QW(state.view, move) as SplendorView;
    if (move.kind === "book") view.publicBooked[actor].push(move.cardId);
    if (move.kind === "buy" && move.booked)
      view.publicBooked[actor] = view.publicBooked[actor].filter(
        (id) => id !== move.cardId,
      );
    return { kind: "ccbs", view };
  }
  project(state: State, actor: number): State {
    const view = structuredClone(state.view);
    if (this.finished(state)) return { kind: "ccbs", view };
    const visible = new Set([
      ...view.bankCard
        .flat()
        .filter(Boolean)
        .map((id) => id - 1),
      ...view.playerCard.flat(),
      ...view.publicBooked.flat(),
      ...(view.playerBooked[actor] || []),
    ]);
    const pool = Array.from({ length: 90 }, (_, i) => i).filter(
      (id) => !visible.has(id),
    );
    view.bankLeftCard = [0, 1, 2].map((level) =>
      pool.filter((id) => this.cards.XO[id] === level),
    );
    view.playerBooked = view.playerBooked.map((cards, id) =>
      id === actor
        ? cards
        : cards.map((card) =>
            view.publicBooked[id].includes(card)
              ? card
              : -1 - this.cards.XO[card],
          ),
    );
    if (
      view.lastOp.type === 2 &&
      view.lastOp.cardPos === 8 &&
      view.lastOp.playerId !== actor
    )
      view.lastOp.card = 0;
    view.initial = null;
    view.recordList = [];
    return { kind: "ccbs", view };
  }
}
