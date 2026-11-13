import type { PoolBall, PoolRotation, PoolShot } from "../../domain/pool/types";

export { POOL_PLAYBACK_RATE } from "../../domain/pool/types";

function slerp(
  from: PoolRotation,
  to: PoolRotation,
  ratio: number,
): PoolRotation {
  let dot = from.x * to.x + from.y * to.y + from.z * to.z + from.w * to.w;
  const target =
    dot < 0 ? { ...to, x: -to.x, y: -to.y, z: -to.z, w: -to.w } : to;
  if (dot < 0) dot = -dot;
  if (dot > 0.9995)
    return {
      x: from.x + (target.x - from.x) * ratio,
      y: from.y + (target.y - from.y) * ratio,
      z: from.z + (target.z - from.z) * ratio,
      w: from.w + (target.w - from.w) * ratio,
    };
  const angle = Math.acos(Math.min(1, dot)),
    sin = Math.sin(angle),
    fromWeight = Math.sin((1 - ratio) * angle) / sin,
    toWeight = Math.sin(ratio * angle) / sin;
  return {
    x: from.x * fromWeight + target.x * toWeight,
    y: from.y * fromWeight + target.y * toWeight,
    z: from.z * fromWeight + target.z * toWeight,
    w: from.w * fromWeight + target.w * toWeight,
  };
}

export function interpolateBalls(shot: PoolShot, elapsed: number): PoolBall[] {
  const frames = shot.frames;
  if (!frames.length) return shot.finalBalls;
  const time = Math.max(0, elapsed * 1000);
  let before = frames[0],
    after = frames[frames.length - 1];
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].t <= time) before = frames[i];
    if (frames[i].t >= time) {
      after = frames[i];
      break;
    }
  }
  const span = Math.max(1, after.t - before.t),
    ratio = Math.min(1, Math.max(0, (time - before.t) / span)),
    positions = new Map(
      before.balls.map((ball) => [ball.id, { ...ball }] as const),
    );
  for (const ball of after.balls) {
    const previous = positions.get(ball.id);
    if (previous)
      positions.set(ball.id, {
        ...ball,
        x: previous.x + (ball.x - previous.x) * ratio,
        y: previous.y + (ball.y - previous.y) * ratio,
        z: (previous.z ?? 0) + ((ball.z ?? 0) - (previous.z ?? 0)) * ratio,
        rotation:
          previous.rotation && ball.rotation
            ? slerp(previous.rotation, ball.rotation, ratio)
            : (ball.rotation ?? previous.rotation),
      });
  }
  const pocketed = new Set(
    shot.pocketed.filter((item) => item.t <= time).map((item) => item.id),
  );
  return [...positions.values()]
    .filter((ball) => !pocketed.has(ball.id))
    .map((ball) => ({ ...ball, pocketed: false }));
}
