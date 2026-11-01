import { catanVictoryPoints } from "../catan";
import type { Action, GameState } from "../types";
import type { GameEngine } from "../engine";
import type { PartyContext } from "./model";
import type { PartyItemId } from "./catalogue";
export interface PartySignal {
  actor: number;
  item: PartyItemId;
  label: string;
  target?: number;
}
export function partySignals(
  before: GameState,
  next: GameState,
  actor: number,
  action: Action | undefined,
  engine: GameEngine,
): PartySignal[] {
  if (before.kind !== next.kind) return [];
  const result: PartySignal[] = [];
  const emit = (
    item: PartyItemId,
    label: string,
    who = actor,
    target?: number,
  ) => result.push({ actor: who, item, label, target });
  switch (next.kind) {
    case "sgs":
      if (before.kind === "sgs") {
        const known = new Set(
          before.view.showCards.map((c) => JSON.stringify(c)),
        );
        const cards = next.view.showCards.filter(
          (c) =>
            !known.has(JSON.stringify(c)) &&
            !c.isBack &&
            !c.toPlayerPos &&
            Number(c.fromPlayerPos) > 0,
        );
        for (const [id, item, label] of [
          [engine.constants.BY.SHA, "sgsSlash", "杀"],
          [engine.constants.BY.LEI_SHA, "sgsSlash", "雷杀"],
          [engine.constants.BY.HUO_SHA, "sgsSlash", "火杀"],
          [engine.constants.BY.SHAN, "sgsDodge", "闪"],
          [engine.constants.BY.TAO, "sgsPeach", "桃"],
        ] as const) {
          const owners = new Set(
            cards
              .filter((c) => c.realType === id)
              .map((c) => Number(c.fromPlayerPos) - 1),
          );
          owners.forEach((who) => {
            if (!result.some((e) => e.actor === who && e.item === item))
              emit(item, label, who, next.view.showLine.toPlayerIds?.[0]);
          });
        }
      }
      break;
    case "scmj":
      if (before.kind === "scmj" && before.view.sequence !== next.view.sequence)
        for (const e of next.view.events) {
          if (e.type === "win") emit("mahjongWin", "胡牌封神", e.actor);
          if (e.type === "kong") emit("mahjongKong", "杠！", e.actor);
        }
      break;
    case "uno":
      if (before.kind === "uno" && action?.type === "uno-play") {
        emit("unoNeon", "UNO · 霓虹出牌");
        if (next.view.currentPlus - before.view.currentPlus === 4)
          emit("unoFour", "+4 · 审判降临");
      }
      break;
    case "ddz":
      if (
        action?.type === "ddz-play" &&
        ((action.cards.length === 4 &&
          new Set(action.cards.map((c) => engine.runtime.load(6139).Vz(c)))
            .size === 1) ||
          (action.cards.length === 2 &&
            action.cards.includes(53) &&
            action.cards.includes(54)))
      )
        emit("ddzBomb", "炸弹！");
      break;
    case "graphwar":
      if (action?.type === "graphwar-fire") emit("graphwarRift", "函数裂隙");
      break;
    case "fxq":
      if (
        before.kind === "fxq" &&
        action?.type === "fxq-move" &&
        before.view.planePositionList[action.plane] < 0 &&
        next.view.planePositionList[action.plane] >= 0
      )
        emit("flightTower", "准许起飞！");
      break;
    case "tq":
      if (action?.type === "tq-move" && action.route.length > 2)
        emit("checkersTrail", `${action.route.length - 1} 连跳！`);
      break;
    case "dominion":
      if (
        before.kind === "dominion" &&
        before.view.sequence !== next.view.sequence
      )
        for (const e of next.view.events)
          if (e.type === "gain" && ["province", "duchy"].includes(e.card))
            emit("dominionCrown", "帝国加冕", e.actor);
      break;
    case "ktd":
      if (before.kind === "ktd" && action?.type === "ktd-action")
        next.view.playerData.forEach((p, i) => {
          if (
            p.resources.reduce((a, b) => a + b, 0) >
            before.view.playerData[i].resources.reduce((a, b) => a + b, 0)
          )
            emit("catanHarvest", "资源丰收", i);
        });
      break;
    case "ccbs":
      if (before.kind === "ccbs")
        next.view.playerNoble.forEach((p, i) => {
          if (p.length > before.view.playerNoble[i].length)
            emit("splendorCrown", "贵族来访", i);
        });
      break;
    case "dy":
      if (
        before.kind === "dy" &&
        action?.type === "dy-play" &&
        next.view.lastOp.eatCardList.length
      )
        emit("poisonAccident", "化学事故！");
      break;
    case "expedition":
      if (
        before.kind === "expedition" &&
        before.view.phase === "battle" &&
        next.view.phase === "reward" &&
        next.view.rewardElite
      )
        next.view.combat.heroes.forEach((_, i) =>
          emit("expeditionAwaken", "秘塔 · 觉醒", i),
        );
      break;
  }
  return result;
}
export function partyResults(
  state: GameState | null,
  players: { id: string; name: string }[],
  engine: GameEngine,
): Pick<PartyContext, "outcomes" | "winners"> {
  if (!state) return {};
  const ids = players.map((_, i) => i),
    finished = engine.finished(state);
  let winners: number[] = [];
  const next = (done: number[], order: number[]) => {
    const choices = ids.filter((i) => !done.includes(i));
    const last = order.filter((i) => !done.includes(i));
    return {
      id: `next:${done.length}`,
      title: "下一位完成者",
      options: choices.map((i) => ({
        id: players[i].id,
        label: players[i].name,
      })),
      ...(last.length ? { result: [players[last[0]].id] } : {}),
    };
  };
  switch (state.kind) {
    case "scmj": {
      winners = ids.filter(
        (i) => state.view.scores[i] === Math.max(...state.view.scores),
      );
      const done = state.view.wins.map((w) => w.player);
      return {
        winners: finished ? winners : [],
        outcomes: [
          ...Array.from({ length: done.length + 1 }, (_, n) =>
            next(done.slice(0, n), done),
          ),
          {
            id: "score",
            title: "最终积分第一",
            options: ids.map((i) => ({
              id: players[i].id,
              label: players[i].name,
            })),
            ...(finished ? { result: winners.map((i) => players[i].id) } : {}),
          },
        ],
      };
    }
    case "uno": {
      const order = ids
        .filter((i) => state.view.playerFinish[i])
        .sort(
          (a, b) => state.view.playerFinish[a] - state.view.playerFinish[b],
        );
      return {
        winners: finished ? order.slice(0, 1) : [],
        outcomes: Array.from({ length: order.length + 1 }, (_, n) =>
          next(order.slice(0, n), order),
        ),
      };
    }
    case "fxq":
    case "tq": {
      const order =
        state.kind === "fxq" ? state.view.winners : state.view.winnerId;
      return {
        winners: finished ? order.slice(0, 1) : [],
        outcomes: Array.from({ length: order.length + 1 }, (_, n) =>
          next(order.slice(0, n), order),
        ),
      };
    }
    case "sgs": {
      const roles = engine.constants.XP;
      const faction = (i: number) =>
        state.view.roles[i] === roles.FAN
          ? "rebel"
          : state.view.roles[i] === roles.NEI
            ? "spy"
            : "lord";
      winners = state.view.winners;
      const labels = { lord: "主公与忠臣", rebel: "反贼", spy: "内奸" };
      const options = [...new Set(ids.map(faction))].map((id) => ({
        id,
        label: labels[id as keyof typeof labels],
      }));
      return {
        winners,
        outcomes: [
          {
            id: "faction",
            title: "最终获胜阵营",
            options,
            ...(finished ? { result: [...new Set(winners.map(faction))] } : {}),
          },
        ],
      };
    }
    case "graphwar":
      return {
        winners: finished
          ? ids.filter((i) => state.view.teams[i] === state.view.winner)
          : [],
        outcomes: [
          {
            id: "team",
            title: "最终获胜队伍",
            options: [...new Set(state.view.teams)].map((t) => ({
              id: `team:${t}`,
              label: t === 0 ? "蓝队" : "橙队",
            })),
            ...(finished
              ? {
                  result:
                    state.view.winner === null
                      ? []
                      : [`team:${state.view.winner}`],
                }
              : {}),
          },
        ],
      };
    case "dominion":
      winners = state.view.winners;
      break;
    case "ccbs":
      winners = state.view.winner;
      break;
    case "ktd": {
      const scores = ids.map((i) => catanVictoryPoints(state.view, i));
      winners = ids.filter((i) => scores[i] === Math.max(...scores));
      break;
    }
    case "expedition": {
      const run = state.view;
      const current = run.map.flat().find((n) => n.id === run.current);
      const battle =
        current && ["battle", "elite", "boss"].includes(current.kind);
      return {
        winners: run.phase === "won" ? ids : [],
        outcomes: battle
          ? [
              {
                id: `expedition:${run.current}`,
                title: "这一战的结局",
                options: [
                  { id: "won", label: "全队获胜" },
                  { id: "lost", label: "全队失利" },
                ],
                ...(run.combat.phase === "won" || run.combat.phase === "lost"
                  ? { result: [run.combat.phase] }
                  : {}),
              },
            ]
          : [],
      };
    }

    case "dy":
      winners = ids.filter(
        (i) => state.view.scores[i] === Math.min(...state.view.scores),
      );
      break;
    case "ddz":
      winners = ids.filter((i) =>
        state.view.landlordWin
          ? i + 1 === state.view.landlordId
          : i + 1 !== state.view.landlordId,
      );
      break;
    default:
      break;
  }
  return {
    winners: finished ? winners : [],
    outcomes: [
      {
        id: "winner",
        title: "最终胜者",
        options: ids.map((i) => ({
          id: players[i].id,
          label: players[i].name,
        })),
        ...(finished ? { result: winners.map((i) => players[i].id) } : {}),
      },
    ],
  };
}
