import { expect, it } from "vitest";
import { simulateShot } from "../src/domain/pool/physics";
import { poolJaws, rackBalls } from "../src/domain/pool/table";

it("racks both modes with a complete set of unique balls", () => {
  const eight = rackBalls("eight-ball", "rack");
  const nine = rackBalls("nine-ball", "rack");
  expect(eight).toHaveLength(16);
  expect(nine).toHaveLength(10);
  expect(new Set(eight.map((ball) => ball.id)).size).toBe(16);
  expect(new Set(nine.map((ball) => ball.id)).size).toBe(10);
  expect(eight.find((ball) => ball.id === 8)).toMatchObject({
    pocketed: false,
  });
  expect(nine.find((ball) => ball.id === 9)).toMatchObject({ pocketed: false });
});

it("simulates a deterministic shot and keeps balls on the table", () => {
  const balls = rackBalls("eight-ball", "physics");
  const shot = { aim: 0, power: 0.7, spin: { x: 0, y: 0 } };
  const first = simulateShot(balls, shot);
  const second = simulateShot(balls, shot);
  expect(first.finalBalls).toEqual(second.finalBalls);
  expect(first.frames).toEqual(second.frames);
  expect(first.impacts).toEqual(second.impacts);
  expect(first.frames.length).toBeGreaterThan(2);
  expect(first.frames.at(-1)!.t).toBeLessThan(8500);
  expect(first.firstHit).not.toBeNull();
  for (const ball of first.finalBalls)
    if (!ball.pocketed) {
      expect(Math.abs(ball.x)).toBeLessThanOrEqual(1.13);
      expect(Math.abs(ball.y)).toBeLessThanOrEqual(0.57);
    }
});

it("settles shots in a playable amount of time", () => {
  const balls = rackBalls("eight-ball", "duration");
  for (const power of [0.15, 0.45, 0.9]) {
    const shot = simulateShot(balls, { aim: 0, power, spin: { x: 0, y: 0 } });
    const duration = shot.frames.at(-1)!.t;
    expect(duration).toBeGreaterThan(500);
    expect(duration).toBeLessThan(8500);
  }
});

it("keeps previously pocketed balls pocketed across shots", () => {
  const balls = [
    { id: 0, x: -0.4, y: 0, pocketed: false },
    { id: 1, x: 0, y: 0, pocketed: false },
    { id: 2, x: 0.4, y: 0.2, pocketed: true },
  ];
  const shot = simulateShot(balls, {
    aim: 0,
    power: 0.3,
    spin: { x: 0, y: 0 },
  });
  expect(shot.finalBalls.find((ball) => ball.id === 2)?.pocketed).toBe(true);
  expect(
    shot.frames.every((frame) => !frame.balls.some((ball) => ball.id === 2)),
  ).toBe(true);
});

it("lets cue spin change the cue ball path after contact", () => {
  const balls = [
    { id: 0, x: -0.4, y: 0, pocketed: false },
    { id: 1, x: 0.1, y: 0, pocketed: false },
  ];
  const positionAt = (spinY: number) => {
    const shot = simulateShot(balls, {
      aim: 0,
      power: 0.55,
      spin: { x: 0, y: spinY },
    });
    const frame =
      shot.frames.find((item) => item.t >= 1500) ??
      shot.frames[shot.frames.length - 1];
    return frame.balls.find((ball) => ball.id === 0)?.x ?? 0;
  };
  const follow = positionAt(0.8),
    neutral = positionAt(0),
    draw = positionAt(-0.8);
  expect(follow).toBeGreaterThan(neutral + 0.05);
  expect(draw).toBeLessThan(neutral);
  const objectX = (spinY: number) =>
    simulateShot(balls, {
      aim: 0,
      power: 0.55,
      spin: { x: 0, y: spinY },
    }).finalBalls.find((ball) => ball.id === 1)?.x ?? 0;
  expect(Math.abs(objectX(0.8) - objectX(-0.8))).toBeGreaterThan(0.01);
});

it("transfers side spin into ball throw and rail rebound", () => {
  const balls = [
    { id: 0, x: -0.4, y: 0, pocketed: false },
    { id: 1, x: 0, y: 0, pocketed: false },
  ];
  const positionAt = (
    shot: ReturnType<typeof simulateShot>,
    id: number,
    time: number,
  ) => {
    const frame =
      shot.frames.find((item) => item.t >= time) ??
      shot.frames[shot.frames.length - 1];
    return frame.balls.find((ball) => ball.id === id) ?? { x: 0, y: 0 };
  };
  const right = simulateShot(balls, {
    aim: 0,
    power: 0.55,
    spin: { x: 0.8, y: 0 },
  });
  const left = simulateShot(balls, {
    aim: 0,
    power: 0.55,
    spin: { x: -0.8, y: 0 },
  });
  expect(positionAt(right, 1, 300).y).toBeLessThan(-0.003);
  expect(positionAt(left, 1, 300).y).toBeGreaterThan(0.003);
  const railRight = simulateShot([{ id: 0, x: 0, y: 0, pocketed: false }], {
    aim: 0,
    power: 0.5,
    spin: { x: 0.8, y: 0 },
  });
  const railLeft = simulateShot([{ id: 0, x: 0, y: 0, pocketed: false }], {
    aim: 0,
    power: 0.5,
    spin: { x: -0.8, y: 0 },
  });
  expect(positionAt(railRight, 0, 600).y).toBeGreaterThan(0.01);
  expect(positionAt(railLeft, 0, 600).y).toBeLessThan(-0.01);
});

it("records ball and rail impacts for sound playback", () => {
  const breakShot = simulateShot(rackBalls("eight-ball", "impacts"), {
    aim: 0,
    power: 0.8,
    spin: { x: 0, y: 0 },
  });
  expect(breakShot.impacts.length).toBeGreaterThan(0);
  expect(breakShot.impacts.some((impact) => impact.kind === "ball")).toBe(true);
  expect(
    breakShot.impacts.every(
      (impact, index) =>
        impact.t >= 0 &&
        impact.intensity >= 0 &&
        impact.intensity <= 1 &&
        (index === 0 || impact.t >= breakShot.impacts[index - 1].t),
    ),
  ).toBe(true);
  const railShot = simulateShot([{ id: 0, x: 0, y: 0, pocketed: false }], {
    aim: 0,
    power: 0.5,
    spin: { x: 0, y: 0 },
  });
  expect(railShot.impacts.some((impact) => impact.kind === "rail")).toBe(true);
});

it("records quaternion orientation and carries it into the next shot", () => {
  const shot = simulateShot([{ id: 0, x: -0.4, y: 0, pocketed: false }], {
    aim: 0,
    power: 0.6,
    spin: { x: 0, y: 0 },
  });
  const frame = shot.frames.find((item) => item.t >= 200);
  const ball = frame?.balls.find((item) => item.id === 0);
  expect(ball?.rotation).toBeDefined();
  expect(ball?.z).toBe(0);
  expect(
    Math.hypot(
      ball!.rotation!.x,
      ball!.rotation!.y,
      ball!.rotation!.z,
      ball!.rotation!.w,
    ),
  ).toBeCloseTo(1, 3);
  expect(ball!.rotation!.z).toBeLessThan(-0.1);
  const final = shot.finalBalls.find((item) => item.id === 0);
  expect(final?.rotation).toEqual(
    expect.objectContaining({ w: expect.any(Number) }),
  );
  const next = simulateShot(shot.finalBalls, {
    aim: Math.PI,
    power: 0.1,
    spin: { x: 0, y: 0 },
  });
  const start = next.frames[0].balls[0].rotation!;
  expect(
    Math.abs(
      start.x * final!.rotation!.x +
        start.y * final!.rotation!.y +
        start.z * final!.rotation!.z +
        start.w * final!.rotation!.w,
    ),
  ).toBeGreaterThan(0.99);
});

it("lifts the cue ball over an obstacle with an elevated cue", () => {
  const shot = simulateShot(
    [
      { id: 0, x: -0.3, y: 0, pocketed: false },
      { id: 1, x: 0, y: 0, pocketed: false },
    ],
    { aim: 0, power: 0.85, spin: { x: 0, y: 0 }, elevation: 0.9 },
  );
  const crossing = shot.frames.find(
    (frame) => (frame.balls.find((ball) => ball.id === 0)?.x ?? -1) > -0.04,
  );
  expect(crossing?.balls.find((ball) => ball.id === 0)?.z).toBeGreaterThan(
    0.06,
  );
  const object = shot.frames
    .find((frame) => frame.t >= 300)
    ?.balls.find((ball) => ball.id === 1);
  expect(object?.x).toBeCloseTo(0, 2);
});

it("curves an elevated cue ball with side spin", () => {
  const path = (spinX: number, elevation: number, time: number) => {
    const shot = simulateShot([{ id: 0, x: -0.5, y: 0, pocketed: false }], {
      aim: 0,
      power: 0.45,
      spin: { x: spinX, y: 0 },
      elevation,
    });
    return (
      (
        shot.frames.find((frame) => frame.t >= time) ??
        shot.frames[shot.frames.length - 1]
      ).balls.find((ball) => ball.id === 0)?.y ?? 0
    );
  };
  const right = path(0.9, 0.9, 500),
    left = path(-0.9, 0.9, 500),
    flat = path(0.9, 0, 300);
  expect(right).toBeGreaterThan(0.01);
  expect(left).toBeLessThan(-0.01);
  expect(Math.abs(flat)).toBeLessThan(0.005);
});

it("captures balls through pocket mouths and angled jaws", () => {
  expect(poolJaws.length).toBe(12);
  const side = simulateShot([{ id: 0, x: 0, y: -0.52, pocketed: false }], {
    aim: -Math.PI / 2,
    power: 0.15,
    spin: { x: 0, y: 0 },
  });
  expect(side.pocketed.map((item) => item.id)).toEqual([0]);
  const corner = simulateShot([{ id: 0, x: -1.08, y: -0.5, pocketed: false }], {
    aim: -Math.PI / 2,
    power: 0.15,
    spin: { x: 0, y: 0 },
  });
  expect(corner.pocketed.map((item) => item.id)).toEqual([0]);
});

it("supports side and follow spin without losing the cue ball", () => {
  const balls = rackBalls("nine-ball", "spin");
  const result = simulateShot(balls, {
    aim: 0,
    power: 0.55,
    spin: { x: 0.6, y: 0.8 },
  });
  expect(result.frames.length).toBeGreaterThan(2);
  expect(result.finalBalls.filter((ball) => !ball.pocketed)).toHaveLength(
    result.finalBalls.filter((ball) => !ball.pocketed).length,
  );
});

function tailRotationChange(shot: ReturnType<typeof simulateShot>, frames = 4) {
  const tail = shot.frames.slice(-frames);
  let change = 0;
  for (let i = 1; i < tail.length; i += 1) {
    const before = new Map(
      tail[i - 1].balls.map((ball) => [ball.id, ball.rotation]),
    );
    for (const ball of tail[i].balls) {
      const previous = before.get(ball.id);
      if (!previous || !ball.rotation) continue;
      const dot = Math.abs(
        previous.x * ball.rotation.x +
          previous.y * ball.rotation.y +
          previous.z * ball.rotation.z +
          previous.w * ball.rotation.w,
      );
      change = Math.max(change, 1 - Math.min(1, dot));
    }
  }
  return change;
}

it("rolls the cue ball out instead of truncating its kinetic energy", () => {
  const balls = [{ id: 0, x: -0.4, y: -0.1, pocketed: false }];
  const shot = simulateShot(balls, {
    aim: 0.3,
    power: 0.75,
    spin: { x: 0, y: 0 },
  });
  expect(shot.frames.at(-1)!.t).toBeGreaterThan(4000);
  const tail = shot.frames.slice(-5);
  const lastTwo = [tail[tail.length - 2], tail[tail.length - 1]];
  for (const ball of lastTwo[1].balls) {
    const before = lastTwo[0].balls.find((item) => item.id === ball.id);
    if (!before) continue;
    expect(Math.abs(ball.x - before.x)).toBeLessThan(0.01);
    expect(Math.abs(ball.y - before.y)).toBeLessThan(0.01);
  }
});

it("settles cloth spin together with the ball instead of spinning in place", () => {
  const balls = rackBalls("eight-ball", "spin-settle");
  const shot = simulateShot(balls, {
    aim: 0,
    power: 0.8,
    spin: { x: 0.8, y: 0 },
  });
  expect(tailRotationChange(shot)).toBeLessThan(0.01);
});

it("never keeps rotating after a ball has stopped moving", () => {
  const balls = rackBalls("eight-ball", "spin-stop");
  const shot = simulateShot(balls, {
    aim: 0,
    power: 0.7,
    spin: { x: 0.8, y: 0 },
  });
  const frames = shot.frames;
  for (let index = 1; index < frames.length; index += 1) {
    const before = new Map(
      frames[index - 1].balls.map((ball) => [ball.id, ball]),
    );
    for (const ball of frames[index].balls) {
      const previous = before.get(ball.id);
      if (!previous || !ball.rotation || !previous.rotation) continue;
      const moved =
        Math.abs(ball.x - previous.x) + Math.abs(ball.y - previous.y) > 1e-4;
      const dot = Math.abs(
        previous.rotation.x * ball.rotation.x +
          previous.rotation.y * ball.rotation.y +
          previous.rotation.z * ball.rotation.z +
          previous.rotation.w * ball.rotation.w,
      );
      if (!moved) expect(1 - Math.min(1, dot)).toBeLessThan(1e-3);
    }
  }
});
