import { z } from "zod";
import type { Action, GameKind, GameState } from "./types";
import { shuffled } from "./expedition/random";

export const challengeIds = [
  "fxq-takeoff-two",
  "fxq-perfect-landing",
  "fxq-six-streak",
  "tq-double-jump",
  "tq-triple-jump",
  "tq-long-jump",
  "graphwar-double-hit",
  "graphwar-triple-hit",
  "graphwar-guard-twice",
] as const;
export type ChallengeId = (typeof challengeIds)[number];
export const challengeCardSchema = z.object({
  id: z.enum(challengeIds),
  title: z.string(),
  description: z.string(),
  target: z.number().int().min(1),
  progress: z.record(z.string(), z.number().int().min(0)),
  claimedBy: z.number().int().min(0).nullable(),
  claimedVersion: z.number().int().min(0).nullable(),
});
export const challengeBoardSchema = z.object({
  version: z.literal(1),
  cards: z.array(challengeCardSchema).length(3),
});
export type ChallengeBoard = z.infer<typeof challengeBoardSchema>;
export type ChallengeCard = ChallengeBoard["cards"][number];

interface ChallengeDefinition {
  game: Extract<GameKind, "fxq" | "tq" | "graphwar">;
  title: string;
  description: string;
  target: number;
  evaluate(
    before: GameState,
    after: GameState,
    actor: number,
    action: Action,
  ): number;
}

const definitions: Record<ChallengeId, ChallengeDefinition> = {
  "fxq-takeoff-two": {
    game: "fxq",
    title: "双机起飞",
    description: "累计让两架飞机成功起飞。",
    target: 2,
    evaluate(before, after, actor, action) {
      if (
        before.kind !== "fxq" ||
        after.kind !== "fxq" ||
        action.type !== "fxq-move" ||
        Math.floor(action.plane / 4) !== actor
      )
        return 0;
      return before.view.planePositionList[action.plane] === 0 &&
        after.view.planePositionList[action.plane] > 0
        ? 1
        : 0;
    },
  },
  "fxq-perfect-landing": {
    game: "fxq",
    title: "精准返航",
    description: "让一架飞机完整抵达终点。",
    target: 1,
    evaluate(before, after, _actor, action) {
      if (
        before.kind !== "fxq" ||
        after.kind !== "fxq" ||
        action.type !== "fxq-move"
      )
        return 0;
      return before.view.planePositionList[action.plane] < 57 &&
        after.view.planePositionList[action.plane] === 57
        ? 1
        : 0;
    },
  },
  "fxq-six-streak": {
    game: "fxq",
    title: "命运六点",
    description: "在一次掷骰中掷出六点。",
    target: 1,
    evaluate(_before, after, actor, action) {
      return action.type === "fxq-roll" &&
        after.kind === "fxq" &&
        after.view.lastDicePlayer === actor &&
        after.view.lastDice === 6
        ? 1
        : 0;
    },
  },
  "tq-double-jump": {
    game: "tq",
    title: "双连跃迁",
    description: "单次移动完成至少两次连续跳跃。",
    target: 1,
    evaluate(_before, _after, _actor, action) {
      return action.type === "tq-move" && action.route.length >= 3 ? 1 : 0;
    },
  },
  "tq-triple-jump": {
    game: "tq",
    title: "三重星轨",
    description: "单次移动完成至少三次连续跳跃。",
    target: 1,
    evaluate(_before, _after, _actor, action) {
      return action.type === "tq-move" && action.route.length >= 4 ? 1 : 0;
    },
  },
  "tq-long-jump": {
    game: "tq",
    title: "一线穿营",
    description: "单次移动完成至少五次连续跳跃。",
    target: 1,
    evaluate(_before, _after, _actor, action) {
      return action.type === "tq-move" && action.route.length >= 6 ? 1 : 0;
    },
  },
  "graphwar-double-hit": {
    game: "graphwar",
    title: "一弹双响",
    description: "用一发函数炮弹命中至少两个目标。",
    target: 1,
    evaluate(_before, after, _actor, action) {
      return action.type === "graphwar-fire" &&
        after.kind === "graphwar" &&
        (after.view.lastShot?.impacts.length ?? 0) >= 2
        ? 1
        : 0;
    },
  },
  "graphwar-triple-hit": {
    game: "graphwar",
    title: "贯穿战场",
    description: "用一发函数炮弹命中至少三个目标。",
    target: 1,
    evaluate(_before, after, _actor, action) {
      return action.type === "graphwar-fire" &&
        after.kind === "graphwar" &&
        (after.view.lastShot?.impacts.length ?? 0) >= 3
        ? 1
        : 0;
    },
  },
  "graphwar-guard-twice": {
    game: "graphwar",
    title: "不动如山",
    description: "累计使用两次防御。",
    target: 2,
    evaluate(_before, _after, _actor, action) {
      return action.type === "graphwar-guard" ? 1 : 0;
    },
  },
};

const idsByGame = {
  fxq: ["fxq-takeoff-two", "fxq-perfect-landing", "fxq-six-streak"],
  tq: ["tq-double-jump", "tq-triple-jump", "tq-long-jump"],
  graphwar: [
    "graphwar-double-hit",
    "graphwar-triple-hit",
    "graphwar-guard-twice",
  ],
} as const satisfies Partial<Record<GameKind, readonly ChallengeId[]>>;

export function challengesFor(kind: GameKind): readonly ChallengeId[] {
  return idsByGame[kind as keyof typeof idsByGame] ?? [];
}

export function createChallengeBoard(
  kind: GameKind,
  seed: string,
  players: number,
): ChallengeBoard | null {
  const ids = challengesFor(kind);
  if (!ids.length) return null;
  return {
    version: 1,
    cards: shuffled(ids, `${seed}:challenges`)
      .slice(0, 3)
      .map((id) => ({
        id,
        title: definitions[id].title,
        description: definitions[id].description,
        target: definitions[id].target,
        progress: Object.fromEntries(
          Array.from({ length: players }, (_, actor) => [String(actor), 0]),
        ),
        claimedBy: null,
        claimedVersion: null,
      })),
  };
}

export function advanceChallenges(
  board: ChallengeBoard | null,
  before: GameState,
  after: GameState,
  actor: number,
  action: Action,
  version: number,
  claimable: boolean,
): ChallengeBoard | null {
  if (!board || before.kind !== after.kind) return board;
  const next = structuredClone(board);
  for (const card of next.cards) {
    if (card.claimedBy !== null) continue;
    const step = definitions[card.id].evaluate(before, after, actor, action);
    if (!step) continue;
    const progress = Math.min(
      card.target,
      (card.progress[String(actor)] ?? 0) + step,
    );
    card.progress[String(actor)] = progress;
    if (progress >= card.target && claimable) {
      card.claimedBy = actor;
      card.claimedVersion = version;
    }
  }
  return next;
}
