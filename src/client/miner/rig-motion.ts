import {
  MAX_SWING,
  MINER_STEP_MS,
  SWING_SPEED,
} from "../../domain/miner/geometry";
import type { MinerHook } from "../../domain/miner/types";

const cycle = MAX_SWING * 4;
const swung = (phase: number) => ((phase % cycle) + cycle) % cycle;

export class MinerRigMotion {
  angle = 0;
  length = 0;
  private frame = 0;
  private tick = -1;
  private phase: MinerHook["phase"] | null = null;
  private swing = 0;
  private anchor = 0;
  private anchorAt = 0;

  sample(hook: MinerHook, tick: number, now: number, quick: boolean) {
    const delta = Math.max(0, Math.min(48, now - this.frame));
    const changed = this.phase !== hook.phase;
    this.frame = now;
    this.phase = hook.phase;

    if (hook.phase === "swing") {
      if (this.tick !== tick || changed) {
        this.anchor =
          hook.direction > 0
            ? hook.angle + MAX_SWING
            : 3 * MAX_SWING - hook.angle;
        this.anchorAt = now;
      }
      const speed = (SWING_SPEED * (quick ? 1.8 : 1)) / 1000;
      if (changed) this.swing = this.anchor;
      else {
        const expected =
          this.anchor +
          Math.min(now - this.anchorAt, MINER_STEP_MS * 2) * speed;
        const error = swung(expected - this.swing + cycle / 2) - cycle / 2;
        const adjustment = Math.max(
          -speed * 0.45,
          Math.min(speed * 0.45, error / 180),
        );
        this.swing = swung(this.swing + (speed + adjustment) * delta);
      }
      this.angle = MAX_SWING - Math.abs(swung(this.swing) - 2 * MAX_SWING);
      this.length = 0;
    } else {
      this.angle = hook.angle;
      this.length = changed
        ? hook.length
        : this.length +
          (hook.length - this.length) *
            Math.min(1, delta / (MINER_STEP_MS * 0.54));
    }
    this.tick = tick;
    return this;
  }
}
