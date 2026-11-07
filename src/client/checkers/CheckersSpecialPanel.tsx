import type { CheckersView } from "../../domain/types";

export function CheckersSpecialPanel({ view }: { view: CheckersView }) {
  const special = view.special;
  if (!special) return null;
  return (
    <section
      className="checkers-special-panel"
      aria-label="据点攻防状态"
      data-guide-target="tq.special"
    >
      <div>
        <strong>
          据点攻防 · 第 {special.rounds}/{special.maxRounds} 回合
        </strong>
        <span>
          攻方需要让 {special.settledGoal}{" "}
          枚棋子进入敌营；守方守住中央三座哨塔或拖过回合上限。
        </span>
      </div>
      <div>
        <span>
          攻方连跳奖励 <b>{special.starAwards[0] ?? 0}</b>
        </span>
        <span>
          守方连跳奖励 <b>{special.starAwards[1] ?? 0}</b>
        </span>
      </div>
      {special.winner !== null && (
        <strong className="checkers-winner">
          {special.winner === 0 ? "攻方突破成功" : "守方守住据点"}
        </strong>
      )}
    </section>
  );
}
