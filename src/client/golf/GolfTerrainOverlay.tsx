import { memo, useId } from "react";
import { sampleGolfSurface } from "../../domain/golf/terrain";
import type { GolfCourse } from "../../domain/golf/types";

export const GolfTerrainOverlay = memo(function GolfTerrainOverlay({ course }: { course: GolfCourse }) {
  const id = useId();
  if (!course.terrain) return null;
  const arrows = course.terrain.flatMap((hill) => [-1, 1].map((side) => {
    const point = {
      x: Math.max(0.9, Math.min(course.width - 0.9, hill.x + side * hill.radiusX * 0.36)),
      y: Math.max(0.9, Math.min(course.height - 0.9, hill.y + hill.radiusY * 0.24)),
    };
    const { dx, dy } = sampleGolfSurface(course, point);
    const gradient = Math.hypot(dx, dy);
    return gradient > 0.055 ? { point, dx: -dx / gradient, dy: -dy / gradient } : null;
  }));
  return (
    <g className="golf-topography" pointerEvents="none" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-hill`}>
          <stop offset="0" stopColor="#e5edab" stopOpacity=".33" />
          <stop offset="1" stopColor="#e5edab" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-valley`}>
          <stop offset="0" stopColor="#164639" stopOpacity=".46" />
          <stop offset="1" stopColor="#164639" stopOpacity="0" />
        </radialGradient>
        <marker id={`${id}-slope`} viewBox="0 0 4 6" refX="4" refY="3" markerWidth="4" markerHeight="5" orient="auto">
          <path d="M0 0L4 3L0 6Z" fill="#f3eaad" />
        </marker>
      </defs>
      {course.terrain.map((hill, index) => (
        <ellipse key={index} cx={hill.x} cy={hill.y} rx={hill.radiusX} ry={hill.radiusY}
          fill={`url(#${id}-${hill.elevation > 0 ? "hill" : "valley"})`} />
      ))}
      {[course.line, ...(course.branches ?? [])].map((lane, index) => (
        <polyline key={index} points={[course.tee, ...lane].map(({ x, y }) => `${x},${y}`).join(" ")}
          fill="none" stroke="#c2dd95" strokeOpacity={index ? .38 : .30}
          strokeWidth={index ? .14 : .24} strokeDasharray={index ? ".30 .35" : undefined} />
      ))}
      {arrows.map((arrow, index) => arrow && (
        <line key={index} x1={arrow.point.x - arrow.dx * .22} y1={arrow.point.y - arrow.dy * .22}
          x2={arrow.point.x + arrow.dx * .36} y2={arrow.point.y + arrow.dy * .36}
          stroke="#f3eaad" strokeOpacity=".82" strokeWidth=".10" markerEnd={`url(#${id}-slope)`} />
      ))}
    </g>
  );
});
