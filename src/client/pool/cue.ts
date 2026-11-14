import type { PoolBall } from "../../domain/pool/types";
import type { PoolPoint, PoolTableLayout } from "../../domain/pool/table";

export const CUE_TILT = 0.14;
export const CUE_BUTT_LENGTH = 0.78;
export const CUE_MAX_PULL = 0.45;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function elevationAngle(elevation: number): number {
  return CUE_TILT + clamp01(elevation) * (Math.PI / 2 - CUE_TILT);
}

export function elevationDegrees(elevation: number): number {
  return Math.round((elevationAngle(elevation) * 180) / Math.PI);
}

export function degreesToElevation(degrees: number): number {
  const angle = (Math.min(88, Math.max(0, degrees)) * Math.PI) / 180;
  return clamp01((angle - CUE_TILT) / (Math.PI / 2 - CUE_TILT));
}

export function requiredCueElevation(
  layout: PoolTableLayout,
  balls: PoolBall[],
  cue: PoolPoint,
  aim: number,
  pull = CUE_MAX_PULL,
): number {
  const ballRadius = layout.table.ballRadius,
    reach = ballRadius * 1.35 + pull + CUE_BUTT_LENGTH,
    back = { x: -Math.cos(aim), y: -Math.sin(aim) },
    halfWidth = layout.table.width / 2 - ballRadius,
    halfHeight = layout.table.height / 2 - ballRadius;
  let required = CUE_TILT;
  const nextAngle = (height: number, distance: number) => {
    if (distance <= 0.001) return Math.PI / 2;
    return Math.atan2(height, distance);
  };
  let limit = Number.POSITIVE_INFINITY;
  if (Math.abs(back.x) > 0.0001)
    limit = Math.min(
      limit,
      back.x > 0
        ? (halfWidth - cue.x) / back.x
        : (-halfWidth - cue.x) / back.x,
    );
  if (Math.abs(back.y) > 0.0001)
    limit = Math.min(
      limit,
      back.y > 0
        ? (halfHeight - cue.y) / back.y
        : (-halfHeight - cue.y) / back.y,
    );
  if (limit < reach)
    required = Math.max(
      required,
      nextAngle(layout.table.railHeight + 0.004, Math.max(limit, 0.01)),
    );
  for (const ball of balls) {
    if (ball.id === 0 || ball.pocketed) continue;
    const dx = ball.x - cue.x,
      dy = ball.y - cue.y,
      along = dx * back.x + dy * back.y;
    if (along <= ballRadius * 0.4 || along >= reach) continue;
    const lateral = Math.abs(dx * back.y - dy * back.x);
    if (lateral > ballRadius * 2.3) continue;
    required = Math.max(
      required,
      nextAngle(ballRadius * 2 + 0.004, along),
    );
  }
  const angle = Math.min(required, Math.PI / 2 - 0.01);
  return clamp01((angle - CUE_TILT) / (Math.PI / 2 - CUE_TILT));
}
