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
    Vec2(Math.cos(aim) * power * 10.2, Math.sin(aim) * power * 10.2),
  );
  const frames = [start];
  let position = start;
  let sunk = false;
  let water = false;
  const dt = 0.01;
  const gravity = 7.4;
  const grassRoll = 0.55;
  const sandRoll = 3.2;
  const grassDecel = 1.15;
  const sandDecel = 3.6;
  const stillSpeed = 0.06;
  const stillSlope = 0.2;
  for (let step = 1; step <= 1300; step++) {
    world.step(dt);
    const point = ball.getPosition();
    position = { x: +point.x.toFixed(4), y: +point.y.toFixed(4) };
    let velocity = ball.getLinearVelocity();
    let speed = velocity.length();
    if (step % 6 === 0) frames.push(position);
    water = course.water.some((zone) => inside(position, zone));
    sunk =
      !water &&
      speed < 6.6 &&
      Math.hypot(position.x - course.cup.x, position.y - course.cup.y) <=
        golfCupRadius;
    if (water || sunk) break;
    const surface = course.terrain
      ? sampleGolfSurface(course, position)
      : { dx: 0, dy: 0 };
    const slope = Math.hypot(surface.dx, surface.dy);
    const accel = Math.min(6.4, slope * gravity);
    const direction = slope > 1e-4 ? 1 / slope : 0;
    let vx = velocity.x - surface.dx * direction * accel * dt;
    let vy = velocity.y - surface.dy * direction * accel * dt;
    speed = Math.hypot(vx, vy);
    const sand = course.sand.some((zone) => inside(position, zone));
    const steep = slope > 0.55 && speed < 2;
    const roll = steep ? 0.12 : sand ? sandRoll : grassRoll;
    const decay = Math.max(0, 1 - roll * dt);
    vx *= decay;
    vy *= decay;
    speed = Math.hypot(vx, vy);
    if (speed > 0) {
      const decel = (sand ? sandDecel : grassDecel) * dt;
      const factor = Math.max(0, speed - decel) / speed;
      vx *= factor;
      vy *= factor;
      speed = Math.hypot(vx, vy);
    }
    if (speed < stillSpeed && slope < stillSlope) break;
    velocity = Vec2(vx, vy);
    ball.setLinearVelocity(velocity);
  }
  if (frames.at(-1) !== position) frames.push(position);
  return {
    frames,
    position: sunk ? course.cup : water ? start : position,
    sunk,
    water,
  };
}
