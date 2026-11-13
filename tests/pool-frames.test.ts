import { expect, it } from "vitest";
import { interpolateBalls } from "../src/client/pool/frames";
import type { PoolShot } from "../src/domain/pool/types";

const shot: PoolShot = {
  actor: 0,
  aim: 0,
  power: 0.5,
  spin: { x: 0, y: 0 },
  cueBefore: { x: 0, y: 0 },
  impacts: [],
  frames: [
    {
      t: 0,
      balls: [
        {
          id: 0,
          x: 0,
          y: 0,
          z: 0,
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        { id: 1, x: 1, y: 0 },
      ],
    },
    {
      t: 1000,
      balls: [
        {
          id: 0,
          x: 0.5,
          y: 0,
          z: 0.1,
          rotation: { x: 0, y: 0, z: 0.7071, w: 0.7071 },
        },
        { id: 1, x: 1.5, y: 0 },
      ],
    },
  ],
  pocketed: [{ id: 14, t: 500 }],
  firstHit: 1,
  railAfterContact: true,
  cuePocketed: false,
  finalBalls: [
    { id: 0, x: 0.5, y: 0, pocketed: false },
    { id: 1, x: 1.5, y: 0, pocketed: false },
    { id: 14, x: 0, y: 0, pocketed: true },
  ],
};

it("interpolates 2D and 3D playback from the shared shot frames", () => {
  const balls = interpolateBalls(shot, 0.5),
    cue = balls.find((ball) => ball.id === 0)!;
  expect(cue.x).toBeCloseTo(0.25);
  expect(cue.z).toBeCloseTo(0.05);
  expect(cue.rotation?.z).toBeCloseTo(0.3827, 3);
  expect(cue.rotation?.w).toBeCloseTo(0.9239, 3);
  expect(balls.find((ball) => ball.id === 1)).toMatchObject({ x: 1.25 });
  expect(balls.some((ball) => ball.id === 14)).toBe(false);
});
