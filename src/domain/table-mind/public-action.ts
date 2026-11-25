import type { Action } from "../types";
import { unoCardLabel, unoColorName } from "../uno-cards";

export type PublicAction = Extract<
  Action,
  { type: "uno-play" | "uno-draw" | "uno-report" | "uno-start" }
>;
export interface PublicActionDescription {
  label: string;
  payload?: PublicAction;
}
export function describePublicAction(action: Action): PublicActionDescription {
  switch (action.type) {
    case "uno-start":
      return { label: "开始出牌", payload: action };
    case "uno-draw":
      return { label: "摸牌", payload: action };
    case "uno-report":
      return { label: "举报未喊 UNO", payload: action };
    case "uno-play":
      return {
        label: `${action.jump ? "抢出" : "出"} ${unoCardLabel(action.card)}${action.card >= 100 ? ` → ${unoColorName(action.color)}` : ""}${action.saidUno ? "，UNO" : ""}`,
        payload: action,
      };
    case "scmj-action":
      return {
        label:
          action.move.type === "exchange"
            ? "提交了换三张"
            : action.move.type === "lack"
              ? "完成了定缺"
              : "进行了麻将操作",
      };
    case "sgs-hero":
      return { label: "完成了武将选择" };
    case "graphwar-fire":
      return { label: "发射了函数" };
    case "pool-shot":
      return { label: "完成了击球" };
    case "golf-putt":
      return { label: "完成了推杆" };
    case "golf-next":
      return { label: "进入下一洞" };
    case "draw-stroke":
    case "draw-undo":
      return { label: "更新了画布" };
    case "draw-guess":
      return { label: "提交了猜词" };
    case "draw-next":
      return { label: "推进了绘画回合" };
    default:
      return { label: "进行了游戏操作" };
  }
}
