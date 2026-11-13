import { expect, it } from "vitest";
import { ballAtPoint } from "../src/client/pool/hit-ball";

const balls = [
  { id: 0, x: -0.4, y: 0, pocketed: false },
  { id: 9, x: 0.2, y: 0.1, pocketed: false },
  { id: 12, x: 0.9, y: -0.3, pocketed: true },
];

it("finds the ball under the pointer within the hover radius", () => {
  expect(ballAtPoint(balls, { x: 0.21, y: 0.11 })).toBe(9);
  expect(ballAtPoint(balls, { x: -0.4, y: 0 })).toBe(0);
});

it("ignores pocketed balls and empty cloth", () => {
  expect(ballAtPoint(balls, { x: 0.9, y: -0.3 })).toBeNull();
  expect(ballAtPoint(balls, { x: 0.5, y: 0.4 })).toBeNull();
});
