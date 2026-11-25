import type { ReactNode } from "react";
import type { Snapshot } from "../domain/protocol";

type TableSnapshot = Pick<
  Snapshot,
  | "paused"
  | "aiPaused"
  | "minerPaused"
  | "resolving"
  | "finished"
  | "playing"
  | "candidates"
> &
  Partial<Pick<Snapshot, "state" | "kind" | "actor" | "seats">>;

export type TableChromeState =
  "idle" | "pending" | "paused" | "resolving" | "turn";

export function tableChromeStatus(
  snapshot: TableSnapshot,
  pending: boolean,
): { state: TableChromeState; label: string } {
  if (snapshot.paused)
    return {
      state: "paused",
      label: snapshot.minerPaused
        ? "对局已暂停"
        : snapshot.aiPaused
          ? "AI 性能测试已暂停"
          : "有玩家掉线，等待恢复连接",
    };
  if (pending)
    return { state: "pending", label: "动作已发送，等待服务器确认…" };
  if (snapshot.resolving && !snapshot.finished)
    return {
      state: "resolving",
      label: snapshot.kind === "sgs" ? "等待无懈可击响应" : "等待玩家响应",
    };
  if (snapshot.playing && !snapshot.finished) {
    if (snapshot.state?.kind === "uno" && snapshot.state.view.isStart) {
      const current = snapshot.state.view.waitFor;
      const name = snapshot.seats?.[current]?.name;
      return {
        state: "turn",
        label:
          current === snapshot.actor
            ? "轮到你了"
            : name
              ? `${name}的回合`
              : "等待出牌",
      };
    }
    if (snapshot.candidates.length) return { state: "turn", label: "轮到你了" };
  }
  return { state: "idle", label: "" };
}

export function TableChrome({
  snapshot,
  pending,
  secondary,
  finishedActions,
  showTurn = true,
}: {
  snapshot: TableSnapshot;
  pending: boolean;
  secondary?: ReactNode;
  finishedActions?: ReactNode;
  showTurn?: boolean;
}) {
  const { state, label } = tableChromeStatus(snapshot, pending);
  const visible = label && (showTurn || state !== "turn");
  return (
    <>
      {(snapshot.playing || visible) && (
        <div className="game-status-row" data-chrome-state={state}>
          {visible && (
            <span className="game-turn-indicator" role="status">
              {label}
            </span>
          )}
          {secondary}
        </div>
      )}
      {snapshot.finished && (
        <div className="finish-banner" data-chrome-state="finished">
          <strong>对局已结束</strong>
          {finishedActions}
        </div>
      )}
    </>
  );
}
