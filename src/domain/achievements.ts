import { gameCatalogue, gameKinds, type GameKind } from "./catalogue";
import type { ReplayRecord } from "./replay";
import { Replay } from "./replay";
import { catanVictoryPoints } from "./catan";
import type { GameState } from "./types";

import type { AchievementGame, AchievementRarity } from "./achievement-types";
export type { AchievementGame, AchievementRarity } from "./achievement-types";
export interface AchievementDefinition {
  id: string;
  game: AchievementGame;
  mode?: string;
  rarity: AchievementRarity;
  title: string;
  description: string;
  symbol: string;
  hidden?: boolean;
}

const definitions = [
  [
    "fxq.three-sixes",
    "fxq",
    "mythic",
    "三连六",
    "同一局连续三次掷出 6。",
    "🎲",
  ],
  [
    "fxq.storm-ace",
    "fxq",
    "legendary",
    "风暴王牌",
    "风暴航线获胜，并使用过护盾和加速。",
    "🌪",
  ],
  [
    "fxq.zero-crash",
    "fxq",
    "mythic",
    "零坠机",
    "整局没有飞机被撞回机场并获胜。",
    "✈",
  ],
  [
    "fxq.last-grid",
    "fxq",
    "mythic",
    "最后一格",
    "用恰好进入终点的点数完成最后一架飞机。",
    "🏁",
  ],
  [
    "uno.pure-color",
    "uno",
    "legendary",
    "纯色胜利",
    "获胜且整局没有打出万能牌或加四。",
    "🃏",
  ],
  [
    "uno.comeback",
    "uno",
    "mythic",
    "绝地翻盘",
    "曾摸牌 10 张以上后最终获胜。",
    "🔁",
  ],
  [
    "uno.perfect-relay",
    "uno",
    "mythic",
    "完美接力",
    "组队模式获胜，且自己没有打出功能牌。",
    "🤝",
  ],
  [
    "uno.last-zero",
    "uno",
    "epic",
    "压轴零",
    "最后一张牌是数字 0 并获胜。",
    "0️⃣",
  ],
  [
    "ddz.spring",
    "ddz",
    "mythic",
    "春天",
    "地主获胜，且农民一张牌都没有出过。",
    "🌸",
  ],
  [
    "ddz.anti-spring",
    "ddz",
    "mythic",
    "反春天",
    "农民获胜，且地主只出过一手牌。",
    "🌱",
  ],
  [
    "ddz.double-bomb",
    "ddz",
    "legendary",
    "双响炮",
    "同一局自己打出两个炸弹或火箭。",
    "💣",
  ],
  [
    "ddz.one-hand",
    "ddz",
    "mythic",
    "一手清",
    "一次出牌打完全部手牌并获胜。",
    "🖐",
  ],
  [
    "scmj.four-kongs",
    "scmj",
    "mythic",
    "十八罗汉",
    "一局内完成四个杠并胡牌。",
    "🀄",
  ],
  [
    "scmj.pure-seven-pairs",
    "scmj",
    "mythic",
    "清一色七对",
    "清一色七对胡牌。",
    "🀄",
  ],
  [
    "scmj.last-wall",
    "scmj",
    "legendary",
    "海底捞月",
    "摸最后一张牌自摸胡牌。",
    "🌊",
  ],
  [
    "scmj.three-wins",
    "scmj",
    "mythic",
    "一炮三响",
    "一张弃牌同时被三家胡。",
    "💥",
  ],
  [
    "scmj.kokushi",
    "scmj",
    "mythic",
    "国士十三面",
    "国士无双十三面听牌并和牌。",
    "🀄",
    "日本立直",
  ],
  [
    "scmj.four-concealed",
    "scmj",
    "mythic",
    "四暗刻单骑",
    "四暗刻单骑和牌。",
    "🀄",
    "日本立直",
  ],
  [
    "scmj.nine-gates",
    "scmj",
    "mythic",
    "九莲宝灯",
    "九莲宝灯和牌。",
    "🪷",
    "日本立直",
  ],
  [
    "scmj.ippatsu",
    "scmj",
    "legendary",
    "一发",
    "立直后一巡内和牌。",
    "⚡",
    "日本立直",
  ],
  [
    "scmj.under-sea",
    "scmj",
    "legendary",
    "海底摸月",
    "最后一张牌自摸和牌。",
    "🌊",
    "日本立直",
  ],
  [
    "ccbs.no-nobles",
    "ccbs",
    "mythic",
    "无贵族十五分",
    "不靠贵族达到 15 分并获胜。",
    "💎",
  ],
  [
    "ccbs.no-gold",
    "ccbs",
    "legendary",
    "黄金不沾",
    "整局不拿黄金并获胜。",
    "🪙",
  ],
  [
    "ccbs.five-discounts",
    "ccbs",
    "epic",
    "五色折扣",
    "五种颜色都至少有一张永久折扣牌。",
    "🌈",
  ],
  [
    "ccbs.final-buy",
    "ccbs",
    "mythic",
    "最后一手",
    "最后一回合完成购买并获胜。",
    "🛒",
  ],
  ["ktd.no-city", "ktd", "mythic", "无城胜利", "不建城市并获胜。", "🏕"],
  ["ktd.road-15", "ktd", "mythic", "十五路", "最长道路达到 15 条。", "🛣"],
  [
    "ktd.robber-king",
    "ktd",
    "legendary",
    "强盗之王",
    "一局内移动强盗 5 次。",
    "🦹",
  ],
  ["ktd.no-trade", "ktd", "epic", "不交易胜利", "不使用玩家交易并获胜。", "🚫"],
  ["dy.zero", "dy", "mythic", "零罚分", "最终罚分为 0 并获胜。", "0️⃣"],
  [
    "dy.never-take-pot",
    "dy",
    "mythic",
    "从不收锅",
    "整局没有收走任何一口锅并获胜。",
    "🍲",
  ],
  [
    "dy.three-majorities",
    "dy",
    "legendary",
    "三色独尊",
    "三种颜色的收牌数量都独占第一。",
    "🎨",
  ],
  [
    "dy.poison-collector",
    "dy",
    "epic",
    "毒药收藏家",
    "收下 5 张毒药仍获胜。",
    "☠",
  ],
  [
    "sgs.flawless",
    "sgs",
    "mythic",
    "无伤胜利",
    "获胜且整局没有失去体力。",
    "🛡",
  ],
  [
    "sgs.last-stand",
    "sgs",
    "mythic",
    "一血内奸",
    "内奸在 1 点体力时获胜。",
    "🩸",
  ],
  ["sgs.empty-hand", "sgs", "legendary", "空手胜利", "获胜时没有手牌。", "✋"],
  ["sgs.duel-king", "sgs", "epic", "决斗之王", "一局内赢下 3 次决斗。", "⚔"],
  ["tq.all-jumps", "tq", "mythic", "全程跳跃", "获胜且每一步都是跳跃。", "🦘"],
  [
    "tq.long-chain",
    "tq",
    "mythic",
    "极限连跳",
    "单回合完成 10 次以上连续跳。",
    "🔗",
  ],
  [
    "tq.no-enemy-jump",
    "tq",
    "legendary",
    "不借敌跳",
    "整局没有跳过对手棋子并获胜。",
    "🚫",
  ],
  [
    "tq.short-march",
    "tq",
    "epic",
    "最短行军",
    "在规则允许的极少回合内获胜。",
    "🏁",
  ],
  [
    "graphwar.triple-kill",
    "graphwar",
    "mythic",
    "一炮三杀",
    "一次射击命中 3 名敌军。",
    "💥",
  ],
  [
    "graphwar.blind",
    "graphwar",
    "legendary",
    "盲狙",
    "关闭弹道预览并命中敌人。",
    "🎯",
  ],
  [
    "graphwar.no-friendly-fire",
    "graphwar",
    "epic",
    "零友伤",
    "全队无友伤获胜。",
    "🛡",
  ],
  [
    "graphwar.last-soldier",
    "graphwar",
    "mythic",
    "最后一人",
    "仅剩一名 1 HP 士兵时反杀获胜。",
    "🔥",
  ],
  [
    "expedition.n10",
    "expedition",
    "mythic",
    "N10 通关",
    "以 N10 阶位完整通关。",
    "🌌",
  ],
  [
    "expedition.flawless",
    "expedition",
    "legendary",
    "无伤远征",
    "全队全程不掉血通关。",
    "🛡",
  ],
  [
    "expedition.no-shop",
    "expedition",
    "mythic",
    "无商店通关",
    "不购买任何商店商品通关。",
    "🛒",
  ],
  [
    "expedition.one-round-boss",
    "expedition",
    "mythic",
    "一回合首领",
    "首领战首回合击杀首领。",
    "⏱",
  ],
  [
    "dominion.three-provinces",
    "dominion",
    "mythic",
    "一回合三行省",
    "单回合购买 3 张行省。",
    "👑",
  ],
  [
    "dominion.empty-deck",
    "dominion",
    "legendary",
    "抽空牌库",
    "单回合抽完整副牌库并洗回。",
    "♻",
  ],
  [
    "dominion.starting-cards",
    "dominion",
    "mythic",
    "初始牌胜利",
    "不购买任何王国牌并获胜。",
    "🃏",
  ],
  [
    "dominion.three-piles",
    "dominion",
    "legendary",
    "三堆终局",
    "通过清空三堆供应结束并获胜。",
    "📦",
  ],
  ["fxq.double-six", "fxq", "rare", "双六连掷", "连续两次掷出 6。", "🎲"],
  [
    "fxq.specialist",
    "fxq",
    "epic",
    "道具大师",
    "一局内使用 5 次特殊能力。",
    "🛠",
  ],
  [
    "uno.minimal-draw",
    "uno",
    "rare",
    "精准手牌",
    "获胜且摸牌不超过 2 张。",
    "🎯",
  ],
  [
    "uno.wild-storm",
    "uno",
    "epic",
    "万能风暴",
    "获胜且打出至少 3 张万能牌或 +4。",
    "🌈",
  ],
  [
    "ddz.triple-bomb",
    "ddz",
    "mythic",
    "三连爆破",
    "一局内打出 3 个炸弹或火箭。",
    "💥",
  ],
  [
    "ddz.farmer-duo",
    "ddz",
    "epic",
    "农民同心",
    "农民获胜，且两名农民都至少出过 3 手牌。",
    "🤝",
  ],
  ["scmj.pure-suit", "scmj", "epic", "清一色", "以清一色胡牌。", "🀄"],
  ["scmj.two-kongs", "scmj", "rare", "双杠", "一局内完成至少 2 个杠。", "🀫"],
  [
    "ccbs.noble-trio",
    "ccbs",
    "epic",
    "贵族满堂",
    "一局内获得至少 3 位贵族。",
    "👑",
  ],
  [
    "ccbs.gem-hoard",
    "ccbs",
    "rare",
    "宝石囤积",
    "获胜时持有至少 15 枚宝石。",
    "💎",
  ],
  [
    "ktd.city-builder",
    "ktd",
    "epic",
    "城市巨匠",
    "一局内建造至少 3 座城市。",
    "🏙",
  ],
  ["ktd.road-10", "ktd", "rare", "十路通达", "最长路达到 10 条。", "🛤"],
  [
    "dy.color-trio",
    "dy",
    "rare",
    "三色毒师",
    "同一种颜色收集至少 3 张。",
    "🧪",
  ],
  ["dy.big-pot", "dy", "epic", "满锅而归", "一局内收集至少 10 张牌。", "🍯"],
  ["sgs.warlord", "sgs", "epic", "乱世枭雄", "一局内造成至少 5 次伤害。", "⚔"],
  ["sgs.quick-victory", "sgs", "rare", "速战速决", "在 20 个动作内获胜。", "⏱"],
  ["tq.mega-chain", "tq", "epic", "超级连跳", "单次连跳至少 7 格。", "🦘"],
  ["tq.fast-win", "tq", "rare", "快步如飞", "在 15 回合内获胜。", "🏁"],
  [
    "graphwar.big-hit",
    "graphwar",
    "epic",
    "重炮轰击",
    "单发炮弹造成至少 50 点伤害。",
    "💣",
  ],
  [
    "graphwar.marksman",
    "graphwar",
    "rare",
    "神射手",
    "一局内至少 5 次命中敌人。",
    "🎯",
  ],
  [
    "expedition.relic-hoarder",
    "expedition",
    "epic",
    "遗物收藏家",
    "一局内为队伍收集至少 5 件遗物。",
    "🗝",
  ],
  [
    "expedition.battles-5",
    "expedition",
    "rare",
    "百战余生",
    "一局内赢得至少 5 场战斗。",
    "⚔",
  ],
  [
    "dominion.big-turn",
    "dominion",
    "epic",
    "豪购回合",
    "单回合购买至少 3 张牌。",
    "🛒",
  ],
  [
    "dominion.busy-market",
    "dominion",
    "rare",
    "市场常客",
    "一局内购买至少 10 张牌。",
    "🏪",
  ],
  ["pool.fast-finish", "pool", "epic", "速胜", "5 杆内结束对局并获胜。", "🎱"],
  [
    "pool.clean-win",
    "pool",
    "legendary",
    "零封对手",
    "对手没有上场就获胜。",
    "🏆",
  ],
  ["pool.double-pot", "pool", "epic", "双球入袋", "一杆打进两颗目标球。", "🎯"],
] as const;

const appDefinitions = [
  [
    "app.first-launch",
    "common",
    "初次启程",
    "启动 OnlineBGClient 一次。",
    "📦",
    "launches",
    1,
  ],
  [
    "app.launch-30",
    "rare",
    "常客",
    "累计启动 OnlineBGClient 30 次。",
    "🚪",
    "launches",
    30,
  ],
  [
    "app.launch-100",
    "legendary",
    "百次归来",
    "累计启动 OnlineBGClient 100 次。",
    "🏠",
    "launches",
    100,
  ],
  [
    "app.first-multiplayer",
    "common",
    "第一次联机",
    "第一次和朋友开始联机对局。",
    "🤝",
    "multiplayer",
    1,
  ],
  [
    "app.multiplayer-10",
    "rare",
    "固定车队",
    "累计开始 10 场联机对局。",
    "🚂",
    "multiplayer",
    10,
  ],
  [
    "app.multiplayer-100",
    "legendary",
    "百场同游",
    "累计开始 100 场联机对局。",
    "🌐",
    "multiplayer",
    100,
  ],
  [
    "app.first-completion",
    "common",
    "第一次通关",
    "第一次完成一局游戏。",
    "🎉",
    "completions",
    1,
  ],
  [
    "app.completion-10",
    "rare",
    "十局达成",
    "累计完成 10 局游戏。",
    "✅",
    "completions",
    10,
  ],
  [
    "app.completion-100",
    "legendary",
    "百局里程碑",
    "累计完成 100 局游戏。",
    "🏆",
    "completions",
    100,
  ],
  [
    "app.first-win",
    "common",
    "首次胜利",
    "第一次赢下一局游戏。",
    "🥇",
    "wins",
    1,
  ],
  ["app.win-50", "epic", "常胜将军", "累计赢下 50 局游戏。", "👑", "wins", 50],
  [
    "app.hours-10",
    "rare",
    "十小时",
    "累计游玩 10 小时。",
    "⏳",
    "playSeconds",
    10 * 60 * 60,
  ],
  [
    "app.hours-100",
    "mythic",
    "百小时",
    "累计游玩 100 小时。",
    "🕰",
    "playSeconds",
    100 * 60 * 60,
  ],
  [
    "app.games-10",
    "rare",
    "博闻多识",
    "在 10 款不同游戏中完成对局。",
    "🎲",
    "games",
    10,
  ],
  [
    "app.games-all",
    "legendary",
    "全游戏制霸",
    "在全部游戏中完成对局。",
    "🎮",
    "games",
    gameKinds.length,
  ],
] as const;
export type AppAchievementMetric =
  "launches" | "playSeconds" | "multiplayer" | "completions" | "wins" | "games";
export interface AppAchievementDefinition extends AchievementDefinition {
  game: "app";
  metric: AppAchievementMetric;
  threshold: number;
}
const appAchievementDefinitions: readonly AppAchievementDefinition[] =
  appDefinitions.map(
    ([id, rarity, title, description, symbol, metric, threshold]) => ({
      id,
      game: "app",
      rarity: rarity as AchievementRarity,
      title,
      description,
      symbol,
      metric,
      threshold,
    }),
  );
const progressDefinitions: readonly AchievementDefinition[] = gameKinds.flatMap(
  (kind) => [
    {
      id: `${kind}.first-clear`,
      game: kind,
      rarity: "common",
      title: "首次通关",
      description: `在${gameCatalogue[kind].name}中完成一局。`,
      symbol: "✓",
    },
    {
      id: `${kind}.first-win`,
      game: kind,
      rarity: "common",
      title: "首胜",
      description: `在${gameCatalogue[kind].name}中完成一局并获胜。`,
      symbol: "★",
    },
    {
      id: `${kind}.veteran`,
      game: kind,
      rarity: "rare",
      title: "十局",
      description: `在${gameCatalogue[kind].name}中完成 10 局。`,
      symbol: "◆",
    },
  ],
);
type BaseAchievementId = (typeof definitions)[number][0];
type ProgressAchievementId =
  `${GameKind}.first-clear` | `${GameKind}.first-win` | `${GameKind}.veteran`;
type AppAchievementId = (typeof appDefinitions)[number][0];
export type AchievementId =
  BaseAchievementId | ProgressAchievementId | AppAchievementId;
export const achievementDefinitions: readonly AchievementDefinition[] = [
  ...definitions.map(
    ([id, game, rarity, title, description, symbol, mode]) => ({
      id,
      game: game as GameKind,
      rarity: rarity as AchievementRarity,
      title,
      description,
      symbol,
      mode: mode as string | undefined,
    }),
  ),
  ...progressDefinitions,
  ...appAchievementDefinitions,
];
export interface AchievementEvidence {
  room: string;
  startedAt: number;
  rulesVersion: string;
  actor: number;
  seatName: string;
  replayFingerprint: string;
  summary: string;
}
export interface AchievementUnlock {
  profileId: string;
  achievementId: string;
  firstAt: number;
  lastAt: number;
  count: number;
  evidence: AchievementEvidence;
}
export const achievementById = new Map(
  achievementDefinitions.map((definition) => [definition.id, definition]),
);
export function achievementsForGame(game: AchievementGame) {
  return achievementDefinitions.filter(
    (definition) => definition.game === game,
  );
}

export interface AppStats {
  profileId: string;
  launches: number;
  playSeconds: number;
  multiplayer: number;
  completions: number;
  wins: number;
  gameCompletions: Partial<Record<GameKind, number>>;
  gameWins: Partial<Record<GameKind, number>>;
  seenPlays: string[];
  seenCompletions: string[];
  updatedAt: number;
}
const trackedPlays = 2000;
export function defaultAppStats(profileId: string): AppStats {
  return {
    profileId,
    launches: 0,
    playSeconds: 0,
    multiplayer: 0,
    completions: 0,
    wins: 0,
    gameCompletions: {},
    gameWins: {},
    seenPlays: [],
    seenCompletions: [],
    updatedAt: 0,
  };
}
export function recordAppLaunch(stats: AppStats): AppStats {
  return {
    ...stats,
    launches: stats.launches + 1,
    updatedAt: Date.now(),
  };
}
export function recordAppPlayTime(stats: AppStats, seconds: number): AppStats {
  if (seconds <= 0) return stats;
  return {
    ...stats,
    playSeconds: stats.playSeconds + seconds,
    updatedAt: Date.now(),
  };
}
export function recordAppPlaySession(
  stats: AppStats,
  playId: string,
  multiplayer: boolean,
): AppStats {
  if (stats.seenPlays.includes(playId)) return stats;
  return {
    ...stats,
    multiplayer: stats.multiplayer + (multiplayer ? 1 : 0),
    seenPlays: [...stats.seenPlays, playId].slice(-trackedPlays),
    updatedAt: Date.now(),
  };
}
export function recordAppCompletion(
  stats: AppStats,
  playId: string,
  kind: GameKind,
  win: boolean,
): AppStats {
  if (stats.seenCompletions.includes(playId)) return stats;
  return {
    ...stats,
    completions: stats.completions + 1,
    wins: stats.wins + (win ? 1 : 0),
    gameCompletions: {
      ...stats.gameCompletions,
      [kind]: (stats.gameCompletions[kind] ?? 0) + 1,
    },
    gameWins: win
      ? { ...stats.gameWins, [kind]: (stats.gameWins[kind] ?? 0) + 1 }
      : stats.gameWins,
    seenCompletions: [...stats.seenCompletions, playId].slice(-trackedPlays),
    updatedAt: Date.now(),
  };
}
export function evaluateAppAchievements(stats: AppStats): AchievementId[] {
  const result: AchievementId[] = [];
  const games = gameKinds.filter(
    (kind) => (stats.gameCompletions[kind] ?? 0) > 0,
  ).length;
  for (const definition of appAchievementDefinitions) {
    const value =
      definition.metric === "games"
        ? games
        : definition.metric === "playSeconds"
          ? stats.playSeconds
          : stats[definition.metric];
    if (value >= definition.threshold)
      result.push(definition.id as AppAchievementId);
  }
  for (const kind of gameKinds) {
    if ((stats.gameCompletions[kind] ?? 0) > 0)
      result.push(`${kind}.first-clear`);
    if ((stats.gameWins[kind] ?? 0) > 0) result.push(`${kind}.first-win`);
    if ((stats.gameCompletions[kind] ?? 0) >= 10)
      result.push(`${kind}.veteran`);
  }
  return result;
}

type ActionEvent = Extract<ReplayRecord["events"][number], { type: "action" }>;
interface ActionStep {
  event: ActionEvent;
  before: GameState;
  after: GameState;
}

function actionSteps(record: ReplayRecord, frames: GameState[]): ActionStep[] {
  const steps: ActionStep[] = [];
  record.events.forEach((event, index) => {
    if (event.type !== "action") return;
    const before = frames[index],
      after = frames[index + 1];
    if (before && after) steps.push({ event, before, after });
  });
  return steps;
}
const played = (steps: ActionStep[], actor: number) =>
  steps.filter((step) => step.event.actor === actor);
function rank(card: number) {
  return Math.floor((card - 1) / 4);
}
function unoWinner(state: GameState, actor: number) {
  if (state.kind !== "uno") return false;
  const view = state.view;
  return view.teamMode
    ? view.teamWinner === view.teams?.[actor]
    : view.isEnd && (view.playerFinish[actor] ?? 0) > 0;
}
function isWinner(state: GameState, actor: number) {
  switch (state.kind) {
    case "uno":
      return unoWinner(state, actor);
    case "ddz":
      return state.view.isFinish && state.view.winner === actor + 1;
    case "ccbs":
      return state.view.winner.includes(actor);
    case "dominion":
      return state.view.winners.includes(actor);
    case "graphwar":
      return state.view.winner === actor;
    case "fxq":
      return state.view.winners.includes(actor);
    case "scmj":
      return state.view.wins.some((win) => win.player === actor);
    case "tq":
      return state.view.winnerId.includes(actor);
    case "sgs":
      return state.view.winners.includes(actor);
    case "expedition":
      return state.view.phase === "won";
    case "dy":
      return (
        state.view.finish === 1 &&
        state.view.scores[actor] <= Math.min(...state.view.scores)
      );
    case "ktd": {
      const scores = state.view.playerData.map((_, index) =>
        catanVictoryPoints(state.view, index),
      );
      return scores[actor] === Math.max(...scores);
    }
    case "pool":
      return state.view.winner === actor;
  }
  return false;
}

function fxqAchievements(steps: ActionStep[], final: GameState, actor: number) {
  const result: AchievementId[] = [];
  const rolls = played(steps, actor).filter(
    (step) => step.event.action.type === "fxq-roll",
  );
  if (
    rolls.some(
      (step) =>
        step.after.kind === "fxq" &&
        step.after.view.lastDice === 6 &&
        step.after.view.sixTimes >= 3,
    )
  )
    result.push("fxq.three-sixes");
  let previousSix = false;
  for (const step of rolls) {
    const six = step.after.kind === "fxq" && step.after.view.lastDice === 6;
    if (six && previousSix) {
      result.push("fxq.double-six");
      break;
    }
    previousSix = six;
  }
  if (
    played(steps, actor).filter(
      (step) => step.event.action.type === "fxq-special",
    ).length >= 5
  )
    result.push("fxq.specialist");
  const abilities = new Set(
    played(steps, actor)
      .filter((step) => step.event.action.type === "fxq-special")
      .map((step) =>
        step.event.action.type === "fxq-special"
          ? step.event.action.ability
          : "",
      ),
  );
  if (
    final.kind === "fxq" &&
    final.view.special &&
    isWinner(final, actor) &&
    abilities.has("boost") &&
    abilities.has("shield")
  )
    result.push("fxq.storm-ace");
  let crashed = false;
  for (const step of steps) {
    if (step.before.kind !== "fxq" || step.after.kind !== "fxq") continue;
    if (step.event.actor === actor) continue;
    for (let plane = actor * 4; plane < actor * 4 + 4; plane++)
      if (
        step.before.view.planePositionList[plane] > 0 &&
        step.after.view.planePositionList[plane] === 0
      )
        crashed = true;
  }
  if (!crashed && isWinner(final, actor)) result.push("fxq.zero-crash");
  if (final.kind === "fxq" && isWinner(final, actor)) {
    for (const step of played(steps, actor)) {
      if (step.event.action.type !== "fxq-move") continue;
      if (step.before.kind !== "fxq" || step.after.kind !== "fxq") continue;
      const plane = step.event.action.plane;
      if (
        step.before.view.planePositionList[plane] +
          step.before.view.lastDice ===
          57 &&
        step.after.view.planePositionList[plane] >= 57
      ) {
        result.push("fxq.last-grid");
        break;
      }
    }
  }
  return result;
}

function unoAchievements(steps: ActionStep[], final: GameState, actor: number) {
  const result: AchievementId[] = [];
  if (!unoWinner(final, actor)) return result;
  const own = played(steps, actor);
  const wild = own.some(
    (step) =>
      step.event.action.type === "uno-play" && step.event.action.card % 25 > 13,
  );
  if (!wild) result.push("uno.pure-color");
  const draws = own.filter(
    (step) => step.event.action.type === "uno-draw",
  ).length;
  if (draws >= 10) result.push("uno.comeback");
  if (draws <= 2) result.push("uno.minimal-draw");
  const wilds = own.filter(
    (step) =>
      step.event.action.type === "uno-play" && step.event.action.card % 25 > 13,
  ).length;
  if (wilds >= 3) result.push("uno.wild-storm");
  const functional = own.some(
    (step) =>
      step.event.action.type === "uno-play" &&
      step.event.action.card % 25 >= 10,
  );
  if (
    final.kind === "uno" &&
    final.view.teamMode &&
    final.view.teamWinner === final.view.teams?.[actor] &&
    !functional
  )
    result.push("uno.perfect-relay");
  const last = own
    .filter((step) => step.event.action.type === "uno-play")
    .at(-1);
  if (
    last?.event.action.type === "uno-play" &&
    last.event.action.card % 25 === 0
  )
    result.push("uno.last-zero");
  return result;
}

function ddzAchievements(steps: ActionStep[], final: GameState, actor: number) {
  if (final.kind !== "ddz" || !final.view.isFinish) return [];
  const result: AchievementId[] = [];
  const view = final.view,
    landlord = view.landlordId - 1;
  const own = played(steps, actor);
  const farmerPlays = steps.filter(
    (step) =>
      step.event.action.type === "ddz-play" && step.event.actor !== landlord,
  );
  if (view.landlordWin && landlord === actor && !farmerPlays.length)
    result.push("ddz.spring");
  const landlordPlays = steps.filter(
    (step) =>
      step.event.action.type === "ddz-play" && step.event.actor === landlord,
  );
  if (!view.landlordWin && landlord === actor && landlordPlays.length <= 1)
    return result;
  if (!view.landlordWin && actor !== landlord && landlordPlays.length <= 1)
    result.push("ddz.anti-spring");
  if (!view.landlordWin && actor !== landlord) {
    const farmers = [0, 1, 2].filter((index) => index !== landlord);
    if (
      farmers.every(
        (farmer) =>
          steps.filter(
            (step) =>
              step.event.actor === farmer &&
              step.event.action.type === "ddz-play",
          ).length >= 3,
      )
    )
      result.push("ddz.farmer-duo");
  }
  let bombs = 0;
  for (const step of own) {
    if (step.event.action.type !== "ddz-play") continue;
    const cards = step.event.action.cards;
    if (
      (cards.length === 4 && new Set(cards.map(rank)).size === 1) ||
      (cards.length === 2 && cards.some((card) => card >= 53))
    )
      bombs++;
  }
  if (bombs >= 2) result.push("ddz.double-bomb");
  if (bombs >= 3) result.push("ddz.triple-bomb");
  for (const step of own) {
    if (step.event.action.type !== "ddz-play") continue;
    if (step.before.kind !== "ddz") continue;
    if (
      step.before.view.playerCardLists[actor + 1]?.length ===
      step.event.action.cards.length
    )
      result.push("ddz.one-hand");
  }
  return [...new Set(result)];
}

function scmjAchievements(final: GameState, actor: number) {
  if (final.kind !== "scmj") return [];
  const result: AchievementId[] = [];
  const view = final.view;
  const win = view.wins.find((item) => item.player === actor);
  if (!win) return result;
  const labels = win.labels.join(" ");
  const kongs = view.melds[actor].filter((meld) =>
    ["kong", "added", "closed"].includes(meld.type),
  ).length;
  if (kongs >= 4) result.push("scmj.four-kongs");
  if (labels.includes("清一色") && labels.includes("七对"))
    result.push("scmj.pure-seven-pairs");
  if (labels.includes("清一色")) result.push("scmj.pure-suit");
  if (kongs >= 2) result.push("scmj.two-kongs");
  if (
    view.wall.length === 0 &&
    (win.from === actor || view.lastDraw?.actor === actor)
  )
    result.push("scmj.last-wall");
  if (
    view.wins.length >= 3 &&
    new Set(view.wins.map((item) => item.tile)).size === 1
  )
    result.push("scmj.three-wins");
  if (labels.includes("国士") && labels.includes("十三面"))
    result.push("scmj.kokushi");
  if (labels.includes("四暗刻") && labels.includes("单骑"))
    result.push("scmj.four-concealed");
  if (labels.includes("九莲宝灯")) result.push("scmj.nine-gates");
  if (labels.includes("一发")) result.push("scmj.ippatsu");
  if (labels.includes("海底")) result.push("scmj.under-sea");
  return result;
}

function ccbsAchievements(
  steps: ActionStep[],
  final: GameState,
  actor: number,
) {
  if (!isWinner(final, actor) || final.kind !== "ccbs") return [];
  const result: AchievementId[] = [];
  const view = final.view;
  if (view.playerScore[actor] >= 15 && !view.playerNoble[actor].length)
    result.push("ccbs.no-nobles");
  let gold = false;
  for (const step of steps) {
    if (step.after.kind === "ccbs" && step.after.view.playerGem[actor]?.[5] > 0)
      gold = true;
  }
  if (!gold) result.push("ccbs.no-gold");
  if (view.playerCardCount[actor]?.every((count) => count > 0))
    result.push("ccbs.five-discounts");
  if (view.playerNoble[actor].length >= 3) result.push("ccbs.noble-trio");
  if (
    (view.playerGem[actor] ?? []).reduce((sum, count) => sum + count, 0) >= 15
  )
    result.push("ccbs.gem-hoard");
  const last = played(steps, actor).at(-1);
  if (
    last?.event.action.type === "ccbs-action" &&
    last.event.action.move.kind === "buy"
  )
    result.push("ccbs.final-buy");
  return result;
}

function ktdAchievements(steps: ActionStep[], final: GameState, actor: number) {
  if (final.kind !== "ktd" || !isWinner(final, actor)) return [];
  const result: AchievementId[] = [];
  const view = final.view,
    player = view.playerData[actor];
  if (player.houses.every((house) => !(house & 1))) result.push("ktd.no-city");
  if (
    (view.bankData.longestRoad >= 15 &&
      view.bankData.longestRoadPos === actor + 1) ||
    player.longestRoad >= 15
  )
    result.push("ktd.road-15");
  if (
    (view.bankData.longestRoad >= 10 &&
      view.bankData.longestRoadPos === actor + 1) ||
    player.longestRoad >= 10
  )
    result.push("ktd.road-10");
  if (player.houses.filter((house) => house & 1).length >= 3)
    result.push("ktd.city-builder");
  if (
    (view.bankData.maxRobberCount >= 5 &&
      view.bankData.maxRobberCountPos === actor + 1) ||
    player.robberCount >= 5
  )
    result.push("ktd.robber-king");
  const traded = played(steps, actor).some(
    (step) =>
      step.event.action.type === "ktd-action" &&
      ["trade", "respond"].includes(step.event.action.move.kind),
  );
  if (!traded) result.push("ktd.no-trade");
  return result;
}

function dyAchievements(final: GameState, actor: number) {
  if (final.kind !== "dy" || !isWinner(final, actor)) return [];
  const result: AchievementId[] = [];
  const view = final.view;
  if (view.scores[actor] === 0) result.push("dy.zero");
  if (!view.eats[actor].length) result.push("dy.never-take-pot");
  const counts = [0, 0, 0, 0];
  for (const card of view.eats[actor]) counts[Math.floor(card / 20) + 1] += 1;
  const others = view.eats.map((cards, index) => {
    if (index === actor) return [0, 0, 0, 0];
    const values = [0, 0, 0, 0];
    for (const card of cards) values[Math.floor(card / 20) + 1] += 1;
    return values;
  });
  if (
    [1, 2, 3].every((color) =>
      others.every((values) => counts[color] > values[color]),
    )
  )
    result.push("dy.three-majorities");
  if (
    view.eats[actor].filter((card) => Math.floor(card / 20) === 0).length >= 5
  )
    result.push("dy.poison-collector");
  if (counts.slice(1).some((count) => count >= 3)) result.push("dy.color-trio");
  if (view.eats[actor].length >= 10) result.push("dy.big-pot");
  return result;
}

function sgsAchievements(steps: ActionStep[], final: GameState, actor: number) {
  if (final.kind !== "sgs" || !isWinner(final, actor)) return [];
  const result: AchievementId[] = [];
  const view = final.view;
  if (
    steps.every(
      (step) =>
        step.after.kind !== "sgs" ||
        step.after.view.playerBlood[actor] ===
          step.after.view.playerMaxBlood[actor],
    )
  )
    result.push("sgs.flawless");
  if (view.roles[actor] === 3 && view.playerBlood[actor] === 1)
    result.push("sgs.last-stand");
  if (!view.playerHandCard[actor]?.length) result.push("sgs.empty-hand");
  const duels = steps.filter(
    (step) =>
      step.event.actor === actor &&
      step.after.kind === "sgs" &&
      step.after.view.eventStack.some(
        (event) =>
          event.sourcePlayerPos === actor + 1 && !!event.damagedPlayerPos,
      ),
  );
  if (duels.length >= 3) result.push("sgs.duel-king");
  if (duels.length >= 5) result.push("sgs.warlord");
  if (played(steps, actor).length <= 20) result.push("sgs.quick-victory");
  return result;
}

function tqAchievements(steps: ActionStep[], final: GameState, actor: number) {
  if (final.kind !== "tq" || !isWinner(final, actor)) return [];
  const result: AchievementId[] = [];
  const moves = played(steps, actor).filter(
    (step) => step.event.action.type === "tq-move",
  );
  const allJump =
    moves.length > 0 &&
    moves.every(
      (step) =>
        step.event.action.type === "tq-move" &&
        step.event.action.route.length >= 3,
    );
  if (allJump) result.push("tq.all-jumps");
  if (
    moves.some(
      (step) =>
        step.event.action.type === "tq-move" &&
        step.event.action.route.length >= 11,
    )
  )
    result.push("tq.long-chain");
  if (
    moves.some(
      (step) =>
        step.event.action.type === "tq-move" &&
        step.event.action.route.length >= 7,
    )
  )
    result.push("tq.mega-chain");
  const enemyJump = moves.some((step) => {
    if (step.event.action.type !== "tq-move" || step.before.kind !== "tq")
      return false;
    const route = step.event.action.route;
    for (let i = 1; i < route.length - 1; i++) {
      const over = route[i];
      const other = step.before.view.playerPieces.some(
        (pieces, index) => index !== actor && pieces.includes(over),
      );
      if (other) return true;
    }
    return false;
  });
  if (!enemyJump) result.push("tq.no-enemy-jump");
  const rounds = final.view.winnerRound[final.view.winnerId.indexOf(actor)];
  if (rounds !== undefined && rounds <= 20) result.push("tq.short-march");
  if (rounds !== undefined && rounds <= 15) result.push("tq.fast-win");
  return result;
}

function graphwarAchievements(
  steps: ActionStep[],
  final: GameState,
  actor: number,
) {
  if (final.kind !== "graphwar" || !isWinner(final, actor)) return [];
  const result: AchievementId[] = [];
  let friendly = false,
    hits = 0,
    maxDamage = 0;
  for (const step of played(steps, actor)) {
    if (step.event.action.type !== "graphwar-fire") continue;
    if (step.before.kind !== "graphwar") continue;
    const beforeView = step.before.view;
    const shot = step.event.graphwarShot;
    if (!shot) continue;
    const teamOf = (soldier: number) => {
      const player = beforeView.soldiers.find(
        (item) => item.id === soldier,
      )?.player;
      return player === undefined ? undefined : beforeView.teams[player];
    };
    const enemyKills = shot.impacts.filter(
      (impact) =>
        impact.hpAfter === 0 &&
        teamOf(impact.soldier) !== undefined &&
        teamOf(impact.soldier) !== beforeView.teams[actor],
    );
    if (enemyKills.length >= 3) result.push("graphwar.triple-kill");
    const enemyHits = shot.impacts.filter(
      (impact) =>
        teamOf(impact.soldier) !== undefined &&
        teamOf(impact.soldier) !== beforeView.teams[actor] &&
        impact.damage > 0,
    );
    if (enemyHits.length) hits++;
    maxDamage = Math.max(
      maxDamage,
      shot.impacts.reduce((sum, impact) => sum + impact.damage, 0),
    );
    if (
      !beforeView.options.preview &&
      shot.impacts.some(
        (impact) =>
          teamOf(impact.soldier) !== undefined &&
          teamOf(impact.soldier) !== beforeView.teams[actor] &&
          impact.damage > 0,
      )
    )
      result.push("graphwar.blind");
    if (
      shot.impacts.some(
        (impact) =>
          teamOf(impact.soldier) === beforeView.teams[actor] &&
          impact.damage > 0,
      )
    )
      friendly = true;
  }
  if (!friendly) result.push("graphwar.no-friendly-fire");
  if (hits >= 5) result.push("graphwar.marksman");
  if (maxDamage >= 50) result.push("graphwar.big-hit");
  if (
    final.view.soldiers.filter(
      (soldier) => soldier.player === actor && soldier.hp > 0,
    ).length === 1 &&
    final.view.soldiers.some(
      (soldier) => soldier.player === actor && soldier.hp === 1,
    )
  )
    result.push("graphwar.last-soldier");
  return result;
}

function expeditionAchievements(
  steps: ActionStep[],
  final: GameState,
  actor: number,
) {
  if (final.kind !== "expedition" || final.view.phase !== "won") return [];
  const result: AchievementId[] = [];
  if (final.view.ascension === 10) result.push("expedition.n10");
  if (final.view.combat.heroes.every((hero) => hero.hp === hero.maxHp))
    result.push("expedition.flawless");
  if (
    !steps.some(
      (step) =>
        step.event.actor === actor &&
        step.event.action.type === "expedition-action" &&
        step.event.action.move.type === "buy",
    )
  )
    result.push("expedition.no-shop");
  if (
    final.view.combat.round === 1 &&
    final.view.combat.enemies.some(
      (enemy) => enemy.role === "boss" && enemy.hp === 0,
    )
  )
    result.push("expedition.one-round-boss");
  if (
    final.view.combat.heroes.reduce(
      (sum, hero) => sum + hero.relics.length,
      0,
    ) >= 5
  )
    result.push("expedition.relic-hoarder");
  if (final.view.combat.metrics.battlesWon >= 5)
    result.push("expedition.battles-5");
  return result;
}

function dominionAchievements(
  steps: ActionStep[],
  final: GameState,
  actor: number,
) {
  if (final.kind !== "dominion" || !isWinner(final, actor)) return [];
  const result: AchievementId[] = [];
  const buys = played(steps, actor).filter(
    (step) =>
      step.event.action.type === "dominion-action" &&
      step.event.action.move.type === "buy",
  );
  const provinceTurns = new Map<string, number>(),
    turnBuys = new Map<string, number>();
  for (const step of buys) {
    if (step.before.kind === "dominion") {
      const key = `${step.before.view.round}:${step.before.view.turn}`;
      turnBuys.set(key, (turnBuys.get(key) ?? 0) + 1);
    }
    if (
      step.event.action.type !== "dominion-action" ||
      step.event.action.move.type !== "buy" ||
      step.event.action.move.card !== "province" ||
      step.before.kind !== "dominion"
    )
      continue;
    const key = `${step.before.view.round}:${step.before.view.turn}`;
    provinceTurns.set(key, (provinceTurns.get(key) ?? 0) + 1);
  }
  if ([...provinceTurns.values()].some((count) => count >= 3))
    result.push("dominion.three-provinces");
  if ([...turnBuys.values()].some((count) => count >= 3))
    result.push("dominion.big-turn");
  if (buys.length >= 10) result.push("dominion.busy-market");
  if (
    steps.some(
      (step) =>
        step.after.kind === "dominion" &&
        step.after.view.players[actor].deck.length === 0 &&
        step.after.view.players[actor].discard.length === 0,
    )
  )
    result.push("dominion.empty-deck");
  const boughtKingdom = buys.some(
    (step) =>
      step.event.action.type === "dominion-action" &&
      step.event.action.move.type === "buy" &&
      final.view.kingdom.includes(step.event.action.move.card),
  );
  if (!boughtKingdom) result.push("dominion.starting-cards");
  if (
    Object.values(final.view.supply).filter((count) => count === 0).length >= 3
  )
    result.push("dominion.three-piles");
  return result;
}

function poolAchievements(
  steps: ActionStep[],
  final: GameState,
  actor: number,
) {
  if (final.kind !== "pool" || final.view.winner !== actor) return [];
  const result: AchievementId[] = [],
    shots = played(steps, actor)
      .map((step) =>
        step.after.kind === "pool" ? step.after.view.lastShot : null,
      )
      .filter((shot): shot is NonNullable<typeof shot> => !!shot);
  if (final.view.shotNumber <= 5) result.push("pool.fast-finish");
  if (
    shots.some(
      (shot) => shot.pocketed.filter((item) => item.id !== 0).length >= 2,
    )
  )
    result.push("pool.double-pot");
  if (steps.length > 0 && steps.every((step) => step.event.actor === actor))
    result.push("pool.clean-win");
  return result;
}

export interface ReplayAchievementResult {
  achievements: AchievementId[];
  winner: boolean;
}
export function evaluateReplay(
  record: ReplayRecord,
  actor: number,
): ReplayAchievementResult {
  if (actor < 0) return { achievements: [], winner: false };
  let replay: Replay;
  try {
    replay = new Replay(record);
  } catch {
    return { achievements: [], winner: false };
  }
  const frames = replay.frames();
  const final = frames.at(-1);
  if (!final || !replay.engine.finished(final))
    return { achievements: [], winner: false };
  const steps = actionSteps(record, frames);
  const winner = isWinner(final, actor);
  switch (final.kind) {
    case "fxq":
      return { achievements: fxqAchievements(steps, final, actor), winner };
    case "uno":
      return { achievements: unoAchievements(steps, final, actor), winner };
    case "ddz":
      return { achievements: ddzAchievements(steps, final, actor), winner };
    case "scmj":
      return { achievements: scmjAchievements(final, actor), winner };
    case "ccbs":
      return { achievements: ccbsAchievements(steps, final, actor), winner };
    case "ktd":
      return { achievements: ktdAchievements(steps, final, actor), winner };
    case "dy":
      return { achievements: dyAchievements(final, actor), winner };
    case "sgs":
      return { achievements: sgsAchievements(steps, final, actor), winner };
    case "tq":
      return { achievements: tqAchievements(steps, final, actor), winner };
    case "graphwar":
      return {
        achievements: graphwarAchievements(steps, final, actor),
        winner,
      };
    case "expedition":
      return {
        achievements: expeditionAchievements(steps, final, actor),
        winner,
      };
    case "dominion":
      return {
        achievements: dominionAchievements(steps, final, actor),
        winner,
      };
    case "pool":
      return {
        achievements: poolAchievements(steps, final, actor),
        winner,
      };
  }
  return { achievements: [], winner };
}
export function evaluateAchievements(
  record: ReplayRecord,
  actor: number,
): AchievementId[] {
  return evaluateReplay(record, actor).achievements;
}
