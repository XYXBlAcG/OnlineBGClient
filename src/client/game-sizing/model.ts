import type { GameKind } from "../../domain/catalogue";

export interface GameSizing {
  profile: string;
  width: number;
  height: number;
  min: number;
  max: number;
  scale: number;
  requested: number;
}

export function displayProfile(
  width: number,
  height: number,
  pixelRatio: number,
) {
  return `${Math.round(width)}x${Math.round(height)}@${Math.round(pixelRatio * 100) / 100}`;
}

export function gameSizing({
  width,
  height,
  kind,
  requested = 1,
  profile = "",
}: {
  width: number;
  height: number;
  kind?: GameKind;
  requested?: number;
  profile?: string;
}): GameSizing {
  const area = { width: Math.max(0, width), height: Math.max(0, height) };
  const minimum =
    kind === "scmj" ? { width: 760, height: 500 } : { width: 800, height: 540 };
  const capacity = Math.min(
    area.width / minimum.width,
    area.height / minimum.height,
  );
  const min = area.width >= 1100 && area.height >= 650 ? 0.8 : 0.9;
  const max = Math.max(1, Math.floor(Math.min(2.5, capacity) * 20) / 20);
  const desired = Number.isFinite(requested) ? requested : 1;
  return {
    profile,
    ...area,
    min,
    max,
    requested: desired,
    scale: Math.max(min, Math.min(max, desired)),
  };
}
