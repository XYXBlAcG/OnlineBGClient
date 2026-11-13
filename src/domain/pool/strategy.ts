import { Strategy, type SearchRequest } from "../strategy";
import type {
  Candidate,
  Decision,
  DecisionCandidate,
  Difficulty,
  GameState,
} from "../types";
import { applyOutcome } from "./rules";
import { simulateShot } from "./physics";
import {
  POOL_TABLE,
  cuePlacementValid,
  poolPockets,
  type PoolPoint,
} from "./table";
import type { PoolBall, PoolView } from "./types";

const radius = POOL_TABLE.ballRadius;
const groupOf = (id: number) =>
  id >= 1 && id <= 7 ? 0 : id >= 9 && id <= 15 ? 1 : null;
const activeBalls = (view: PoolView) =>
  view.balls.filter((ball) => !ball.pocketed && ball.id !== 0);
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

function ballInHandPlacement(view: PoolView, cue: PoolPoint): PoolPoint | null {
  if (cuePlacementValid(view.balls, cue)) return { ...cue };
  const candidates: PoolPoint[] = [
    { x: 0, y: 0 },
    { x: -POOL_TABLE.width / 4, y: 0 },
    { x: POOL_TABLE.width / 4, y: 0 },
    { x: 0, y: -POOL_TABLE.height / 4 },
    { x: 0, y: POOL_TABLE.height / 4 },
    { x: -POOL_TABLE.width / 3, y: -POOL_TABLE.height / 4 },
    { x: -POOL_TABLE.width / 3, y: POOL_TABLE.height / 4 },
    { x: POOL_TABLE.width / 3, y: -POOL_TABLE.height / 4 },
    { x: POOL_TABLE.width / 3, y: POOL_TABLE.height / 4 },
  ];
  return candidates.find((cue) => cuePlacementValid(view.balls, cue)) ?? null;
}

function segmentDistance(
  point: { x: number; y: number },
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = dx * dx + dy * dy;
  if (!length) return distance(point, from);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / length),
  );
  return distance(point, { x: from.x + dx * t, y: from.y + dy * t });
}

function clearPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  balls: PoolBall[],
  ignored: number[],
): boolean {
  return balls.every(
    (ball) =>
      ignored.includes(ball.id) ||
      segmentDistance(ball, from, to) > radius * 2.1,
  );
}

function targetIds(view: PoolView): number[] {
  const balls = activeBalls(view);
  if (view.mode === "nine-ball") {
    const lowest = Math.min(...balls.map((ball) => ball.id));
    return Number.isFinite(lowest) ? [lowest] : [];
  }
  const group = view.groups[view.turn];
  if (view.openTable)
    return balls.filter((ball) => ball.id !== 8).map((ball) => ball.id);
  if (group === null)
    return balls.filter((ball) => ball.id !== 8).map((ball) => ball.id);
  if (!balls.some((ball) => groupOf(ball.id) === group)) return [8];
  return balls
    .filter((ball) => groupOf(ball.id) === group)
    .map((ball) => ball.id);
}

function shotCandidates(view: PoolView): Candidate[] {
  const cue = view.balls.find((ball) => ball.id === 0 && !ball.pocketed);
  if (!cue) return [];
  const balls = activeBalls(view),
    targets = targetIds(view),
    placement = view.ballInHand ? ballInHandPlacement(view, cue) : null,
    origin = placement ?? cue,
    candidates: Candidate[] = [];
  if (view.phase === "break")
    candidates.push({
      action: {
        type: "pool-shot",
        aim: Math.atan2(0 - origin.y, POOL_TABLE.width / 4 - origin.x),
        power: 0.95,
        spin: { x: 0, y: 0 },
        ...(placement ? { cue: placement } : {}),
      },
      label: "开球",
    });
  for (const targetId of targets) {
    const target = balls.find((ball) => ball.id === targetId);
    if (!target) continue;
    for (const pocket of poolPockets) {
      const dx = pocket.x - target.x,
        dy = pocket.y - target.y,
        length = Math.hypot(dx, dy);
      if (length < radius) continue;
      const ghost = {
        x: target.x - (dx / length) * radius * 2,
        y: target.y - (dy / length) * radius * 2,
      };
      if (
        Math.abs(ghost.x) > POOL_TABLE.width / 2 - radius ||
        Math.abs(ghost.y) > POOL_TABLE.height / 2 - radius
      )
        continue;
      const cut =
        ((origin.x - ghost.x) * (target.x - pocket.x) +
          (origin.y - ghost.y) * (target.y - pocket.y)) /
        (Math.max(1e-6, distance(origin, ghost)) *
          Math.max(1e-6, distance(target, pocket)));
      if (cut < 0.25) continue;
      if (
        !clearPath(origin, ghost, balls, [0, targetId]) ||
        !clearPath(target, pocket, balls, [0, targetId])
      )
        continue;
      const aim = Math.atan2(ghost.y - origin.y, ghost.x - origin.x),
        power = Math.min(
          1,
          Math.max(
            0.32,
            (distance(origin, ghost) + distance(target, pocket)) / 3.2,
          ),
        );
      candidates.push({
        action: {
          type: "pool-shot",
          aim,
          power,
          spin: { x: 0, y: 0 },
          ...(placement ? { cue: placement } : {}),
        },
        label: `打 ${targetId} 号球进袋`,
      });
    }
  }
  if (!candidates.length) {
    const fallback = balls
      .filter((ball) => targets.includes(ball.id))
      .sort((a, b) => distance(a, origin) - distance(b, origin))[0];
    if (fallback)
      candidates.push({
        action: {
          type: "pool-shot",
          aim: Math.atan2(fallback.y - origin.y, fallback.x - origin.x),
          power: 0.42,
          spin: { x: 0, y: 0 },
          ...(placement ? { cue: placement } : {}),
        },
        label: `安全击打 ${fallback.id} 号球`,
      });
  }
  return candidates.slice(0, 18);
}

function evaluateCandidate(
  view: PoolView,
  actor: number,
  candidate: Candidate,
  difficulty: Difficulty,
  seed: string,
): DecisionCandidate {
  const action = candidate.action as import("./types").PoolShotAction;
  const balls = action.cue
    ? view.balls.map((ball) =>
        ball.id === 0
          ? { ...ball, x: action.cue!.x, y: action.cue!.y, pocketed: false }
          : ball,
      )
    : view.balls;
  const shot = simulateShot(balls, action);
  const next = applyOutcome(view, actor, shot);
  const target = Number(candidate.label.match(/\d+/)?.[0] ?? -1);
  const pocketed = shot.pocketed.some((item) => item.id === target);
  const features = [
    {
      name: "目标球进袋",
      value: pocketed ? 1 : 0,
      weight: 100,
      contribution: pocketed ? 100 : 0,
    },
    {
      name: "白球风险",
      value: shot.cuePocketed ? 1 : 0,
      weight: -140,
      contribution: shot.cuePocketed ? -140 : 0,
    },
    {
      name: "继续击球",
      value: next.turn === actor ? 1 : 0,
      weight: 18,
      contribution: next.turn === actor ? 18 : 0,
    },
  ];
  let score = features.reduce((sum, feature) => sum + feature.contribution, 0);
  if (next.winner === actor) score += 1000;
  if (next.winner !== null && next.winner !== actor) score -= 1000;
  if (next.foul) score -= 90;
  if (difficulty === "easy")
    score += (Math.sin(seed.length + target + shot.pocketed.length) * 35) % 35;
  if (difficulty === "hard" && !shot.cuePocketed) {
    const cue = next.balls.find((ball) => ball.id === 0);
    const legal = activeBalls(next).filter((ball) =>
      targetIds(next).includes(ball.id),
    );
    if (cue && legal.length) {
      const nearest = Math.min(...legal.map((ball) => distance(cue, ball)));
      const position = Math.max(0, 40 - nearest * 40);
      score += position;
      features.push({
        name: "下一杆距离",
        value: nearest,
        weight: 40,
        contribution: position,
      });
    }
  }
  return {
    ...candidate,
    score,
    features,
  };
}

export class PoolStrategy extends Strategy {
  static readonly version = "1";
  readonly version = PoolStrategy.version;

  budget(_request: SearchRequest) {
    return { samples: 0, depth: 0, shortlist: 0 };
  }

  candidates(request: SearchRequest): Candidate[] {
    if (request.observation.kind !== "pool") return [];
    return shotCandidates(request.observation.view);
  }

  score(request: SearchRequest, moves: Candidate[]): DecisionCandidate[] {
    if (request.observation.kind !== "pool") return [];
    const view = request.observation.view;
    return moves.map((move) =>
      evaluateCandidate(
        view,
        request.actor,
        move,
        request.difficulty,
        request.seed,
      ),
    );
  }

  decide(
    observation: GameState,
    actor: number,
    difficulty: Difficulty,
    seed: string,
    options?: Pick<SearchRequest, "search" | "tradeEnabled">,
  ): Decision {
    if (observation.kind !== "pool") throw new Error("台球策略收到错误局面");
    const request: SearchRequest = {
      ...options,
      observation,
      actor,
      difficulty,
      seed,
      audit: true,
    };
    const candidates = this.score(request, this.candidates(request));
    const decision = this.complete(request, candidates, []).audit!;
    decision.simulations = candidates.length;
    return decision;
  }
}
