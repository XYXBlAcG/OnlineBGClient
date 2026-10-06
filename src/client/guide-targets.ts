import { CheckersRules } from "../domain/checkers";
import { UpstreamRuntime } from "../upstream/runtime";
import type { GuideSnapshot } from "./guide-position";
import { CardGuides } from "../domain/card-guide";
export const guideTargetKeys = [
  "ccbs.market",
  "ccbs.bank",
  "ccbs.buy",
  "ccbs.noble",
  "ccbs.score",
  "dy.card",
  "dy.hand",
  "dy.pot",
  "dy.score",
  "ktd.build",
  "ktd.roll",
  "ktd.hand",
  "ktd.trade",
  "ktd.end",
  "sgs.hero",
  "sgs.card",
  "sgs.trick",
  "sgs.hand",
  "tq.camp",
  "tq.piece",
  "tq.landing",
  "tq.route",
] as const;
export type GuideTargetKey = (typeof guideTargetKeys)[number];
export interface TargetQuery {
  key: string;
  ids?: string[];
  player?: number;
  within?: string;
  limit: number;
  label: string;
  wait: string;
}
const labels: Record<GuideTargetKey, [string, string]> = {
  "ccbs.market": ["查看发展卡", "等待市场发展卡出现"],
  "ccbs.bank": ["查看银行宝石", "等待银行宝石出现；选择颜色前先点击取宝石"],
  "ccbs.buy": ["查看购买按钮", "等待轮到你，再选择购买发展卡"],
  "ccbs.noble": ["查看贵族要求", "等待贵族出现"],
  "ccbs.score": ["查看我的声望", "等待玩家计分区出现"],
  "dy.card": ["查看我的牌", "等待发牌"],
  "dy.hand": ["查看我的手牌", "等待发牌"],
  "dy.pot": ["查看药锅", "等待药锅出现"],
  "dy.score": ["查看我的收牌与分数", "等待计分区出现"],
  "ktd.build": [
    "查看可建造位置",
    "轮到你时先选择村庄、道路或城市，再查看可建造位置",
  ],
  "ktd.roll": ["查看掷骰按钮", "等待轮到你的掷骰阶段"],
  "ktd.hand": ["查看我的资源", "等待自己的资源区出现"],
  "ktd.trade": ["查看交易入口", "等待轮到你并完成掷骰"],
  "ktd.end": ["查看结束回合", "完成当前阶段后查看结束回合按钮"],
  "sgs.hero": ["查看我的武将", "先完成武将选择"],
  "sgs.card": ["查看我的手牌", "等待自己的手牌出现"],
  "sgs.trick": ["查看我的锦囊", "当前没有可展示的锦囊；获得锦囊后再查看"],
  "sgs.hand": ["查看当前操作", "等待自己的操作区出现"],
  "tq.camp": ["查看目标营地", "等待棋盘出现"],
  "tq.piece": ["查看可动棋子", "等待轮到你，查看自己的可动棋子"],
  "tq.landing": ["查看合法落点", "先点击自己的一枚棋子，显示合法落点"],
  "tq.route": ["查看连续跳路径", "先选择棋子和跳跃落点，形成连续跳路径"],
};
const checkers = new CheckersRules(new UpstreamRuntime());
const cards = new CardGuides();
export function guideTarget(
  key: GuideTargetKey,
  snapshot?: GuideSnapshot,
): TargetQuery {
  const [label, wait] = labels[key];
  const query: TargetQuery = {
    key,
    label,
    wait,
    limit: ["tq.camp", "ktd.build"].includes(key)
      ? 24
      : key === "dy.pot"
        ? 3
        : 1,
  };
  if (!snapshot?.state || snapshot.actor < 0) return query;
  const { state, actor, candidates } = snapshot;
  if (key === "tq.camp" && state.kind === "tq") {
    query.key = "tq.cell";
    query.ids = checkers.targets(state.view, actor).map(String);
  }
  if (key === "tq.piece" && state.kind === "tq") {
    query.player = actor;
    query.ids = [
      ...new Set(
        candidates.flatMap((c) =>
          c.action.type === "tq-move" ? [String(c.action.route[0])] : [],
        ),
      ),
    ];
  }
  if (key === "sgs.hero" && state.kind === "sgs")
    query.ids = state.view.hero[actor] ? [String(state.view.hero[actor])] : [];
  if (["sgs.card", "sgs.trick"].includes(key) && state.kind === "sgs") {
    query.key = "sgs.card";
    query.within = "sgs.hand";
    query.ids = state.view.playerHandCard[actor]
      .filter((id) => key !== "sgs.trick" || !!cards.get(id))
      .map(String);
  }
  if (key === "dy.card") query.within = "dy.hand";
  if (["ccbs.score", "dy.score"].includes(key)) query.player = actor;
  return query;
}
