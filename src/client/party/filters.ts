import {
  BloomFilter,
  GlowFilter,
  ShockwaveFilter,
  BulgePinchFilter,
} from "pixi-filters";
import type { Filter } from "pixi.js";
import type { Container } from "pixi.js";
import type { PartyShader } from "../../domain/party/stage";
export class PartyFilter {
  private filters: Filter[] = [];
  constructor(
    container: Container,
    shader: PartyShader,
    color: string,
    enabled: boolean,
  ) {
    if (!enabled) return;
    if (shader === "glow")
      this.filters = [
        new GlowFilter({
          color,
          outerStrength: 1.2,
          distance: 8,
          quality: 0.15,
        }),
        new BloomFilter({ strength: 0.9, quality: 2, kernelSize: 5 }),
      ];
    else if (shader === "shockwave")
      this.filters = [
        new ShockwaveFilter({ amplitude: 18, wavelength: 120, speed: 360 }),
      ];
    else if (shader === "rays")
      this.filters = [
        new GlowFilter({
          color,
          outerStrength: 0.6,
          distance: 6,
          quality: 0.15,
        }),
      ];
    else if (shader === "void")
      this.filters = [new BulgePinchFilter({ strength: -0.45, radius: 250 })];
    else if (shader === "bloom")
      this.filters = [
        new GlowFilter({
          color,
          outerStrength: 0.9,
          distance: 10,
          quality: 0.2,
        }),
        new BloomFilter({
          strength: 1.15,
          quality: 2,
          kernelSize: 5,
        }),
      ];
    if (this.filters.length) container.filters = this.filters;
  }
  update(seconds: number, width: number, height: number): void {
    for (const filter of this.filters)
      if (filter instanceof ShockwaveFilter) {
        filter.center = { x: width / 2, y: height / 2 };
        filter.time = seconds % 2.5;
      }
  }
  destroy(): void {
    for (const filter of this.filters) filter.destroy();
    this.filters = [];
  }
}
