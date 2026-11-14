import type { GameOptions } from "../game-options";
import type { Candidate } from "../types";
import type { Rules } from "../plugin";
import { simulateShot } from "./physics";
import {
  partyBallOwners,
  partySpecialBalls,
  poolLayout,
  rackBalls,
  respotBall,
  cuePlacementValid,
} from "./table";
import {
  poolOptionsSchema,
  POOL_OPPONENT_LEAD_IN,
  POOL_PLAYBACK_RATE,
  type PoolAction,
  type PoolBall,
  type PoolShot,
  type PoolShotAction,
  type PoolState,
  type PoolView,
} from "./types";

const opponent = (actor: number) => 1 - actor;
const nextPlayer = (view: PoolView) => (view.turn + 1) % view.players;
const partyBallIds = (view: PoolView, actor: number) =>
  view.party?.owners[actor] ?? [];
const partyCleared = (view: PoolView, actor: number) =>
  partyBallIds(view, actor).every(
    (id) => view.balls.find((ball) => ball.id === id)?.pocketed,
  );
const groupOf = (id: number): number | null =>
  id >= 1 && id <= 7 ? 0 : id >= 9 && id <= 15 ? 1 : null;
const objectBalls = (balls: PoolBall[]) =>
  balls.filter((ball) => ball.id !== 0 && !ball.pocketed);
const lowest = (balls: PoolBall[]) =>
  Math.min(
    ...objectBalls(balls).map((ball) => ball.id),
    Number.POSITIVE_INFINITY,
  );
const cleared = (view: PoolView, actor: number) => {
  const group = view.groups[actor];
  return (
    group !== null &&
    !objectBalls(view.balls).some((ball) => groupOf(ball.id) === group)
  );
};
const player = (actor: number) => `玩家 ${actor + 1}`;
const remainingGroupCount = (balls: PoolBall[]) =>
  new Set(
    objectBalls(balls)
      .map((ball) => groupOf(ball.id))
      .filter((group) => group !== null),
  ).size;

function legalFirstHit(view: PoolView, actor: number, firstHit: number | null) {
  if (firstHit === null) return false;
  if (view.mode === "nine-ball") return firstHit === lowest(view.balls);
  if (view.mode === "party")
    return (
      partyBallIds(view, actor).includes(firstHit) ||
      (view.party?.specials.some((special) => special.id === firstHit) ?? false)
    );
  if (view.groups[actor] === null)
    return firstHit !== 8 ||
      (view.openTable && remainingGroupCount(view.balls) <= 1);
  if (cleared(view, actor)) return firstHit === 8;
  return groupOf(firstHit) === view.groups[actor];
}

function respot(
  balls: PoolBall[],
  id: number,
  start?: number,
  layout = poolLayout("eight-ball"),
): PoolBall[] {
  const point = respotBall(balls, id, start, layout);
  return balls.map((ball) =>
    ball.id === id ? { ...ball, ...point, z: 0, pocketed: false } : ball,
  );
}

function applyPartyOutcome(
  next: PoolView,
  view: PoolView,
  actor: number,
  shot: PoolShot,
  foul: boolean,
  pocketedObjects: number[],
): PoolView {
  const specials = view.party?.specials ?? [],
    own = partyBallIds(view, actor),
    pottedOwn = pocketedObjects.some((id) => own.includes(id)),
    opponentPotted = pocketedObjects.some((id) => {
      const owner =
        view.party?.owners.findIndex((ids) => ids.includes(id)) ?? -1;
      return owner >= 0 && owner !== actor;
    }),
    partyFoul = foul || opponentPotted,
    pottedSpecial = pocketedObjects.filter((id) =>
      specials.some((special) => special.id === id),
    );
  if (
    !partyFoul &&
    pottedSpecial.includes(
      specials.find((special) => special.kind === "gold")?.id ?? -1,
    )
  ) {
    const remaining = own.filter(
      (id) => !next.balls.find((ball) => ball.id === id)?.pocketed,
    );
    if (remaining.length) {
      const removed = remaining[0];
      next.balls = next.balls.map((ball) =>
        ball.id === removed ? { ...ball, pocketed: true } : ball,
      );
    }
  }
  const clearedPlayers = Array.from(
    { length: view.players },
    (_, index) => index,
  ).filter((index) => partyCleared(next, index));
  if (!partyFoul && clearedPlayers.length) {
    next.phase = "finished";
    next.winner = clearedPlayers.includes(actor) ? actor : clearedPlayers[0];
    next.ballInHand = false;
    next.message = `${player(next.winner)} 清空自己的球，获胜`;
    return next;
  }
  if (partyFoul) {
    next.turn = nextPlayer(view);
    next.ballInHand = true;
    next.phase = "ball-in-hand";
    next.foul = shot.cuePocketed
      ? "白球落袋"
      : opponentPotted
        ? "打进对手的球"
        : !legalFirstHit(view, actor, shot.firstHit)
          ? "首次碰到不属于自己的球"
          : "击球后没有球碰库或进袋";
    next.message = `${player(actor)} 犯规，${player(next.turn)} 自由球`;
    return next;
  }
  next.ballInHand = false;
  const keep = pottedOwn || pottedSpecial.length > 0;
  next.turn = keep ? actor : nextPlayer(view);
  next.message = keep
    ? `${player(actor)} ${pottedSpecial.length ? "击中特殊球，继续击球" : "继续击球"}`
    : `${player(next.turn)} 击球`;
  return next;
}

export function applyOutcome(
  view: PoolView,
  actor: number,
  shot: PoolShot,
): PoolView {
  const pocketed = shot.pocketed.map((item) => item.id),
    pocketedObjects = pocketed.filter((id) => id !== 0),
    breakShot = view.shotNumber === 0,
    foul =
      shot.cuePocketed ||
      !legalFirstHit(view, actor, shot.firstHit) ||
      (!shot.railAfterContact && pocketedObjects.length === 0),
    next: PoolView = {
      ...structuredClone(view),
      lastShot: { ...shot, actor },
      shotNumber: view.shotNumber + 1,
      foul: null,
      message: "",
      phase: "aim",
    };
  next.balls = shot.finalBalls.map((ball) => ({ ...ball }));
  if (shot.cuePocketed)
    next.balls = respot(
      next.balls,
      0,
      -poolLayout(view.mode).table.width / 4,
      poolLayout(view.mode),
    );

  if (view.mode === "nine-ball") {
    const nine = pocketedObjects.includes(9);
    if (nine && !foul) {
      next.phase = "finished";
      next.winner = actor;
      next.message = `${player(actor)} 打进 9 号球，获胜`;
      next.ballInHand = false;
      return next;
    }
    if (foul) {
      if (nine) next.balls = respot(next.balls, 9);
      next.turn = opponent(actor);
      next.ballInHand = true;
      next.phase = "ball-in-hand";
      next.foul = shot.cuePocketed
        ? "白球落袋"
        : !legalFirstHit(view, actor, shot.firstHit)
          ? "未合法碰到最低号球"
          : "击球后没有球碰库或进袋";
      next.message = `${player(actor)} 犯规，${player(next.turn)} 自由球`;
      return next;
    }
    next.ballInHand = false;
    const keep = pocketedObjects.length > 0;
    next.turn = keep ? actor : opponent(actor);
    next.message = keep
      ? `${player(actor)} 继续击球`
      : `${player(next.turn)} 击球`;
    return next;
  }

  if (view.mode === "party")
    return applyPartyOutcome(
      next,
      view,
      actor,
      shot,
      foul,
      pocketedObjects,
    );

  const eight = pocketedObjects.includes(8);
  if (eight && breakShot) next.balls = respot(next.balls, 8);
  if (eight && !breakShot) {
    const remainingGroups = new Set(
      objectBalls(next.balls)
        .map((ball) => groupOf(ball.id))
        .filter((group) => group !== null),
    );
    const clearedAfterShot = cleared({ ...view, balls: next.balls }, actor);
    const pocketedGroups = new Set(
      pocketedObjects
        .map((id) => groupOf(id))
        .filter((group) => group !== null),
    );
    const clearedGroupThisShot = [...pocketedGroups].some(
      (group) =>
        !objectBalls(next.balls).some(
          (ball) => groupOf(ball.id) === group,
        ),
    );
    if (
      foul ||
      !(
        clearedAfterShot ||
        (view.openTable && remainingGroups.size <= 1 && clearedGroupThisShot)
      )
    ) {
      next.phase = "finished";
      next.winner = opponent(actor);
      next.message =
        foul && clearedAfterShot
          ? `${player(actor)} 犯规打进 8 号球，${player(next.winner)} 获胜`
          : `${player(actor)} 提前打进 8 号球，${player(next.winner)} 获胜`;
      next.ballInHand = false;
      return next;
    }
    next.phase = "finished";
    next.winner = actor;
    next.message = `${player(actor)} 打进 8 号球，获胜`;
    next.ballInHand = false;
    return next;
  }

  if (foul) {
    next.turn = opponent(actor);
    next.ballInHand = true;
    next.phase = "ball-in-hand";
    next.foul = shot.cuePocketed
      ? "白球落袋"
      : !legalFirstHit(view, actor, shot.firstHit)
        ? "首次碰到错误目标球"
        : "击球后没有球碰库或进袋";
    next.message = `${player(actor)} 犯规，${player(next.turn)} 自由球`;
    return next;
  }

  next.ballInHand = false;
  let keep = false;
  if (view.openTable && !breakShot) {
    const firstGroupBall = shot.pocketed
      .map((item) => item.id)
      .find((id) => groupOf(id) !== null);
    if (firstGroupBall !== undefined) {
      const group = groupOf(firstGroupBall)!;
      next.groups = [null, null];
      next.groups[actor] = group;
      next.groups[opponent(actor)] = 1 - group;
      next.openTable = false;
    }
  }
  if (!next.openTable) {
    const group = next.groups[actor];
    keep =
      group !== null && pocketedObjects.some((id) => groupOf(id) === group);
  } else keep = pocketedObjects.length > 0;
  next.turn = keep ? actor : opponent(actor);
  next.message = keep
    ? `${player(actor)} 继续击球`
    : `${player(next.turn)} 击球`;
  return next;
}

export class PoolRules implements Rules<"pool"> {
  constructor(private random: () => number) {}

  create(players: number, _team: boolean, options?: GameOptions): PoolState {
    const config = poolOptionsSchema.parse(options?.pool ?? {});
    if (config.mode === "party") {
      if (players < 3 || players > 4)
        throw new Error("派对台球需要 3–4 名玩家");
    } else if (players !== 2) throw new Error("8 球与 9 球仅支持 2 人");
    return {
      kind: "pool",
      view: {
        mode: config.mode,
        options: config,
        balls: rackBalls(config.mode, String(this.random()), players),
        players,
        ...(config.mode === "party"
          ? {
              party: {
                owners: partyBallOwners(players),
                specials: partySpecialBalls(players),
              },
            }
          : {}),
        turn: 0,
        groups: [null, null],
        openTable: true,
        phase: "break",
        ballInHand: false,
        lastShot: null,
        winner: null,
        foul: null,
        message: "开球",
        shotNumber: 0,
      },
    };
  }

  finished(state: PoolState): boolean {
    return state.view.phase === "finished";
  }

  actors(state: PoolState): number[] {
    return this.finished(state) ? [] : [state.view.turn];
  }

  candidates(state: PoolState, actor: number): Candidate[] {
    if (!this.actors(state).includes(actor)) return [];
    return [];
  }

  apply(
    state: PoolState,
    actor: number,
    action: PoolAction,
    recorded?: PoolShot,
  ): PoolState {
    if (!this.actors(state).includes(actor)) throw new Error("还未轮到你击球");
    if (action.type !== "pool-shot") throw new Error("台球动作不匹配");
    if (action.power <= 0) throw new Error("请选择击球力度");
    const layout = poolLayout(state.view.mode);
    if (action.cue && !state.view.ballInHand)
      throw new Error("当前不能放置白球");
    if (action.cue && !cuePlacementValid(state.view.balls, action.cue, layout))
      throw new Error("白球放置位置无效");
    const input: PoolShotAction = { ...action };
    if (input.cue) {
      state = {
        ...state,
        view: {
          ...state.view,
          balls: state.view.balls.map((ball) =>
            ball.id === 0
              ? { ...ball, x: input.cue!.x, y: input.cue!.y, pocketed: false }
              : ball,
          ),
        },
      };
    }
    const shot =
      recorded ?? simulateShot(state.view.balls, input, layout);
    return { kind: "pool", view: applyOutcome(state.view, actor, shot) };
  }

  project(state: PoolState): PoolState {
    return structuredClone(state);
  }

  needsResolution(state: PoolState): boolean {
    return (
      state.view.phase !== "finished" && state.view.options.shotSeconds > 0
    );
  }

  actionDelay(state: PoolState): number {
    return state.view.lastShot
      ? (state.view.lastShot.frames.at(-1)?.t ?? 0) / POOL_PLAYBACK_RATE +
          POOL_OPPONENT_LEAD_IN
      : 0;
  }

  resolutionDelay(state: PoolState): number {
    return state.view.options.shotSeconds * 1000;
  }

  resolve(state: PoolState): PoolState {
    const view = structuredClone(state.view),
      turn = view.mode === "party" ? nextPlayer(view) : opponent(view.turn);
    view.turn = turn;
    view.ballInHand = true;
    view.phase = "ball-in-hand";
    view.foul = "击球超时";
    view.message = `${player(view.turn)} 获得自由球`;
    return { kind: "pool", view };
  }
}
