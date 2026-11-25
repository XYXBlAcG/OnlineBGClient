import { z } from "zod";
import type { AiSeatDefinition } from "../room-balance";
import {
  type ArcadeChallenge,
  type ArcadeKind,
  type ArcadeSettings,
  defaultArcadeSettings,
  arcadeContinuingKinds,
  isContinuingArcadeGame,
} from "./campaign";
import { gameWinners } from "../game-result";
import { gameCatalogue } from "../catalogue";
import { catanVictoryPoints } from "../catan";
import { cardDefinition } from "../dominion/cards";
import { golfFrameMs } from "../golf/physics";

export const arcadeScenarioSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("uno") }),
  z.object({ kind: z.literal("fxq") }),
  z.object({ kind: z.literal("ddz") }),
  z.object({ kind: z.literal("dy") }),
  z.object({
    kind: z.enum(arcadeContinuingKinds),
    noActionCap: z.literal(true).optional(),
    cooperativeSeats: z.array(z.number().int().min(0).max(7)).min(1).max(4).optional(),
  }),
  z.object({
    kind: z.literal("sgs"),
    guardHealth: z.union([z.literal(3), z.literal(4)]),
  }),
  z.object({
    kind: z.literal("miner"),
    durationMs: z.number().int().min(1000).max(90_000),
    target: z.number().int().positive(),
    boss: z.boolean(),
    untimed: z.literal(true).optional(),
  }),
]);
export type ArcadeScenario = z.infer<typeof arcadeScenarioSchema>;

export function arcadeScenario(
  challenge: ArcadeChallenge,
  settings: ArcadeSettings = defaultArcadeSettings,
  cooperativeSeats?: number[],
): ArcadeScenario {
  if (challenge.kind === "sgs")
    return { kind: "sgs", guardHealth: challenge.risky ? 4 : 3 };
  if (isContinuingArcadeGame(challenge.kind))
    return {
      kind: challenge.kind,
      ...(challenge.kind === "graphwar" && cooperativeSeats ? { cooperativeSeats } : {}),
      ...(!settings.actionLimit ? { noActionCap: true } : {}),
    };
  return challenge.kind !== "miner"
    ? { kind: challenge.kind }
    : {
        kind: "miner",
        durationMs: challenge.durationMs,
        target: challenge.target,
        boss: challenge.boss,
        ...(!settings.countdown ? { untimed: true } : {}),
      };
}

export function arcadeSupplement(
  kind: ArcadeKind,
  seats: readonly { difficulty: AiSeatDefinition["difficulty"] | null }[],
): AiSeatDefinition[] {
  const missing = gameCatalogue[kind].minPlayers - seats.length;
  const humans = seats.filter(({ difficulty }) => !difficulty).length;
  const count =
    kind === "sgs" && (seats.length === 2 || !seats.at(-1)?.difficulty)
      ? 1
      : kind === "graphwar"
        ? Math.max(seats.length % 2, humans * 2 - seats.length)
        : Math.max(0, missing);
  return Array.from({ length: count }, (_, index) => ({
    difficulty: "normal",
    name:
      kind === "sgs"
        ? "守关主将"
        : kind === "ddz"
          ? "守关地主"
          : kind === "graphwar" ? `守关战士 ${index + 1}` : `远征援手 ${index + 1}`,
  }));
}

export function arcadeOutcome(
  state: import("../types").GameState,
  target: number,
  ai: boolean[],
  finished: boolean,
) {
  if (state.kind === "miner") {
    const score = state.view.teamScore;
    return { won: score >= target, detail: `采集 ${score} / ${target}` };
  }
  if (state.kind === "fxq") {
    const best = Math.max(
      0,
      ...ai.map((bot, seat) =>
        bot
          ? 0
          : state.view.planePositionList
              .slice(seat * 4, seat * 4 + 4)
              .filter((position) => position >= 57).length,
      ),
    );
    return {
      won: best >= target,
      reached: best >= 2,
      detail: `同一真人抵达 ${best} 架`,
    };
  }
  if (state.kind === "ddz") {
    if (finished) {
      const won =
        state.view.winner > 0 && state.view.winner !== state.view.landlordId;
      return { won, detail: won ? "农民出完手牌" : "地主出完手牌" };
    }
    const humanFarmers = state.view.playerRestCardCounts
      .slice(1)
      .filter((_, seat) => !ai[seat] && seat + 1 !== state.view.landlordId);
    const fewest = Math.min(...humanFarmers);
    return {
      won: fewest <= target,
      detail: Number.isFinite(fewest)
        ? `真人农民最少剩 ${fewest} 张牌`
        : "真人农民未达标",
    };
  }
  if (state.kind === "sgs") {
    const guard = state.view.arcadeGuard!;
    const hp = state.view.playerBlood[guard];
    const defeated = !state.view.alivePlayerIds.includes(guard);
    return {
      won: defeated || (!finished && hp > 0 && hp <= target),
      reached: defeated,
      detail: defeated
        ? "守关主将已倒下"
        : `守关主将剩 ${Math.max(0, hp)} 体力`,
    };
  }
  if (state.kind === "dy") {
    const humanScores = state.view.scores.filter((_, seat) => !ai[seat]);
    const average =
      humanScores.reduce((sum, score) => sum + score, 0) / humanScores.length;
    return {
      won: average <= target,
      detail: `真人平均毒分 ${Number(average.toFixed(1))} / ${target}`,
    };
  }
  const humans = ai.flatMap((bot, seat) => (bot ? [] : [seat]));
  if (state.kind === "golf") {
    const holed = humans.map((seat) => state.view.players[seat]).filter((player) => player.sunk);
    const won = holed.length >= target;
    return {
      won,
      reached: won,
      detail: `真人进洞 ${holed.length} / ${target}`,
      readyAfterMs: won ? Math.max(...holed.map((player) => player.lastShot?.frames.length ?? 0)) * golfFrameMs : 0,
    };
  }
  if (state.kind === "pool") {
    const pocketed = state.view.balls.filter(
      (ball) => ball.id > 0 && ball.pocketed,
    ).length;
    return {
      won: pocketed >= target,
      reached: pocketed >= target,
      detail: `落袋 ${pocketed} / ${target} 球`,
    };
  }
  if (state.kind === "scmj") {
    const won = state.view.wins.some((win) => humans.includes(win.player));
    return {
      won,
      reached: won,
      detail: won ? "真人玩家胡牌" : "真人玩家未胡牌",
    };
  }
  let scores: number[] | undefined;
  let label = "";
  if (state.kind === "ccbs") {
    scores = state.view.playerScore;
    label = "威望";
  } else if (state.kind === "ktd") {
    const view = state.view;
    scores = view.playerData.map((_, seat) => catanVictoryPoints(view, seat));
    label = "胜利分";
  } else if (state.kind === "dominion") {
    scores = state.view.players.map(({ hand, discard, deck }, seat) => {
      const cards = [
        ...hand,
        ...discard,
        ...deck,
        ...(state.view.turn === seat ? state.view.inPlay : []),
      ];
      return cards.reduce(
        (sum, card) =>
          sum +
          (card === "gardens"
            ? Math.floor(cards.length / 10)
            : card !== "hidden"
              ? (cardDefinition(card).points ?? 0)
              : 0),
        0,
      );
    });
    label = "胜利分";
  }
  if (scores) {
    const best = Math.max(0, ...humans.map((seat) => scores![seat]));
    return {
      won: best >= target,
      reached: best >= target,
      detail: `真人最高${label} ${best} / ${target}`,
    };
  }
  if (state.kind === "graphwar") {
    const { view } = state;
    const won =
      view.finished &&
      view.winner !== null &&
      humans.length > 0 && humans.every((seat) => view.teams[seat] === view.winner);
    return {
      won,
      reached: won,
      detail: won ? "真人所在队获胜" : "真人所在队未获胜",
    };
  }
  if (state.kind === "tq") {
    const won = gameWinners(state, ai.length).some((seat) =>
      humans.includes(seat),
    );
    return {
      won,
      reached: won,
      detail: won ? "真人玩家获胜" : "真人玩家未获胜",
    };
  }
  if (state.kind !== "uno") throw new Error("远征短局类型不匹配");
  const fewest = Math.min(
    ...state.view.playerCards
      .filter((_, actor) => !ai[actor])
      .map((cards) => cards.length),
  );
  return {
    won: fewest <= (finished ? 0 : target),
    detail: fewest === 0 ? "真人玩家出完手牌" : `真人玩家最少剩 ${fewest} 张牌`,
  };
}
