import {
  standardPoolLayout,
  type PoolPoint,
  type PoolTableLayout,
} from "../../domain/pool/table";
import type { PoolBall } from "../../domain/pool/types";

export interface PoolPrediction {
  cue: PoolPoint[];
  ghost: PoolPoint | null;
}

const radius = standardPoolLayout.table.ballRadius;

function nextRail(
  point: PoolPoint,
  dx: number,
  dy: number,
  layout: PoolTableLayout,
): { point: PoolPoint; x: boolean; y: boolean } | null {
  const left = -layout.table.width / 2 + radius,
    right = layout.table.width / 2 - radius,
    top = -layout.table.height / 2 + radius,
    bottom = layout.table.height / 2 - radius;
  const hits: { distance: number; point: PoolPoint; x: boolean; y: boolean }[] =
    [];
  if (dx > 0.000001) {
    const distance = (right - point.x) / dx;
    if (distance > 0.000001)
      hits.push({
        distance,
        point: { x: right, y: point.y + dy * distance },
        x: true,
        y: false,
      });
  }
  if (dx < -0.000001) {
    const distance = (left - point.x) / dx;
    if (distance > 0.000001)
      hits.push({
        distance,
        point: { x: left, y: point.y + dy * distance },
        x: true,
        y: false,
      });
  }
  if (dy > 0.000001) {
    const distance = (bottom - point.y) / dy;
    if (distance > 0.000001)
      hits.push({
        distance,
        point: { x: point.x + dx * distance, y: bottom },
        x: false,
        y: true,
      });
  }
  if (dy < -0.000001) {
    const distance = (top - point.y) / dy;
    if (distance > 0.000001)
      hits.push({
        distance,
        point: { x: point.x + dx * distance, y: top },
        x: false,
        y: true,
      });
  }
  if (!hits.length) return null;
  return hits.sort((a, b) => a.distance - b.distance)[0];
}

function extendPath(
  start: PoolPoint,
  dx: number,
  dy: number,
  distance: number,
  bounces: number,
  layout: PoolTableLayout,
): PoolPoint[] {
  const path: PoolPoint[] = [start];
  let point = start,
    vx = dx,
    vy = dy,
    remaining = distance;
  for (let bounce = 0; bounce < bounces; bounce++) {
    const hit = nextRail(point, vx, vy, layout);
    if (!hit) break;
    const segment = Math.hypot(hit.point.x - point.x, hit.point.y - point.y);
    if (segment >= remaining) {
      path.push({ x: point.x + vx * remaining, y: point.y + vy * remaining });
      remaining = 0;
      break;
    }
    path.push(hit.point);
    remaining -= segment;
    point = hit.point;
    if (hit.x) vx = -vx;
    if (hit.y) vy = -vy;
  }
  if (remaining > 0.0001)
    path.push({ x: point.x + vx * remaining, y: point.y + vy * remaining });
  return path;
}

export function predictShot(
  balls: PoolBall[],
  cue: PoolPoint,
  aim: number,
  power: number,
  layout: PoolTableLayout = standardPoolLayout,
): PoolPrediction {
  const dx = Math.cos(aim),
    dy = Math.sin(aim),
    collisionRadius = radius * 2;
  let nearest = Number.POSITIVE_INFINITY,
    target: PoolBall | null = null;
  for (const ball of balls) {
    if (ball.pocketed || ball.id === 0) continue;
    const ox = ball.x - cue.x,
      oy = ball.y - cue.y,
      projection = ox * dx + oy * dy;
    if (projection <= 0) continue;
    const perpendicular = Math.abs(ox * dy - oy * dx);
    if (perpendicular > collisionRadius) continue;
    const offset = Math.sqrt(
        Math.max(
          0,
          collisionRadius * collisionRadius - perpendicular * perpendicular,
        ),
      ),
      distance = projection - offset;
    if (distance > 0 && distance < nearest) {
      nearest = distance;
      target = ball;
    }
  }
  if (!target)
    return {
      cue: extendPath(cue, dx, dy, 4.6, 2, layout),
      ghost: null,
    };
  const contact = { x: cue.x + dx * nearest, y: cue.y + dy * nearest };
  const ox = target.x - contact.x,
    oy = target.y - contact.y,
    length = Math.hypot(ox, oy) || 1,
    normalX = ox / length,
    normalY = oy / length,
    cut = Math.max(0, dx * normalX + dy * normalY),
    tangentX = dx - normalX * cut,
    tangentY = dy - normalY * cut,
    tangentLength = Math.hypot(tangentX, tangentY),
    cuePath: PoolPoint[] = [cue, contact];
  if (tangentLength > 0.001) {
    const tangentDistance = 0.8 + power * 1.8;
    cuePath.push(
      ...extendPath(
        contact,
        tangentX / tangentLength,
        tangentY / tangentLength,
        tangentDistance,
        1,
        layout,
      ).slice(1),
    );
  }
  return {
    cue: cuePath,
    ghost: contact,
  };
}
