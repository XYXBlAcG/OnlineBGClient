import type { Snapshot } from "../domain/protocol";
import type { GameKind } from "../domain/catalogue";
import type { Action } from "../domain/types";
interface QuickAction {
  id: string;
  title: string;
  binding: string;
  matches: (action: Action) => boolean;
}
export function quickCandidate(
  candidates: Snapshot["candidates"],
  quick: QuickAction,
) {
  const matches = candidates.filter((candidate) =>
    quick.matches(candidate.action),
  );
  return matches.length === 1 ? matches[0] : undefined;
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
  scmj: [
    {
      id: "win",
      title: "胡牌",
      binding: "H",
      matches: (a) =>
        a.type === "scmj-action" &&
        (a.move.type === "win" ||
          (a.move.type === "respond" && a.move.choice === "win")),
    },
    {
      id: "pong",
      title: "碰",
      binding: "P",
      matches: (a) =>
        a.type === "scmj-action" &&
        a.move.type === "respond" &&
        a.move.choice === "pong",
    },
    {
      id: "kong",
      title: "杠",
      binding: "G",
      matches: (a) =>
        a.type === "scmj-action" &&
        (a.move.type === "kong" ||
          (a.move.type === "respond" && a.move.choice === "kong")),
    },
    {
      id: "pass",
      title: "过",
      binding: " ",
      matches: (a) =>
        a.type === "scmj-action" &&
        a.move.type === "respond" &&
        a.move.choice === "pass",
    },
  ],
  ddz: [
    {
      id: "pass",
      title: "不出",
      binding: " ",
      matches: (a) => a.type === "ddz-pass",
    },
    {
      id: "claim",
      title: "叫地主",
      binding: "D",
      matches: (a) => a.type === "ddz-claim",
    },
  ],
  graphwar: [
    {
      id: "guard",
      title: "防御",
      binding: "G",
      matches: (a) => a.type === "graphwar-guard",
    },
    {
      id: "pass",
      title: "跳过",
      binding: " ",
      matches: (a) => a.type === "graphwar-pass",
    },
  ],
  uno: [
    {
      id: "uno-report",
      title: "喊 UNO",
      binding: "U",
      matches: (a) => a.type === "uno-report",
    },
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
