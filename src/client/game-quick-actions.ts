import type { GameKind } from "../domain/catalogue";
import type { Action } from "../domain/types";
interface QuickAction {
  id: string;
  title: string;
  binding: string;
  matches: (action: Action) => boolean;
}
export const gameQuickActions: Partial<Record<GameKind, QuickAction[]>> = {
  expedition: [
    {
      id: "expedition-ready",
      title: "结束行动 / 取消结束",
      binding: "E",
      matches: (action) =>
        action.type === "expedition-action" &&
        ["ready", "unready"].includes(action.move.type),
    },
  ],
  uno: [
    {
      id: "uno-draw",
      title: "摸牌 / 不出",
      binding: "D",
      matches: (action) => action.type === "uno-draw",
    },
  ],
  ktd: [
    {
      id: "ktd-action",
      title: "掷骰",
      binding: "D",
      matches: (action) =>
        action.type === "ktd-action" && action.move.kind === "roll",
    },
  ],
  fxq: [
    {
      id: "fxq-roll",
      title: "掷骰",
      binding: "D",
      matches: (action) => action.type === "fxq-roll",
    },
  ],
  dominion: [
    {
      id: "treasures",
      title: "打出全部财宝",
      binding: "T",
      matches: (action) =>
        action.type === "dominion-action" && action.move.type === "treasures",
    },
    {
      id: "buy-phase",
      title: "进入购买阶段",
      binding: "B",
      matches: (action) =>
        action.type === "dominion-action" && action.move.type === "buy-phase",
    },
    {
      id: "end",
      title: "结束回合",
      binding: "E",
      matches: (action) =>
        action.type === "dominion-action" && action.move.type === "end",
    },
  ],
};
