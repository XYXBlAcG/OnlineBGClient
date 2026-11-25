import type { GolfCourse, GolfPoint } from "./types";

export function sampleGolfSurface(course: Pick<GolfCourse, "terrain">, point: GolfPoint) {
  let height = 0;
  let dx = 0;
  let dy = 0;
  for (const hill of course.terrain ?? []) {
    const x = (point.x - hill.x) / hill.radiusX;
    const y = (point.y - hill.y) / hill.radiusY;
    const weight = 1 - x * x - y * y;
    if (weight <= 0) continue;
    const blend = weight * weight;
    height += hill.elevation * blend * weight;
    dx -= 6 * hill.elevation * x * blend / hill.radiusX;
    dy -= 6 * hill.elevation * y * blend / hill.radiusY;
  }
  return { height, dx, dy };
}
