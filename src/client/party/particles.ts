import { partyAppearance, type PartyEvent } from "../../domain/party";
import { partyElapsed, seeded } from "./timeline";
export interface PartyParticle {
  index: number;
  count: number;
  a: number;
  b: number;
  c: number;
  main: boolean;
}
export interface PartyParticlePose {
  x: number;
  y: number;
  size: number;
  rotation: number;
  alpha: number;
  visible: boolean;
}
export function partyParticles(
  seed: number,
  count: number,
  mainCount: number,
): PartyParticle[] {
  const random = seeded(seed),
    mains = Math.min(count, mainCount);
  return Array.from({ length: count }, (_, index) => ({
    index,
    count: mains,
    a: random(),
    b: random(),
    c: random(),
    main: index < mains,
  }));
}
export function partyFrame(
  event: PartyEvent,
  now: number,
  width: number,
  height: number,
  target?: { x: number; y: number },
) {
  const appearance = partyAppearance(event),
    elapsed = partyElapsed(event, now),
    duration = appearance.duration,
    full = appearance.scope === "room";
  return {
    appearance,
    elapsed,
    duration,
    progress: Math.min(1, elapsed / duration),
    fade: Math.max(0, Math.min(1, elapsed / 300, (duration - elapsed) / 500)),
    width,
    height,
    full,
    tx: full
      ? width / 2
      : Math.max(64, Math.min(width - 64, target?.x ?? width * 0.65)),
    ty: full
      ? height / 2
      : Math.max(80, Math.min(height - 80, target?.y ?? height * 0.52)),
    comet: event.item === "cometEgg",
  };
}
export type PartyFrame = ReturnType<typeof partyFrame>;
export function samplePartyParticle(
  frame: PartyFrame,
  p: PartyParticle,
  out: PartyParticlePose,
): void {
  const {
      appearance,
      elapsed,
      duration,
      progress,
      width,
      height,
      full,
      tx,
      ty,
    } = frame,
    t = (elapsed / 1000) * appearance.speed;
  const phase = (t * (p.main ? 1 : 1.5) + p.a * 8) % 1;
  let x = tx,
    y = ty,
    scale = 1,
    visible = elapsed >= 0 && elapsed < duration;
  switch (appearance.pattern) {
    case "rain": {
      const life = Math.min(1.15, (duration / 1000) * 0.6),
        intro = frame.comet ? 0.8 : Math.min(0.1, (duration / 1000) * 0.1);
      const fraction = p.count <= 1 ? 0.5 : p.index / (p.count - 1),
        birth =
          intro + fraction * Math.max(0, duration / 1000 - intro - life - 0.05),
        age = elapsed / 1000 - birth;
      if (p.main) {
        visible &&= age >= 0 && age <= life;
        const q = Math.max(0, Math.min(1, age / life));
        x =
          (full
            ? 48 + p.a * Math.max(0, width - 96)
            : tx + (p.a - 0.5) * Math.min(width * 0.65, 600)) +
          (1 - q) * 80;
        y = -70 + (height * 0.92 + 70) * q * q;
        scale = 1 + (q > 0.85 ? (q - 0.85) * 2 : 0);
      } else {
        x = p.a * width + (1 - phase) * 60;
        y = -30 + (height + 60) * phase;
      }
      break;
    }
    case "orbit": {
      const angle = t * (1 + p.b * 3) + p.a * Math.PI * 2,
        radius =
          (p.main ? 40 : 20) +
          p.c *
            Math.min(width, height) *
            (full ? 0.42 : 0.25) *
            (1 - progress * 0.3);
      x = tx + Math.cos(angle) * radius;
      y = ty + Math.sin(angle) * radius * 0.7;
      scale = 1 + Math.sin(t * 3 + p.a) * 0.25;
      break;
    }
    case "burst": {
      const angle = p.a * Math.PI * 2,
        r = phase * Math.min(width, height) * 0.45;
      x = tx + Math.cos(angle) * r;
      y = ty + Math.sin(angle) * r;
      scale = 1 - phase * 0.6;
      break;
    }
    case "bounce":
      x = ((p.a * width + t * (80 + p.c * 140)) % (width + 80)) - 40;
      y = height * 0.8 - Math.abs(Math.sin(t * 2 + p.b * 12)) * height * 0.6;
      scale = 0.8 + Math.abs(Math.cos(t + p.c)) * 1.2;
      break;
    case "parade":
      x = ((t * 160 + p.a * (width + 100)) % (width + 100)) - 50;
      y = height * (0.3 + p.b * 0.5) + Math.sin(t * 6 + p.c * 9) * 25;
      scale = 1 + Math.sin(t * 6 + p.a) * 0.1;
      break;
    case "ink":
      x = tx + (p.a - 0.5) * width * 0.8;
      y = ty + (p.b - 0.5) * height * 0.5 + progress * height * 0.15;
      scale = 2 + Math.sin(progress * Math.PI) * 3;
      break;
    case "beam": {
      const q = phase;
      x = width * p.a * (1 - q) + tx * q;
      y =
        height * p.b * (1 - q) + ty * q - Math.sin(q * Math.PI) * height * 0.2;
      scale = 1 + q * 1.5;
      break;
    }
    case "waves":
      x = ((p.a * width + t * 45) % (width + 80)) - 40;
      y = height * (1 - phase) + Math.sin(t * 2 + p.c * 9) * 30;
      scale = 1 + Math.sin(t + p.a * 12) * 0.25;
      break;
  }
  Object.assign(out, {
    x,
    y,
    visible,
    size: (p.main ? 38 + p.b * 52 : 5 + p.b * 15) * scale * appearance.scale,
    rotation: t * (p.c - 0.5) * 4 + p.a * 6.28,
    alpha: frame.fade * (p.main ? 1 : 0.4 + Math.sin(phase * Math.PI) * 0.5),
  });
}
