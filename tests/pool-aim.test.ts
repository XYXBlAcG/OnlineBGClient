import { expect, it } from "vitest";
import {
  aimFromPointer,
  poolBallCursor,
  pullStrength,
} from "../src/client/pool/aim";
import { predictShot } from "../src/client/pool/prediction";
import { resolvePoolRenderer } from "../src/client/pool/renderer";
import type { PoolBall } from "../src/domain/pool/types";

const ball = (id: number, x: number, y: number): PoolBall => ({
  id,
  x,
  y,
  pocketed: false,
});

it("aims from the cue ball toward the pointer", () => {
  expect(aimFromPointer({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
  expect(aimFromPointer({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(
    Math.PI / 2,
  );
  expect(aimFromPointer({ x: 0, y: 0 }, { x: 0, y: 0.01 })).toBeNull();
});

it("shows a forbidden cursor over the cue ball when it cannot be moved", () => {
  expect(poolBallCursor({ x: 0, y: 0 }, { x: 0, y: 0 }, false, false)).toBe(
    "not-allowed",
  );
  expect(poolBallCursor({ x: 0, y: 0 }, { x: 0, y: 0 }, true, false)).toBe(
    "grab",
  );
  expect(poolBallCursor({ x: 0, y: 0 }, { x: 0, y: 0 }, true, true)).toBe(
    "grabbing",
  );
  expect(poolBallCursor({ x: 2, y: 2 }, { x: 0, y: 0 }, true, false)).toBe(
    "default",
  );
});

it("charges only along the locked shot direction", () => {
  const aim = Math.PI;
  expect(pullStrength(aim, { x: 0.2, y: 0 }, { x: 0.4, y: 0 })).toBeCloseTo(
    0.44,
    1,
  );
  expect(pullStrength(aim, { x: 0.2, y: 0 }, { x: 0.2, y: 0.3 })).toBe(0);
});

it("predicts the cue path and ghost ball without the object path", () => {
  const prediction = predictShot(
    [ball(0, -0.5, 0), ball(1, 0, 0)],
    { x: -0.5, y: 0 },
    0,
    0.6,
  );
  expect(prediction.ghost).not.toBeNull();
  expect(prediction.cue.length).toBeGreaterThanOrEqual(2);
  expect("object" in prediction).toBe(false);
});

it("uses 3D automatically only for capable desktop browsers", () => {
  expect(
    resolvePoolRenderer("auto", false, {
      finePointer: true,
      width: 1280,
      webgl: true,
    }),
  ).toBe("3d");
  expect(
    resolvePoolRenderer("auto", false, {
      finePointer: false,
      width: 1280,
      webgl: true,
    }),
  ).toBe("2d");
  expect(
    resolvePoolRenderer("auto", false, {
      finePointer: true,
      width: 1280,
      webgl: false,
    }),
  ).toBe("2d");
  expect(
    resolvePoolRenderer("3d", true, {
      finePointer: true,
      width: 1280,
      webgl: true,
    }),
  ).toBe("2d");
  expect(
    resolvePoolRenderer("3d", false, {
      finePointer: true,
      width: 1280,
      webgl: false,
    }),
  ).toBe("2d");
});

it("bounces the aim line off a rail when no ball is in front", () => {
  const prediction = predictShot([ball(0, 0, 0)], { x: 0, y: 0 }, 0, 0.5);
  expect(prediction.ghost).toBeNull();
  expect(prediction.cue.length).toBeGreaterThanOrEqual(3);
  expect(prediction.cue[1].x).toBeCloseTo(1.089);
  expect(prediction.cue[2].x).toBeLessThan(prediction.cue[1].x);
});
