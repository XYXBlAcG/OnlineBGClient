import { POOL_TABLE, type PoolPoint } from "../../domain/pool/table";
import type { PoolBall } from "../../domain/pool/types";

export function ballAtPoint(
  balls: PoolBall[],
  point: PoolPoint,
  radius = POOL_TABLE.ballRadius * 1.8,
): number | null {
  let closest: number | null = null;
  let closestDistance = radius;
  for (const ball of balls) {
    if (ball.pocketed) continue;
    const distance = Math.hypot(ball.x - point.x, ball.y - point.y);
    if (distance <= closestDistance) {
      closest = ball.id;
      closestDistance = distance;
    }
  }
  return closest;
}
