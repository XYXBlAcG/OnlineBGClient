import { CheckersRules } from "../domain/checkers";
import { UpstreamRuntime } from "../upstream/runtime";
import type { GuideSnapshot } from "./guide-position";
export const guideTargetKeys = [
  "expedition.card",
  "expedition.intent",
  "expedition.mechanic",
  "expedition.status",
  "expedition.party",
  "expedition.profession",
  "expedition.map",
  "expedition.scene",
  "expedition.actions",
  "expedition.hand",
  "expedition.rewards",
  "expedition.shop",
  "expedition.choices",
  "dominion.supply",
  "dominion.hand",
  "dominion.actions",
  "dominion.status",
  "dominion.players",
  "dominion.choice",
  "gw.soldier",
  "gw.axes",
  "gw.terrain",
  "gw.formula",
  "gw.controls",
  "gw.fire",
  "gw.storm",
  "scmj.hand",
  "scmj.tile",
  "scmj.lack",
  "scmj.lack-option",
  "scmj.actions",
  "scmj.action",
  "scmj.exchange",
  "scmj.discard",
  "scmj.river",
  "scmj.river-tile",
  "scmj.melds",
  "scmj.meld",
  "scmj.score",
  "scmj.match",
  "ccbs.market",
  "ccbs.bank",
  "ccbs.buy",
  "ccbs.noble",
  "ccbs.score",
  "dy.card",
  "dy.hand",
  "dy.play",
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
  "tq.special",
  "fxq.players",
  "fxq.turn",
  "fxq.roll",
  "fxq.plane",
  "fxq.landing",
  "fxq.finish",
  "fxq.mode",
  "fxq.weather",
  "fxq.energy",
  "fxq.shield",
  "fxq.boost",
  "fxq.boost-button",
  "fxq.shield-button",
  "fxq.checkpoint",
  "fxq.forecast",
  "fxq.result",
  "uno.hand",
  "uno.top",
  "uno.deck",
  "uno.players",
  "uno.actions",
  "uno.team",
  "ddz.hand",
  "ddz.table",
  "ddz.play",
  "ddz.pass",
] as const;
export type GuideTargetKey = (typeof guideTargetKeys)[number];
export interface TargetQuery {
  key: string;
  selector?: string;
  ids?: string[];
  player?: number;
  within?: string;
  limit: number;
  label: string;
  wait: string;
}
const labels: Record<GuideTargetKey, [string, string]> = {
  "expedition.card": ["查看可用手牌", "等待自己的手牌与可用能量"],
  "expedition.intent": ["查看敌方意图", "进入战斗后可查看敌方意图"],
  "expedition.mechanic": [
    "查看首领机制",
    "首领战开始时会出现机制进度与阶段说明",
  ],
  "expedition.status": ["查看远征状态", "进入相应远征阶段后可定位"],
  "expedition.party": ["查看队友", "进入相应远征阶段后可定位"],
  "expedition.profession": ["查看职业选择", "进入相应远征阶段后可定位"],
  "expedition.map": ["查看路线", "进入相应远征阶段后可定位"],
  "expedition.scene": ["查看敌方意图", "进入相应远征阶段后可定位"],
  "expedition.actions": ["查看战斗操作", "进入相应远征阶段后可定位"],
  "expedition.hand": ["查看我的手牌", "进入相应远征阶段后可定位"],
  "expedition.rewards": ["查看奖励", "进入相应远征阶段后可定位"],
  "expedition.shop": ["查看商店", "进入相应远征阶段后可定位"],
  "expedition.choices": ["查看当前选择", "进入相应远征阶段后可定位"],

  "dominion.supply": ["查看供应牌堆", "等待领土开局"],
  "dominion.hand": ["查看我的手牌", "等待发牌"],
  "dominion.actions": ["查看阶段操作", "等待轮到自己"],
  "dominion.status": ["查看行动、购买与金币", "等待领土开局"],
  "dominion.players": ["查看玩家与牌库数量", "等待开局"],
  "dominion.choice": ["查看当前卡牌效果", "打出需要选择的牌后会出现"],
  "gw.soldier": ["查看当前发射士兵", "等待战场出现"],
  "gw.axes": ["查看坐标轴", "等待战场出现"],
  "gw.terrain": ["查看障碍", "当前是开阔战场；浮岛或堡垒地图才有障碍"],
  "gw.formula": ["查看函数输入框", "当前为回放或对局已结束"],
  "gw.controls": ["查看发射操作", "当前为回放或对局已结束"],
  "gw.fire": ["查看发射按钮", "当前为回放或对局已结束"],
  "gw.storm": ["查看风暴风场", "当前不是风暴航线或对局未开始"],
  "scmj.hand": ["查看自己的麻将手牌", "等待发牌"],
  "scmj.tile": ["查看单张手牌", "等待发牌"],
  "scmj.lack": ["查看定缺花色", "等待手牌出现"],
  "scmj.lack-option": ["查看定缺按钮", "轮到你定缺时出现"],
  "scmj.actions": ["查看当前合法操作", "等待换牌、定缺或轮到自己行动"],
  "scmj.action": ["查看具体操作按钮", "等待当前合法操作出现"],
  "scmj.exchange": ["查看确认换三张按钮", "选满三张同花色牌后出现"],
  "scmj.discard": ["查看出牌按钮", "轮到你出牌时出现"],
  "scmj.river": ["查看弃牌河", "等待玩家出牌"],
  "scmj.river-tile": ["查看弃牌河里的牌", "等待玩家出牌"],
  "scmj.melds": ["查看碰杠组合", "等待自己碰牌或杠牌"],
  "scmj.meld": ["查看具体碰杠组合", "等待自己碰牌或杠牌"],
  "scmj.score": ["查看玩家得分", "等待牌桌出现"],
  "scmj.match": ["查看东风战进度", "当前不是东风战或对局未开始"],
  "ccbs.market": ["查看发展卡", "等待市场发展卡出现"],
  "ccbs.bank": ["查看银行宝石", "等待银行宝石出现；选择颜色前先点击取宝石"],
  "ccbs.buy": ["查看购买按钮", "等待轮到你，再选择购买发展卡"],
  "ccbs.noble": ["查看贵族要求", "等待贵族出现"],
  "ccbs.score": ["查看我的声望", "等待玩家计分区出现"],
  "dy.card": ["查看我的牌", "等待发牌"],
  "dy.hand": ["查看我的手牌", "等待发牌"],
  "dy.play": ["查看出牌按钮", "轮到你出牌时出现"],
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
  "tq.special": ["查看据点攻防状态", "当前不是据点攻防或对局未开始"],
  "fxq.players": ["查看玩家头像", "展开玩家区后可定位"],
  "fxq.turn": ["查看当前回合头像", "展开玩家区并轮到自己时可定位"],
  "fxq.roll": ["查看掷骰子按钮", "等待轮到自己"],
  "fxq.plane": ["查看可移动飞机", "先掷骰子，再查看高亮飞机"],
  "fxq.landing": ["查看预计落点", "先掷骰子并出现合法飞机"],
  "fxq.finish": ["查看自己的终点", "等待飞行棋开局"],
  "fxq.mode": ["查看航线模式", "等待飞行棋开局"],
  "fxq.weather": ["查看本轮天气", "当前不是风暴航线或对局未开始"],
  "fxq.energy": ["查看能量", "当前不是风暴航线或对局未开始"],
  "fxq.shield": ["查看护盾", "当前不是风暴航线或对局未开始"],
  "fxq.boost": ["查看加速层数", "当前不是风暴航线或对局未开始"],
  "fxq.boost-button": ["查看加速按钮", "当前没有可用能量或已经移动"],
  "fxq.shield-button": ["查看护盾按钮", "当前没有可用能量或已经移动"],
  "fxq.checkpoint": ["查看补给点", "当前不是风暴航线或对局未开始"],
  "fxq.forecast": ["查看本回合公式", "先掷骰子并出现合法飞机"],
  "fxq.result": ["查看移动结果", "完成一次移动或特殊能力后出现"],
  "uno.hand": ["查看自己的 UNO 手牌", "等待 UNO 开局"],
  "uno.top": ["查看当前弃牌顶", "等待 UNO 开局"],
  "uno.deck": ["查看摸牌堆", "等待 UNO 开局"],
  "uno.players": ["查看其他玩家手牌数", "等待 UNO 开局"],
  "uno.actions": ["查看出牌与摸牌操作", "等待轮到自己"],
  "uno.team": ["查看队伍状态", "当前不是 UNO 组队模式"],
  "ddz.hand": ["查看自己的斗地主手牌", "等待斗地主开局"],
  "ddz.table": ["查看桌面出的牌", "等待斗地主开局"],
  "ddz.play": ["查看出牌按钮", "轮到你出牌时出现"],
  "ddz.pass": ["查看不要按钮", "轮到你跟牌时出现"],
};
const upstreamSelectors: Partial<Record<GuideTargetKey, string>> = {
  "fxq.players": ".flex.justify-evenly .game-avatar",
  "fxq.turn": ".flex.justify-evenly .game-avatar.is-turn",
  "fxq.roll": ".text-center button.primary",
  "fxq.plane": ".fxq-selectable-plane",
  "fxq.landing": ".flight-landing-marker circle",
  "fxq.finish": ".flight-finish-marker circle",
  "fxq.mode": '[data-guide-target="fxq.mode"]',
  "fxq.weather": '[data-guide-target="fxq.weather"]',
  "fxq.energy": '[data-guide-target="fxq.energy"]',
  "fxq.shield": '[data-guide-target="fxq.shield"]',
  "fxq.boost": '[data-guide-target="fxq.boost"]',
  "fxq.boost-button": '[data-guide-target="fxq.boost-button"]',
  "fxq.shield-button": '[data-guide-target="fxq.shield-button"]',
  "fxq.checkpoint": ".flight-checkpoint-marker circle",
  "fxq.forecast": '[data-guide-target="fxq.forecast"]',
  "fxq.result": '[data-guide-target="fxq.result"]',
  "uno.hand": ".uno-list > .uno",
  "uno.top": ".uno-last-card",
  "uno.deck": '[data-motion-zone="uno.deck"]',
  "uno.players": '[data-table-region="players"] .w-36 > div',
  "uno.actions": '[data-table-region="hand"] > .flex.flex-wrap > button',
  "ddz.hand": ".ddz-my-poker",
  "ddz.table": ".ddz-poker-list:not(:has(.ddz-my-poker)) .ddz-poker",
  "ddz.play": '.original-game[data-game="ddz"] button.primary',
  "ddz.pass":
    '.original-game[data-game="ddz"] .mx-4.flex.justify-center.space-x-8 > button:not(.primary)',
  "scmj.hand": ".scmj-hand .scmj-tile",
  "scmj.tile": ".scmj-hand .scmj-tile",
  "scmj.lack-option": ".scmj-actions .primary-button",
  "scmj.actions": ".scmj-actions button",
  "scmj.action": ".scmj-actions button",
  "scmj.exchange": '[data-guide-target="scmj.exchange"]',
  "scmj.discard": '[data-guide-target="scmj.discard"]',
  "scmj.river": ".scmj-river-tile",
  "scmj.river-tile": ".scmj-river-tile",
  "scmj.melds": ".scmj-meld",
  "scmj.meld": ".scmj-meld",
  "scmj.score": '[data-guide-target="scmj.score"]',
  "dominion.supply": ".dominion-supply-grid .dominion-card",
  "dominion.hand": ".dominion-hand .dominion-card",
  "dominion.actions": ".dominion-actions button",
  "dominion.status": ".dominion-resources span",
  "dominion.players": ".dominion-players > div",
  "dominion.choice": ".dominion-choice-actions button",
  "ktd.hand": ".catan-hand-panel .my-1",
  "dy.hand": '[data-room-region="dy.hand"] .dy-card',
  "dy.play": '[data-room-region="dy.hand"] button.primary',
  "sgs.hand": ".sgs-hand-panel .sgs-card",
  "sgs.card": ".sgs-hand-panel .sgs-card",
  "sgs.trick": ".sgs-hand-panel .sgs-card",
  "sgs.hero": ".sgs-hero",
  "gw.fire":
    '.original-game[data-game="graphwar"] .gw-input-row button.primary-button',
  "expedition.status": ".exp-resource",
  "expedition.party": ".exp-party > div",
  "expedition.profession": ".exp-professions > button",
  "expedition.map": ".exp-route-options > button",
  "expedition.scene": ".exp-enemies .exp-enemy",
  "expedition.actions": ".exp-table-controls > button",
  "expedition.hand": ".exp-table-hand .exp-card",
  "expedition.rewards": ".exp-reward-cards .exp-card",
  "expedition.shop": ".exp-shop > article",
  "expedition.choices":
    ".exp-event-options > button, .exp-relic-choices > button, .exp-node-actions > button",
};
const checkers = new CheckersRules(new UpstreamRuntime());
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
      : [
            "fxq.players",
            "uno.team",
            "dominion.players",
            "expedition.status",
            "expedition.party",
          ].includes(key)
        ? 4
        : [
              "fxq.plane",
              "fxq.landing",
              "uno.hand",
              "uno.players",
              "uno.actions",
              "ddz.table",
              "scmj.hand",
              "scmj.tile",
              "scmj.river",
              "scmj.river-tile",
              "scmj.actions",
              "scmj.action",
              "scmj.melds",
              "scmj.meld",
              "dominion.hand",
              "dominion.actions",
              "dominion.choice",
              "ktd.hand",
              "dy.hand",
              "sgs.hand",
              "sgs.card",
              "sgs.trick",
              "gw.fire",
              "expedition.scene",
              "expedition.actions",
              "expedition.hand",
              "expedition.shop",
              "expedition.choices",
            ].includes(key)
          ? 8
          : [
                "fxq.checkpoint",
                "dy.pot",
                "dominion.status",
                "scmj.lack-option",
                "expedition.profession",
                "expedition.map",
                "expedition.rewards",
                "ccbs.market",
                "ccbs.bank",
                "ccbs.buy",
                "ccbs.noble",
              ].includes(key)
            ? 5
            : key === "ddz.hand"
              ? 8
              : 1,
  };
  query.selector = upstreamSelectors[key];
  if (!snapshot?.state || snapshot.actor < 0) return query;
  const { state, actor, candidates } = snapshot;
  if (key === "expedition.card" && state.kind === "expedition") {
    query.within = "expedition.hand";
    query.ids = [
      ...new Set(
        candidates.flatMap((c) =>
          c.action.type === "expedition-action" && c.action.move.type === "card"
            ? [c.action.move.instance]
            : [],
        ),
      ),
    ];
  }
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
  if (
    [
      "scmj.river",
      "scmj.river-tile",
      "scmj.melds",
      "scmj.meld",
      "scmj.score",
    ].includes(key)
  )
    query.player = actor;
  if (key === "dy.card") query.within = "dy.hand";
  if (["ccbs.score", "dy.score"].includes(key)) query.player = actor;
  return query;
}
