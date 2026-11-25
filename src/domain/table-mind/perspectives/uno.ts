import type { GameState, DecisionCandidate } from "../../types";
import type { TableEvent, TableSituation } from "../model";
import type { TableMemoryFact } from "../memory";
import { describePublicAction } from "../public-action";

type UnoState = Extract<GameState, { kind: "uno" }>;

import { unoCardLabel, unoColorName, unoFaceName } from "../../uno-cards";
export { unoCardLabel } from "../../uno-cards";

export interface UnoPerspectiveInput {
  observation: UnoState;
  actor: number;
  candidates: DecisionCandidate[];
  players: string[];
  events: TableEvent[];
  memory: TableMemoryFact[];
}

export function buildUnoSituation(input: UnoPerspectiveInput): TableSituation {
  const { view } = input.observation;
  const name = input.players[input.actor] ?? `座位 ${input.actor + 1}`;
  const current = input.players[view.waitFor] ?? "未知";
  const publicFacts = [
    `对局：UNO；阶段：${view.isStart ? "进行中" : "等待开始"}`,
    `当前轮到：${current}；当前颜色：${unoColorName(view.currentColor)}；当前牌面：${unoFaceName(view.currentNumber)}`,
    `桌面顶牌：${unoCardLabel(view.topCard)}；待摸牌：${view.currentPlus}`,
    `玩家手牌数：${input.players.map((player, index) => `${player} ${view.playerCards[index]?.length ?? 0}`).join("、")}`,
    `已出完：${input.players.filter((_, index) => view.playerFinish[index]).join("、") || "无"}`,
  ];
  const own = view.playerCards[input.actor] ?? [];
  const selfFacts = [
    `我的座位：${name}`,
    `我的手牌：${own.map(unoCardLabel).join("、") || "无"}`,
    `当前是否我的回合：${view.waitFor === input.actor ? "是" : "否"}`,
  ];
  const candidates = input.candidates.slice(0, 8).map((candidate, index) => ({
    id: String(index),
    label: candidate.label,
    detail: `搜索评分 ${candidate.score.toFixed(1)}${
      candidate.features.length
        ? `；${candidate.features
            .slice(0, 2)
            .map(
              (feature) => `${feature.name} ${feature.contribution.toFixed(1)}`,
            )
            .join("，")}`
        : ""
    }`,
  }));
  const recent = input.events
    .filter(
      (event) => event.public && ["action", "achievement"].includes(event.kind),
    )
    .slice(-8)
    .map(
      (event) =>
        `${event.actorName ? `${event.actorName}：` : ""}${
          event.kind === "action"
            ? event.payload
              ? describePublicAction(event.payload).label
              : event.label
            : event.label
        }`,
    );
  const recentChat = input.events
    .filter((event) => event.public && event.kind === "chat")
    .slice(-5)
    .map(
      (event) =>
        `${event.actorName ? `${event.actorName}：` : ""}${event.label}`,
    );
  return {
    scene: {
      game: "UNO",
      phase: view.isStart ? "playing" : "lobby",
      players: input.players,
      actor: name,
    },
    selfFacts,
    publicFacts,
    recentEvents: recent,
    recentChat,
    memory: input.memory.map((fact) => fact.text),
    candidates,
    task: "请从候选中选择最有利的动作，只输出候选编号（0 开始）。",
  };
}
