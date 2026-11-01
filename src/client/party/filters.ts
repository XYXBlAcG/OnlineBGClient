import { GlowFilter, ShockwaveFilter, BulgePinchFilter } from "pixi-filters";
import type { Container } from "pixi.js";
import type { PartyShader } from "../../domain/party/stage";
export class PartyFilter {
  private filter: GlowFilter | ShockwaveFilter | BulgePinchFilter | undefined;
  constructor(
    container: Container,
    shader: PartyShader,
    color: string,
    enabled: boolean,
  ) {
    if (!enabled) return;
    this.filter =
      shader === "glow"
        ? new GlowFilter({
            color,
            outerStrength: 1.2,
            distance: 8,
            quality: 0.15,
          })
        : shader === "shockwave"
          ? new ShockwaveFilter({ amplitude: 18, wavelength: 120, speed: 360 })
          : shader === "rays"
            ? new GlowFilter({
                color,
                outerStrength: 0.6,
                distance: 6,
                quality: 0.15,
              })
            : shader === "void"
              ? new BulgePinchFilter({ strength: -0.45, radius: 250 })
              : undefined;
    if (this.filter) container.filters = [this.filter];
  }
  update(seconds: number, width: number, height: number): void {
    if (this.filter instanceof ShockwaveFilter) {
      this.filter.center = { x: width / 2, y: height / 2 };
      this.filter.time = seconds % 2.5;
    }
  }
  destroy(): void {
    this.filter?.destroy();
  }
}
