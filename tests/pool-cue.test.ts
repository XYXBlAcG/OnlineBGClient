import { expect, it } from "vitest";
import {
  elevationDegrees,
  requiredCueElevation,
} from "../src/client/pool/cue";
import { standardPoolLayout } from "../src/domain/pool/table";

it("maps the continuous elevation slider onto cue angles", () => {
  expect(elevationDegrees(0)).toBe(8);
  expect(elevationDegrees(1)).toBe(90);
  expect(elevationDegrees(0.5)).toBeGreaterThan(40);
});

it("requires lifting only when the cue would pass through the table or a ball", () => {
  const radius = standardPoolLayout.table.ballRadius,
    halfWidth = standardPoolLayout.table.width / 2;
  const clear = requiredCueElevation(
    standardPoolLayout,
    [{ id: 0, x: 0, y: 0, pocketed: false }],
    { x: 0, y: 0 },
    0,
  );
  expect(clear).toBe(0);
  const nearRail = requiredCueElevation(
    standardPoolLayout,
    [{ id: 0, x: halfWidth - radius - 0.02, y: 0, pocketed: false }],
    { x: halfWidth - radius - 0.02, y: 0 },
    Math.PI,
  );
  expect(nearRail).toBeGreaterThan(0.3);
  const nearBall = requiredCueElevation(
    standardPoolLayout,
    [
      { id: 0, x: 0, y: 0, pocketed: false },
      { id: 1, x: -0.1, y: 0, pocketed: false },
    ],
    { x: 0, y: 0 },
    0,
  );
  expect(nearBall).toBeGreaterThan(0.1);
});
