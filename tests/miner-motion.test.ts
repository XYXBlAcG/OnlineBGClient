import { expect, it } from "vitest";
import { MinerRigMotion } from "../src/client/miner/rig-motion";
import type { MinerHook } from "../src/domain/miner/types";

const hook: MinerHook = {
  phase: "swing",
  angle: 0,
  length: 0,
  direction: 1,
  pivotX: 0.5,
  targetId: null,
  nextBeatTick: 0,
};

it("advances every frame between snapshots, then smoothly reverses at the swing bound", () => {
  const motion = new MinerRigMotion();
  motion.sample(hook, 1, 0, false);
  const values = Array.from(
    { length: 7 },
    (_, i) => motion.sample(hook, 1, (i + 1) * 16, false).angle,
  );
  expect(
    values.every((angle, index) => index === 0 || angle > values[index - 1]),
  ).toBe(true);
  const turn = new MinerRigMotion();
  const pose = { ...hook, angle: 79 };
  turn.sample(pose, 1, 0, false);
  expect(turn.sample(pose, 1, 16, false).angle).toBeGreaterThan(79);
  expect(turn.sample(pose, 1, 64, false).angle).toBeLessThan(79);
  expect(
    turn.sample({ ...pose, direction: -1, angle: 80 }, 2, 80, false).angle,
  ).toBeLessThan(80);
});

it("nudges a late snapshot into place without jumping back from the displayed angle", () => {
  const motion = new MinerRigMotion();
  motion.sample(hook, 1, 0, false);
  const angle = motion.sample(hook, 1, 40, false).angle;
  const corrected = motion.sample({ ...hook, angle: 0.5 }, 2, 56, false).angle;
  expect(corrected).toBeGreaterThan(angle);
  expect(corrected - angle).toBeLessThan(1.5);
});
