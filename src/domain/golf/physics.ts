import { Box, Circle, Vec2, World } from "planck";
import { sampleGolfSurface } from "./terrain";
import type { GolfCourse, GolfPoint, GolfRect, GolfShot } from "./types";

export const golfWidth = 14;
export const golfHeight = 8;
export const golfBallRadius = 0.145;
export const golfCupRadius = 0.31;
export const golfFrameMs = 1000 / 25;

function inside(point: GolfPoint, zone: GolfRect) {
  return (
    Math.abs(point.x - zone.x) <= zone.width / 2 &&
    Math.abs(point.y - zone.y) <= zone.height / 2
  );
}

export function putt(
  course: GolfCourse,
  start: GolfPoint,
  aim: number,
  power: number,
): GolfShot {
  const width = course.width ?? golfWidth;
  const height = course.height ?? golfHeight;
  const world = new World();
  const rails = world.createBody();
  for (const wall of [
    { x: 0, y: height / 2, width: 0.2, height: height + 0.4 },
    { x: width, y: height / 2, width: 0.2, height: height + 0.4 },
    { x: width / 2, y: 0, width, height: 0.2 },
    { x: width / 2, y: height, width, height: 0.2 },
    ...course.banks,
  ])
    rails.createFixture(
      Box(wall.width / 2, wall.height / 2, Vec2(wall.x, wall.y)),
      { restitution: 0.66, friction: 0 },
    );
  const ball = world.createDynamicBody({ position: start, bullet: true });
  ball.createFixture(Circle(golfBallRadius), {
    density: 1,
    restitution: 0.65,
    friction: 0,
  });
  ball.setLinearVelocity(
    Vec2(Math.cos(aim) * power * 14.8, Math.sin(aim) * power * 14.8),
  );
  const frames = [start];
  let position = start;
  let sunk = false;
  let water = false;
  for (let step = 1; step <= 440; step++) {
    world.step(0.01);
    const point = ball.getPosition();
    position = { x: +point.x.toFixed(4), y: +point.y.toFixed(4) };
    const velocity = ball.getLinearVelocity();
    const speed = velocity.length();
    if (step % 4 === 0) frames.push(position);
    water = course.water.some((zone) => inside(position, zone));
    sunk =
      !water &&
      speed < 6.6 &&
      Math.hypot(position.x - course.cup.x, position.y - course.cup.y) <=
        golfCupRadius;
    if (water || sunk || speed < 0.075) break;
    const drag = course.sand.some((zone) => inside(position, zone)) ? 7.2 : 5.1;
    const next = Vec2.mul(Math.max(0, 1 - (0.01 * drag) / speed), velocity);
    if (course.terrain) {
      const { dx, dy } = sampleGolfSurface(course, position);
      const slopeScale = 0.09 / Math.max(1, Math.hypot(dx, dy) / 0.32);
      next.x -= dx * slopeScale;
      next.y -= dy * slopeScale;
    }
    ball.setLinearVelocity(next);
  }
  if (frames.at(-1) !== position) frames.push(position);
  return {
    frames,
    position: sunk ? course.cup : water ? start : position,
    sunk,
    water,
  };
}
