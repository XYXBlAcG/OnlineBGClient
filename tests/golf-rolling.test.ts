import { describe, expect, it } from "vitest";
import { classicGolfCourses, generateGolfCourses } from "../src/domain/golf/courses";
import { putt } from "../src/domain/golf/physics";
import { golfHeightAt, sampleGolfSurface } from "../src/domain/golf/terrain";
import type { GolfCourse } from "../src/domain/golf/types";

function slopedCourse(): GolfCourse {
  const base = classicGolfCourses[0]!;
  return {
    ...base,
    tee: { x: 12.2, y: 7.2 },
    cup: { x: 13.2, y: 7.4 },
    sand: [],
    water: [],
    banks: [],
    terrain: [
      { x: 6, y: 4, radiusX: 4.4, radiusY: 3.4, elevation: 2.4, kind: "mountain" },
    ],
  };
}

describe("golf rolling physics", () => {
  it("smoothly connects landforms without hard seams", () => {
    const course = slopedCourse();
    let previous = golfHeightAt(course, { x: 0, y: 4 });
    for (let x = 0.1; x <= course.width; x += 0.1) {
      const height = golfHeightAt(course, { x, y: 4 });
      expect(Math.abs(height - previous)).toBeLessThan(0.22);
      previous = height;
    }
    expect(golfHeightAt(course, { x: 0, y: 4 })).toBeCloseTo(0, 5);
    expect(golfHeightAt(course, { x: course.width, y: 4 })).toBeCloseTo(0, 5);
  });

  it("rolls a ball off the slope instead of resting on it", () => {
    const course = slopedCourse();
    const shot = putt(course, { x: 5.2, y: 4 }, 0, 0.05);
    expect(shot.water).toBe(false);
    const end = sampleGolfSurface(course, shot.position);
    expect(Math.hypot(end.dx, end.dy)).toBeLessThan(0.35);
    expect(golfHeightAt(course, shot.position)).toBeLessThan(
      golfHeightAt(course, { x: 5.2, y: 4 }) - 0.4,
    );
  });

  it("keeps every generated hole rollable and flat at tee and cup", () => {
    for (const seed of ["a", "b", "c", "d"]) {
      for (const course of generateGolfCourses(seed)) {
        const tee = sampleGolfSurface(course, course.tee);
        const cup = sampleGolfSurface(course, course.cup);
        expect(Math.hypot(tee.dx, tee.dy)).toBeLessThan(0.65);
        expect(Math.hypot(cup.dx, cup.dy)).toBeLessThan(0.65);
        const shot = putt(course, course.tee, 0.2, 0.6);
        expect(shot.frames.length).toBeGreaterThan(3);
        if (!shot.water && !shot.sunk) {
          const rest = sampleGolfSurface(course, shot.position);
          expect(Math.hypot(rest.dx, rest.dy)).toBeLessThan(0.75);
        }
      }
    }
  });
});
