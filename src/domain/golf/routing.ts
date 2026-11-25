import { golfBallRadius } from "./physics";
import type { GolfCourse, GolfPoint, GolfRect } from "./types";

export function golfSegmentClear(start: GolfPoint, end: GolfPoint, hazards: readonly GolfRect[], clearance: number) {
  return hazards.every((zone) => {
    let enter = 0;
    let leave = 1;
    for (const [from, to, center, half] of [
      [start.x, end.x, zone.x, zone.width / 2 + clearance],
      [start.y, end.y, zone.y, zone.height / 2 + clearance],
    ]) {
      if (Math.abs(to - from) < 1e-8) {
        if (Math.abs(from - center) > half) return true;
        continue;
      }
      const near = (center - half - from) / (to - from);
      const far = (center + half - from) / (to - from);
      enter = Math.max(enter, Math.min(near, far));
      leave = Math.min(leave, Math.max(near, far));
      if (enter > leave) return true;
    }
    return false;
  });
}

const distance = (a: GolfPoint, b: GolfPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const clearance = golfBallRadius + 0.10;
const routes = new WeakMap<GolfCourse, ReturnType<typeof buildGolfRoute>>();

function buildGolfRoute(course: GolfCourse) {
  const hazards = [...course.banks, ...course.water];
  const clear = (from: GolfPoint, to: GolfPoint) => golfSegmentClear(from, to, hazards, clearance);
  const corners = hazards.flatMap((zone) =>
    [-1, 1].flatMap((x) => [-1, 1].map((y) => ({
      x: zone.x + x * (zone.width / 2 + clearance + 0.20),
      y: zone.y + y * (zone.height / 2 + clearance + 0.20),
    }))),
  );
  const points = [course.cup, ...course.line.slice(0, -1), ...(course.branches ?? []).flatMap((branch) => branch.slice(0, -1)), ...corners].filter((point) =>
    point.x > 0.32 && point.x < course.width - 0.32 &&
    point.y > 0.32 && point.y < course.height - 0.32 &&
    clear(point, point),
  );
  const distances = points.map((_, index) => index === 0 ? 0 : Infinity);
  const remaining = new Set(points.keys());
  while (remaining.size) {
    let nearest = -1;
    let best = Infinity;
    for (const index of remaining) {
      if (distances[index]! < best) {
        best = distances[index]!;
        nearest = index;
      }
    }
    if (nearest < 0) break;
    remaining.delete(nearest);
    const from = points[nearest]!;
    for (const index of remaining) {
      const to = points[index]!;
      const total = best + distance(from, to);
      if (total < distances[index]! && clear(from, to)) distances[index] = total;
    }
  }
  return { points, distances, clear };
}

export function golfRoute(course: GolfCourse) {
  let route = routes.get(course);
  if (!route) {
    route = buildGolfRoute(course);
    routes.set(course, route);
  }
  const { points, distances, clear } = route;
  const targets = (position: GolfPoint) => points
    .map((point, index) => ({ point, remaining: distances[index]!, total: distance(position, point) + distances[index]! }))
    .filter(({ point, total }) => Number.isFinite(total) && distance(position, point) > 0.09 && clear(position, point))
    .sort((a, b) => a.total - b.total);
  return {
    targets,
    remaining(position: GolfPoint) {
      if (clear(position, course.cup)) return distance(position, course.cup);
      let best = Infinity;
      for (let i = 0; i < points.length; i++) {
        const total = distance(position, points[i]!) + distances[i]!;
        if (total < best && clear(position, points[i]!)) best = total;
      }
      return Number.isFinite(best) ? best : course.width * 2 + distance(position, course.cup);
    },
  };
}
