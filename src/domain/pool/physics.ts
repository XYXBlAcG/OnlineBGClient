import {
  Circle,
  Polygon,
  Settings,
  World,
  type Body,
  type Contact,
} from "planck";
import {
  standardPoolLayout,
  jawPolygon,
  type PoolTableLayout,
} from "./table";
import type {
  PoolBall,
  PoolFrame,
  PoolImpact,
  PoolRotation,
  PoolShot,
  PoolShotInput,
} from "./types";

const STEP = 1 / 240;
const SAMPLE_EVERY = 4;
const MAX_STEPS = 240 * 20;
const STOP_SPEED = 0.002;
const STOP_SPIN = 0.08;
const SLIDING_FRICTION = 1.8;
const ROLLING_RESISTANCE = 0.6;
const SPIN_DECAY = 1.1;
const CLOTH_SPIN_DECEL = 9;
const CONTACT_SLIP = 0.02;
const BALL_BALL_FRICTION = 0.06;
const RAIL_FRICTION = 0.18;
const BALL_RADIUS = standardPoolLayout.table.ballRadius;
const BALL_INERTIA = (2 / 5) * BALL_RADIUS * BALL_RADIUS;
const GRAVITY = 9.81;
const JUMP_RESTITUTION = 0.32;
const JUMP_SETTLE = 0.16;

const POCKET_CAPTURE_HEIGHT = 0.02;
const MASSE_CURVE = 2.6;
const MASSE_DECAY = 1.4;
const IDENTITY_ROTATION: PoolRotation = { x: 0, y: 0, z: 0, w: 1 };

interface BallSpin {
  x: number;
  y: number;
  z: number;
}

interface BallHeight {
  z: number;
  vz: number;
}

type ContactData = { type: "ball"; id: number } | { type: "rail" };

const round = (value: number) => Math.round(value * 1000) / 1000;
const roundRotation = (value: number) => Math.round(value * 10000) / 10000;
const distance = (x: number, y: number) => Math.hypot(x, y);

function rotate(
  rotation: PoolRotation,
  angularVelocity: { x: number; y: number; z: number },
): PoolRotation {
  const magnitude = Math.hypot(
    angularVelocity.x,
    angularVelocity.y,
    angularVelocity.z,
  );
  if (magnitude < 1e-6) return rotation;
  const angle = magnitude * STEP,
    scale = Math.sin(angle / 2) / magnitude,
    x = angularVelocity.x * scale,
    y = angularVelocity.y * scale,
    z = angularVelocity.z * scale,
    w = Math.cos(angle / 2),
    nx = w * rotation.x + x * rotation.w + y * rotation.z - z * rotation.y,
    ny = w * rotation.y - x * rotation.z + y * rotation.w + z * rotation.x,
    nz = w * rotation.z + x * rotation.y - y * rotation.x + z * rotation.w,
    nw = w * rotation.w - x * rotation.x - y * rotation.y - z * rotation.z,
    length = Math.hypot(nx, ny, nz, nw) || 1;
  return {
    x: nx / length,
    y: ny / length,
    z: nz / length,
    w: nw / length,
  };
}

export function simulateShot(
  balls: PoolBall[],
  shot: PoolShotInput,
  layout: PoolTableLayout = standardPoolLayout,
): PoolShot {
  Settings.velocityThreshold = 0;
  Settings.linearSlop = 0.0005;
  const world = new World({
    gravity: { x: 0, y: 0 },
    allowSleep: false,
    continuousPhysics: true,
  });
  const cueBall = balls.find((ball) => ball.id === 0)!;
  const cueBefore = { x: cueBall.x, y: cueBall.y };
  const bodies = new Map<number, Body>();
  const spins = new Map<number, BallSpin>();
  const rotations = new Map<number, PoolRotation>();
  const heights = new Map<number, BallHeight>();
  const previousVelocities = new Map<number, { x: number; y: number }>();
  const pocketedAt = new Map<number, number>();
  const pendingRemoval = new Set<Body>();
  const direction = { x: Math.cos(shot.aim), y: Math.sin(shot.aim) };
  const elevation = Math.min(1, Math.max(0, shot.elevation ?? 0));
  let firstHit: number | null = null;
  let railAfterContact = false;
  let cuePocketed = false;
  let time = 0;

  for (const rail of layout.rails) {
    const body = world.createBody({ type: "static" });
    body.createFixture({
      shape: new Polygon(rail.points.map((point) => ({ ...point }))),
      friction: 0,
      restitution: 0.92,
      userData: { type: "rail" } satisfies ContactData,
    });
  }
  for (const jaw of layout.jaws) {
    const body = world.createBody({ type: "static" });
    body.createFixture({
      shape: new Polygon(jawPolygon(jaw).map((point) => ({ ...point }))),
      friction: 0,
      restitution: 0.86,
      userData: { type: "rail" } satisfies ContactData,
    });
  }
  for (const ball of balls) {
    if (ball.pocketed) continue;
    const body = world.createDynamicBody({
      position: { x: ball.x, y: ball.y },
      bullet: true,
      linearDamping: 0,
      angularDamping: 0,
    });
    body.setSleepingAllowed(false);
    body.createFixture({
      shape: new Circle(layout.table.ballRadius),
      density: 1,
      friction: 0,
      restitution: 0.96,
      userData: { type: "ball", id: ball.id } satisfies ContactData,
    });
    bodies.set(ball.id, body);
    spins.set(ball.id, { x: 0, y: 0, z: 0 });
    rotations.set(ball.id, ball.rotation ?? IDENTITY_ROTATION);
    heights.set(ball.id, { z: 0, vz: 0 });
  }

  const cue = bodies.get(0);
  if (!cue) throw new Error("白球不在球桌上");
  const mass = cue.getMass();
  const speed = (1.6 + shot.power * 5.8) * (1 - elevation * 0.1);
  cue.applyLinearImpulse(
    { x: direction.x * speed * mass, y: direction.y * speed * mass },
    cue.getWorldCenter(),
    true,
  );
  const rollingSpin = speed / BALL_RADIUS;
  const cueSpin = {
    x: -direction.y * shot.spin.y * rollingSpin * 0.45,
    y: direction.x * shot.spin.y * rollingSpin * 0.45,
    z: -shot.spin.x * (18 + shot.power * 10),
  };
  spins.set(0, cueSpin);
  cue.setAngularVelocity(cueSpin.z);
  const cueHeight = heights.get(0)!;
  cueHeight.vz = Math.min(2.6, elevation * Math.max(0, shot.power - 0.4) * 6);
  heights.set(0, cueHeight);
  world.on("pre-solve", (contact) => {
    const dataA = contact.getFixtureA().getUserData() as
        ContactData | undefined,
      dataB = contact.getFixtureB().getUserData() as ContactData | undefined;
    if (dataA?.type !== "ball" || dataB?.type !== "ball") return;
    const heightA = heights.get(dataA.id)?.z ?? 0,
      heightB = heights.get(dataB.id)?.z ?? 0;
    contact.setEnabled(Math.abs(heightA - heightB) < BALL_RADIUS * 2);
  });

  const impacts: PoolImpact[] = [];
  const recordImpact = (kind: PoolImpact["kind"], intensity: number) => {
    const value = Math.min(1, Math.max(0, intensity));
    if (value < 0.04 || impacts.length >= 400) return;
    impacts.push({
      t: Math.max(0, Math.round(time * 1000)),
      kind,
      intensity: round(value),
    });
  };
  const collide = (contact: Contact) => {
    const fixtureA = contact.getFixtureA(),
      fixtureB = contact.getFixtureB();
    const dataA = fixtureA.getUserData() as ContactData | undefined,
      dataB = fixtureB.getUserData() as ContactData | undefined;
    if (!dataA || !dataB) return;
    const ball =
      dataA.type === "ball" ? dataA : dataB.type === "ball" ? dataB : null;
    const other = dataA.type === "ball" ? dataB : dataA;
    if (!ball) return;
    if (other.type === "rail") {
      if (firstHit !== null) railAfterContact = true;
      const body = bodies.get(ball.id);
      if (body) {
        const velocity = body.getLinearVelocity();
        recordImpact("rail", distance(velocity.x, velocity.y) / 10);
      }
      return;
    }
    if (other.type === "ball") {
      const heightA = heights.get(ball.id)?.z ?? 0,
        heightB = heights.get(other.id)?.z ?? 0;
      if (Math.abs(heightA - heightB) >= BALL_RADIUS * 2) return;
      const bodyA = bodies.get(ball.id),
        bodyB = bodies.get(other.id);
      if (bodyA && bodyB) {
        const velocityA = bodyA.getLinearVelocity(),
          velocityB = bodyB.getLinearVelocity();
        recordImpact(
          "ball",
          distance(velocityA.x - velocityB.x, velocityA.y - velocityB.y) / 10,
        );
      }
      if (ball.id === 0 && firstHit === null) firstHit = other.id;
      if (other.id === 0 && firstHit === null) firstHit = ball.id;
    }
  };
  world.on("begin-contact", collide);

  const applyContactFriction = () => {
    let contact = world.getContactList();
    while (contact) {
      if (contact.isTouching() && contact.isEnabled()) {
        const dataA = contact.getFixtureA().getUserData() as
            ContactData | undefined,
          dataB = contact.getFixtureB().getUserData() as
            ContactData | undefined,
          manifold = contact.getManifold(),
          worldManifold = contact.getWorldManifold(null);
        if (
          dataA &&
          dataB &&
          manifold.points.length &&
          worldManifold?.pointCount
        ) {
          let manifoldImpulse = 0;
          for (const point of manifold.points)
            manifoldImpulse += Math.abs(point.normalImpulse);
          const point = worldManifold.points[0];
          if (dataA.type === "ball" && dataB.type === "ball") {
            const bodyA = bodies.get(dataA.id),
              bodyB = bodies.get(dataB.id),
              spinA = spins.get(dataA.id),
              spinB = spins.get(dataB.id);
            if (bodyA && bodyB && spinA && spinB) {
              const massA = bodyA.getMass(),
                massB = bodyB.getMass(),
                previousA = previousVelocities.get(dataA.id),
                previousB = previousVelocities.get(dataB.id),
                normalSpeed =
                  previousA && previousB
                    ? Math.abs(
                        (bodyA.getLinearVelocity().x -
                          bodyB.getLinearVelocity().x) *
                          worldManifold.normal.x +
                          (bodyA.getLinearVelocity().y -
                            bodyB.getLinearVelocity().y) *
                            worldManifold.normal.y -
                          ((previousA.x - previousB.x) *
                            worldManifold.normal.x +
                            (previousA.y - previousB.y) *
                              worldManifold.normal.y),
                      ) *
                      ((massA * massB) / (massA + massB))
                    : 0,
                normalImpulse = Math.max(manifoldImpulse, normalSpeed),
                tangentX = -worldManifold.normal.y,
                tangentY = worldManifold.normal.x,
                posA = bodyA.getPosition(),
                posB = bodyB.getPosition(),
                rAx = point.x - posA.x,
                rAy = point.y - posA.y,
                rBx = point.x - posB.x,
                rBy = point.y - posB.y,
                crossA = rAx * tangentY - rAy * tangentX,
                crossB = rBx * tangentY - rBy * tangentX,
                velocityA = bodyA.getLinearVelocity(),
                velocityB = bodyB.getLinearVelocity(),
                relative =
                  velocityA.x * tangentX +
                  velocityA.y * tangentY +
                  spinA.z * crossA -
                  (velocityB.x * tangentX +
                    velocityB.y * tangentY +
                    spinB.z * crossB),
                effective =
                  1 / massA +
                  1 / massB +
                  (crossA * crossA) / (massA * BALL_INERTIA) +
                  (crossB * crossB) / (massB * BALL_INERTIA),
                impulse = Math.max(
                  -normalImpulse * BALL_BALL_FRICTION,
                  Math.min(
                    normalImpulse * BALL_BALL_FRICTION,
                    relative / effective,
                  ),
                );
              velocityA.x -= (tangentX * impulse) / massA;
              velocityA.y -= (tangentY * impulse) / massA;
              velocityB.x += (tangentX * impulse) / massB;
              velocityB.y += (tangentY * impulse) / massB;
              spinA.z -= (impulse * crossA) / (massA * BALL_INERTIA);
              spinB.z += (impulse * crossB) / (massB * BALL_INERTIA);
              const spinRelative =
                spinA.x * rAy - spinA.y * rAx - (spinB.x * rBy - spinB.y * rBx);
              const spinEffective =
                (BALL_RADIUS * BALL_RADIUS) / (massA * BALL_INERTIA) +
                (BALL_RADIUS * BALL_RADIUS) / (massB * BALL_INERTIA);
              const spinImpulse = Math.max(
                -normalImpulse * BALL_BALL_FRICTION,
                Math.min(
                  normalImpulse * BALL_BALL_FRICTION,
                  spinRelative / spinEffective,
                ),
              );
              spinA.x -= (rAy * spinImpulse) / (massA * BALL_INERTIA);
              spinA.y += (rAx * spinImpulse) / (massA * BALL_INERTIA);
              spinB.x += (rBy * spinImpulse) / (massB * BALL_INERTIA);
              spinB.y -= (rBx * spinImpulse) / (massB * BALL_INERTIA);
              bodyA.setLinearVelocity(velocityA);
              bodyB.setLinearVelocity(velocityB);
              bodyA.setAngularVelocity(spinA.z);
              bodyB.setAngularVelocity(spinB.z);
              spins.set(dataA.id, spinA);
              spins.set(dataB.id, spinB);
            }
          } else {
            const ball =
                dataA.type === "ball"
                  ? dataA
                  : dataB.type === "ball"
                    ? dataB
                    : null,
              rail =
                dataA.type === "rail"
                  ? dataA
                  : dataB.type === "rail"
                    ? dataB
                    : null,
              body = ball ? bodies.get(ball.id) : undefined,
              spin = ball ? spins.get(ball.id) : undefined;
            if (ball && rail && body && spin) {
              const normalX =
                  dataB.type === "ball"
                    ? -worldManifold.normal.x
                    : worldManifold.normal.x,
                normalY =
                  dataB.type === "ball"
                    ? -worldManifold.normal.y
                    : worldManifold.normal.y,
                tangentX = -normalY,
                tangentY = normalX,
                mass = body.getMass(),
                previous = previousVelocities.get(ball.id),
                normalSpeed = previous
                  ? Math.abs(
                      (body.getLinearVelocity().x - previous.x) * normalX +
                        (body.getLinearVelocity().y - previous.y) * normalY,
                    ) * mass
                  : 0,
                normalImpulse = Math.max(manifoldImpulse, normalSpeed),
                position = body.getPosition(),
                rx = point.x - position.x,
                ry = point.y - position.y,
                cross = rx * tangentY - ry * tangentX,
                velocity = body.getLinearVelocity(),
                relative =
                  velocity.x * tangentX +
                  velocity.y * tangentY +
                  spin.z * cross,
                effective = 1 / mass + (cross * cross) / (mass * BALL_INERTIA),
                impulse = Math.max(
                  -normalImpulse * RAIL_FRICTION,
                  Math.min(normalImpulse * RAIL_FRICTION, relative / effective),
                );
              velocity.x -= (tangentX * impulse) / mass;
              velocity.y -= (tangentY * impulse) / mass;
              spin.z -= (impulse * cross) / (mass * BALL_INERTIA);
              const spinRelative = spin.x * ry - spin.y * rx;
              const spinEffective =
                (BALL_RADIUS * BALL_RADIUS) / (mass * BALL_INERTIA);
              const spinImpulse = Math.max(
                -normalImpulse * RAIL_FRICTION,
                Math.min(
                  normalImpulse * RAIL_FRICTION,
                  spinRelative / spinEffective,
                ),
              );
              spin.x -= (ry * spinImpulse) / (mass * BALL_INERTIA);
              spin.y += (rx * spinImpulse) / (mass * BALL_INERTIA);
              body.setLinearVelocity(velocity);
              body.setAngularVelocity(spin.z);
              spins.set(ball.id, spin);
            }
          }
        }
      }
      contact = contact.getNext();
    }
  };

  const pocketBall = (id: number, body: Body) => {
    if (pocketedAt.has(id)) return;
    pocketedAt.set(id, time * 1000);
    pendingRemoval.add(body);
    if (id === 0) cuePocketed = true;
  };
  const checkPockets = () => {
    for (const [id, body] of bodies) {
      if (!body.isActive() || pocketedAt.has(id)) continue;
      if ((heights.get(id)?.z ?? 0) > POCKET_CAPTURE_HEIGHT) continue;
      const position = body.getPosition();
      if (
        layout.pockets.some(
          (pocket) =>
            Math.hypot(position.x - pocket.x, position.y - pocket.y) <=
            layout.table.pocketRadius,
        )
      )
        pocketBall(id, body);
    }
  };
  const frames: PoolFrame[] = [];
  let stillSteps = 0;
  for (let step = 0; step < MAX_STEPS; step++) {
    for (const [id, body] of bodies) {
      const velocity = body.getLinearVelocity();
      previousVelocities.set(id, { x: velocity.x, y: velocity.y });
    }
    world.step(STEP);
    time += STEP;
    applyContactFriction();
    checkPockets();
    for (const [id, body] of bodies) {
      if (!body.isActive()) continue;
      const spin = spins.get(id) ?? { x: 0, y: 0, z: 0 };
      spin.z = body.getAngularVelocity();
      const velocity = body.getLinearVelocity();
      const height = heights.get(id) ?? { z: 0, vz: 0 };
      height.vz -= GRAVITY * STEP;
      height.z += height.vz * STEP;
      if (height.z <= 0) {
        height.z = 0;
        if (height.vz < 0)
          height.vz =
            -height.vz > JUMP_SETTLE ? -height.vz * JUMP_RESTITUTION : 0;
      }
      heights.set(id, height);
      if (id === 0 && elevation > 0.03 && Math.abs(shot.spin.x) > 0.03) {
        const speed = distance(velocity.x, velocity.y);
        if (speed > 0.05 && height.z <= 1e-4 && height.vz <= 0) {
          const curve =
            MASSE_CURVE *
            elevation *
            shot.spin.x *
            Math.exp(-MASSE_DECAY * time) *
            Math.min(1, speed / 0.8);
          const vx = velocity.x,
            vy = velocity.y;
          velocity.x += (-vy / speed) * curve * STEP;
          velocity.y += (vx / speed) * curve * STEP;
        }
      }
      if (height.z <= 1e-4 && height.vz <= 0) {
        const slipX = velocity.x - BALL_RADIUS * spin.y,
          slipY = velocity.y + BALL_RADIUS * spin.x,
          slip = distance(slipX, slipY);
        if (slip > CONTACT_SLIP) {
          const dv = Math.min(SLIDING_FRICTION * STEP, (slip * 2) / 7),
            ux = slipX / slip,
            uy = slipY / slip;
          velocity.x -= ux * dv;
          velocity.y -= uy * dv;
          spin.x -= (5 / (2 * BALL_RADIUS)) * uy * dv;
          spin.y += (5 / (2 * BALL_RADIUS)) * ux * dv;
        } else {
          const speed = distance(velocity.x, velocity.y),
            decel = Math.min(speed, ROLLING_RESISTANCE * STEP),
            scale = speed > 0 ? (speed - decel) / speed : 0;
          velocity.x *= scale;
          velocity.y *= scale;
          spin.x = -velocity.y / BALL_RADIUS;
          spin.y = velocity.x / BALL_RADIUS;
        }
      }
      const onCloth = height.z <= 1e-4 && height.vz <= 0;
      if (onCloth) {
        const decay = Math.min(
          Math.abs(spin.z),
          CLOTH_SPIN_DECEL * STEP,
        );
        spin.z -= Math.sign(spin.z) * decay;
      } else {
        spin.z *= Math.exp(-SPIN_DECAY * STEP);
      }
      if (
        distance(velocity.x, velocity.y) <= STOP_SPEED &&
        onCloth
      ) {
        velocity.x = 0;
        velocity.y = 0;
        spin.x = 0;
        spin.y = 0;
        if (Math.abs(spin.z) <= STOP_SPIN) spin.z = 0;
      }
      body.setLinearVelocity(velocity);
      body.setAngularVelocity(spin.z);
      spins.set(id, spin);
      rotations.set(
        id,
        rotate(rotations.get(id) ?? IDENTITY_ROTATION, {
          x: -spin.x,
          y: -spin.z,
          z: -spin.y,
        }),
      );
    }
    for (const body of pendingRemoval) body.setActive(false);
    pendingRemoval.clear();
    if (step % SAMPLE_EVERY === 0)
      frames.push({
        t: Math.round(time * 1000),
        balls: [...bodies.entries()]
          .filter(([, body]) => body.isActive())
          .map(([id, body]) => {
            const rotation = rotations.get(id) ?? IDENTITY_ROTATION,
              height = heights.get(id)?.z ?? 0;
            return {
              id,
              x: round(body.getPosition().x),
              y: round(body.getPosition().y),
              z: round(height),
              rotation: {
                x: roundRotation(rotation.x),
                y: roundRotation(rotation.y),
                z: roundRotation(rotation.z),
                w: roundRotation(rotation.w),
              },
            };
          }),
      });
    let moving = false;
    for (const [id, body] of bodies) {
      if (!body.isActive()) continue;
      const velocity = body.getLinearVelocity(),
        height = heights.get(id);
      if (
        distance(velocity.x, velocity.y) > STOP_SPEED ||
        Math.abs(spins.get(id)?.z ?? 0) > STOP_SPIN ||
        (height?.z ?? 0) > 1e-4 ||
        (height?.vz ?? 0) > 0
      ) {
        moving = true;
        break;
      }
    }
    stillSteps = moving ? 0 : stillSteps + 1;
    if (stillSteps > 120) break;
  }
  const finalBalls = balls.map((ball) => {
    const body = bodies.get(ball.id);
    const pocketed = ball.pocketed || pocketedAt.has(ball.id),
      rotation = rotations.get(ball.id) ?? ball.rotation;
    return {
      id: ball.id,
      x: pocketed || !body ? round(ball.x) : round(body.getPosition().x),
      y: pocketed || !body ? round(ball.y) : round(body.getPosition().y),
      pocketed,
      ...(rotation ? { rotation } : {}),
    };
  });
  const finalFrame = {
    t: Math.round(time * 1000),
    balls: finalBalls
      .filter((ball) => !ball.pocketed)
      .map(({ id, x, y, rotation }) => ({
        id,
        x,
        y,
        z: 0,
        ...(rotation ? { rotation } : {}),
      })),
  };
  if (
    !frames.length ||
    frames[frames.length - 1].t !== finalFrame.t ||
    frames[frames.length - 1].balls.length !== finalFrame.balls.length
  )
    frames.push(finalFrame);
  for (const body of bodies.values()) world.destroyBody(body);
  return {
    actor: 0,
    aim: shot.aim,
    power: shot.power,
    spin: shot.spin,
    elevation,
    cueBefore,
    frames,
    impacts,
    pocketed: [...pocketedAt.entries()].map(([id, t]) => ({ id, t })),
    firstHit,
    railAfterContact,
    cuePocketed,
    finalBalls,
  };
}
