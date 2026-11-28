import type { GolfCourse, GolfPoint, GolfTerrainKind } from "./types";
import { golfHeight, golfWidth } from "./physics";

export const golfVerticalScale = 1.32;

export interface GolfSurfaceSample {
  height: number;
  dx: number;
  dy: number;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function falloffProfile(kind: GolfTerrainKind, flat?: number) {
  const edge = clamp01(flat ?? 0.62);
  if (kind === "plateau")
    return {
      weight: (r: number) => {
        if (r <= edge) return 1;
        const s = clamp01((r - edge) / Math.max(0.02, 1 - edge));
        return 1 - s * s * (3 - 2 * s);
      },
    };
  const power = kind === "mountain" ? 2.8 : kind === "basin" ? 2 : 1.35;
  return { weight: (r: number) => Math.pow(1 - r * r, power) };
}

type TerrainSource = Pick<GolfCourse, "terrain"> & {
  width?: number;
  height?: number;
  tee?: GolfPoint;
  cup?: GolfPoint;
  water?: GolfCourse["water"];
  banks?: GolfCourse["banks"];
};

function rawHeight(source: TerrainSource, point: GolfPoint) {
  let height = 0;
  for (const hill of source.terrain ?? []) {
    const xn = (point.x - hill.x) / hill.radiusX;
    const yn = (point.y - hill.y) / hill.radiusY;
    const r = Math.hypot(xn, yn);
    if (r >= 1) continue;
    height += hill.elevation * falloffProfile(hill.kind, hill.flat).weight(r);
  }
  return height;
}

function wallFade(source: TerrainSource, point: GolfPoint) {
  let fade = 1;
  for (const bank of source.banks ?? []) {
    const distance =
      Math.max(
        Math.abs(point.x - bank.x) - bank.width / 2,
        Math.abs(point.y - bank.y) - bank.height / 2,
      );
    const s = clamp01((distance - 0.6) / 1.1);
    fade = Math.min(fade, s * s * (3 - 2 * s));
  }
  return fade;
}

function padFade(source: TerrainSource, point: GolfPoint) {
  let fade = 1;
  for (const center of [source.tee, source.cup]) {
    if (!center) continue;
    const distance = Math.hypot(point.x - center.x, point.y - center.y);
    const s = clamp01((distance - 0.9) / 0.9);
    fade = Math.min(fade, s * s * (3 - 2 * s));
  }
  return fade;
}

function edgeFade(source: TerrainSource, point: GolfPoint) {
  const width = source.width ?? golfWidth;
  const height = source.height ?? golfHeight;
  const margin = Math.min(
    point.x,
    point.y,
    width - point.x,
    height - point.y,
  );
  const inner = 0.9;
  const outer = 2.3;
  if (margin <= inner) return 0;
  const s = clamp01((margin - inner) / (outer - inner));
  return s * s * (3 - 2 * s);
}

function hazardDip(source: TerrainSource, point: GolfPoint) {
  let dip = 0;
  for (const zone of source.water ?? []) {
    const outer =
      Math.max(
        Math.abs(point.x - zone.x) - zone.width / 2,
        Math.abs(point.y - zone.y) - zone.height / 2,
      ) - 0.32;
    if (outer > 0) continue;
    const s = clamp01(-outer / 0.32);
    dip -= 0.05 * (s * s * (3 - 2 * s));
  }
  return dip;
}

export function golfHeightAt(source: TerrainSource, point: GolfPoint) {
  const edge = edgeFade(source, point);
  const flat = Math.min(padFade(source, point), wallFade(source, point));
  return (
    (rawHeight(source, point) * flat + hazardDip(source, point) * flat) *
    edge *
    golfVerticalScale
  );
}

export function sampleGolfSurface(
  source: TerrainSource,
  point: GolfPoint,
): GolfSurfaceSample {
  const height = golfHeightAt(source, point);
  const delta = 0.05;
  const dx =
    (golfHeightAt(source, { x: point.x + delta, y: point.y }) -
      golfHeightAt(source, { x: point.x - delta, y: point.y })) /
    (2 * delta);
  const dy =
    (golfHeightAt(source, { x: point.x, y: point.y + delta }) -
      golfHeightAt(source, { x: point.x, y: point.y - delta })) /
    (2 * delta);
  return { height, dx, dy };
}

export function golfTerrainLabel(kind: GolfTerrainKind) {
  return kind === "mountain"
    ? "山地"
    : kind === "plateau"
      ? "高原"
      : kind === "basin"
        ? "盆地"
        : "丘陵";
}
