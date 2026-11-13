import type { Action } from "../../domain/types";
import type { Snapshot } from "../../domain/protocol";
export interface MahjongLessonProgress {
  exchange: boolean;
  lack: boolean;
  discards: number;
}
export const initialMahjongLesson: MahjongLessonProgress = {
  exchange: false,
  lack: false,
  discards: 0,
};
export function advanceMahjongLesson(
  progress: MahjongLessonProgress,
  action: Action,
): MahjongLessonProgress {
  if (action.type !== "scmj-action") return progress;
  const move = action.move;
  return {
    ...progress,
    exchange: progress.exchange || move.type === "exchange",
    lack: progress.lack || move.type === "lack",
    discards:
      progress.discards +
      (move.type === "discard" || move.type === "riichi" ? 1 : 0),
  };
}
export function mahjongLesson(
  snapshot: Snapshot,
  progress: MahjongLessonProgress,
) {
  if (snapshot.state?.kind !== "scmj") return null;
  const mode = snapshot.config.mahjong.mode ?? "sichuan",
    phase = snapshot.state.view.phase;
  const steps =
    mode === "sichuan"
      ? ["换三张", "选择定缺", "三次摸打"]
      : ["首次出牌", "再次摸打", "第三次摸打"];
  const complete = progress.discards >= 3;
  const stage =
    mode === "sichuan"
      ? !progress.exchange
        ? 0
        : !progress.lack
          ? 1
          : 2
      : Math.min(2, progress.discards);
  const active = snapshot.candidates.length > 0;
  const title = snapshot.finished
    ? "本局已结束，可重新开始练习"
    : complete
      ? "摸打练习完成，可继续自由练习"
      : !active
        ? "等待教学 AI 行动"
        : phase === "exchange"
          ? "选三张同花色牌，再确认"
          : phase === "lack"
            ? "选择定缺花色，之后先打完它"
            : phase === "response"
              ? "查看刚打出的牌，选择响应或过"
              : active
                ? "选一张手牌，再确认出牌"
                : "等待教学 AI 行动";
  const hint =
    mode === "sichuan"
      ? "缺门未清时先打缺门牌；出牌后观察弃牌河。"
      : mode === "washizu"
        ? "蓝色边角是透明牌。观察公开牌，暗牌仍不可见。"
        : "先保持门清；凑齐牌形仍需要役。宝牌本身不是役。";
  return {
    steps,
    stage: complete ? 2 : stage,
    title,
    hint,
    complete,
    discards: progress.discards,
  };
}
