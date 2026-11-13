import type { ReactNode } from "react";
import type { Snapshot } from "../domain/protocol";

export type TableChromeState =
  "idle" | "pending" | "paused" | "resolving" | "turn";

export function tableChromeStatus(
  snapshot: Pick<
    Snapshot,
    "paused" | "aiPaused" | "resolving" | "finished" | "playing" | "candidates"
  >,
  pending: boolean,
): { state: TableChromeState; label: string } {
  if (pending) return { state: "pending", label: "操作确认中…" };
  if (snapshot.paused)
    return {
      state: "paused",
      label: snapshot.aiPaused
        ? "AI 性能测试已暂停"
        : "有玩家掉线，等待恢复连接",
    };
  if (snapshot.resolving && !snapshot.finished)
    return {
      state: "resolving",
      label: "等待无懈可击响应，房间服务自动结算",
    };
  if (snapshot.playing && snapshot.candidates.length)
    return { state: "turn", label: "轮到你了" };
  return { state: "idle", label: "" };
}

export function TableChrome({
  snapshot,
  pending,
  finishedActions,
}: {
  snapshot: Pick<
    Snapshot,
    "paused" | "aiPaused" | "resolving" | "finished" | "playing" | "candidates"
  >;
  pending: boolean;
  finishedActions?: ReactNode;
}) {
  const { state, label } = tableChromeStatus(snapshot, pending);
  const banner = state === "paused" || state === "resolving";
  return (
    <>
      {banner && (
        <div
          className="resolution-status"
          data-chrome-state={state}
          role="status"
        >
          {label}
        </div>
      )}
      {snapshot.playing && !snapshot.finished && (
        <div className="game-status-row" data-chrome-state={state}>
          <span
            className="game-turn-indicator"
            aria-live="polite"
            role="status"
            hidden={!label}
          >
            {label}
          </span>
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
