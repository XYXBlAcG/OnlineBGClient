import type { Action, GameState, DecisionCandidate } from "../../types";
import type { TableEvent, TableSituation } from "../model";
import type { TableMemoryFact } from "../memory";

type UnoState = Extract<GameState, { kind: "uno" }>;

const colors = ["🔴红", "🟡黄", "🟢绿", "🔵蓝"];
const types = [
  "0️⃣",
  "1️⃣",
  "2️⃣",
  "3️⃣",
  "4️⃣",
  "5️⃣",
  "6️⃣",
  "7️⃣",
  "8️⃣",
  "9️⃣",
  "任意数",
  "🚫",
  "🔄",
  "+2",
];

export function unoCardLabel(card: number): string {
  if (card < 0) return "未知";
  if (card >= 104) return "+4";
  if (card >= 100) return "万能";
  const color = Math.floor(card / 25);
  const type = card % 25;
  return `${colors[color] ?? "?"} ${types[type] ?? String(type)}`;
}

function unoActionLabel(action?: Action): string | null {
  if (!action) return null;
  if (action.type === "uno-start") return "开始出牌";
  if (action.type === "uno-draw") return "摸牌";
  if (action.type === "uno-report") return "举报未喊 UNO";
  if (action.type === "uno-play")
    return `出 ${unoCardLabel(action.card)}${action.jump ? "（抢出）" : ""}${action.saidUno ? "，UNO" : ""}`;
  return null;
}

export interface UnoPerspectiveInput {
  observation: UnoState;
  actor: number;
  candidates: DecisionCandidate[];
  players: string[];
  events: TableEvent[];
  memory: TableMemoryFact[];
}

export function buildUnoSituation(
  input: UnoPerspectiveInput,
): TableSituation {
  const { view } = input.observation;
  const name = input.players[input.actor] ?? `座位 ${input.actor + 1}`;
  const current = input.players[view.waitFor] ?? "未知";
  const publicFacts = [
    `对局：UNO；阶段：${view.isStart ? "进行中" : "等待开始"}`,
    `当前轮到：${current}；当前颜色：${colors[view.currentColor] ?? "未知"}；当前牌面：${types[view.currentNumber] ?? view.currentNumber}`,
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
            .map((feature) => `${feature.name} ${feature.contribution.toFixed(1)}`)
            .join("，")}`
        : ""
    }`,
  }));
  const recent = input.events
    .filter((event) => ["action", "achievement"].includes(event.kind))
    .slice(-8)
    .map(
      (event) =>
        `${event.actorName ? `${event.actorName}：` : ""}${
          event.kind === "action"
            ? (unoActionLabel(event.payload) ?? event.label)
            : event.label
        }`,
    );
  const recentChat = input.events
    .filter((event) => event.kind === "chat")
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
