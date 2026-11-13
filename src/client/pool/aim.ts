import { POOL_TABLE, type PoolPoint } from "../../domain/pool/table";

export const PULL_RANGE = 0.45;
const MIN_AIM_DISTANCE = 0.06;
const BALL_CURSOR_RADIUS = POOL_TABLE.ballRadius * 2.5;

export type PoolCursor = "default" | "grab" | "grabbing" | "not-allowed";

export function poolBallCursor(
  point: PoolPoint,
  cue: PoolPoint | null,
  canMove: boolean,
  dragging: boolean,
): PoolCursor {
  if (!cue) return "default";
  if (Math.hypot(point.x - cue.x, point.y - cue.y) > BALL_CURSOR_RADIUS)
    return "default";
  if (dragging) return "grabbing";
  return canMove ? "grab" : "not-allowed";
}

export function aimFromPointer(
  cue: PoolPoint,
  point: PoolPoint,
  minimum = MIN_AIM_DISTANCE,
): number | null {
  const dx = point.x - cue.x,
    dy = point.y - cue.y;
  return Math.hypot(dx, dy) < minimum ? null : Math.atan2(dy, dx);
}

export function pullStrength(
  aim: number,
  start: PoolPoint,
  point: PoolPoint,
  range = PULL_RANGE,
): number {
  const back = -(
    (point.x - start.x) * Math.cos(aim) +
    (point.y - start.y) * Math.sin(aim)
  );
  return Math.min(1, Math.max(0, back / range));
}
