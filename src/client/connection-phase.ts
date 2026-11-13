export type ConnectionPhase =
  | "connecting"
  | "waiting"
  | "reconnecting"
  | "syncing"
  | "online";

export function connectionPhase(status: string): ConnectionPhase {
  if (/同步超时|正在同步/.test(status)) return "syncing";
  if (/中断|重连|正在恢复/.test(status)) return "reconnecting";
  if (/异常|等待重试|等待服务/.test(status)) return "waiting";
  if (/连接中|正在连接/.test(status)) return "connecting";
  return "online";
}

export const connectionPhaseLabels: Record<ConnectionPhase, string> = {
  connecting: "正在连接房间服务…",
  waiting: "网络异常，等待重试…",
  reconnecting: "连接中断，正在自动恢复…",
  syncing: "正在同步牌桌…",
  online: "已连接",
};

export function isRecoveredTransition(
  previous: ConnectionPhase,
  next: ConnectionPhase,
): boolean {
  return (
    next === "online" &&
    (previous === "reconnecting" || previous === "waiting")
  );
}
