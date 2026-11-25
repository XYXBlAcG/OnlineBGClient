import { describe, expect, it } from "vitest";
import { generateGolfCourses, longGolfCourse } from "../src/domain/golf/courses";
import { putt } from "../src/domain/golf/physics";
import type { GolfCourse } from "../src/domain/golf/types";

function insideCourse(course: GolfCourse, point: { x: number; y: number }) {
  return point.x > 0 && point.x < course.width && point.y > 0 && point.y < course.height;
}

describe("golf course generation", () => {
  it("is deterministic for the same seed and varied between seeds", () => {
    const first = generateGolfCourses("room-seed");
    const again = generateGolfCourses("room-seed");
    const other = generateGolfCourses("other-seed");
    expect(first).toEqual(again);
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(other));
  });

  it("keeps five holes with a long hard course in the middle", () => {
    const courses = generateGolfCourses("room-seed");
    expect(courses).toHaveLength(5);
    expect(courses[2]).toMatchObject({ name: "丘陵长征", par: 7 });
    expect(courses[2]!.width).toBeGreaterThan(longGolfCourse.width);
    expect(longGolfCourse.width).toBeGreaterThan(30);
    expect(longGolfCourse.par).toBe(6);
  });

  it("places tee, cup and obstacles inside every course", () => {
    for (const seed of ["a", "b", "c"]) {
      for (const course of generateGolfCourses(seed)) {
        expect(insideCourse(course, course.tee)).toBe(true);
        expect(insideCourse(course, course.cup)).toBe(true);
        for (const zone of [...course.banks, ...course.sand, ...course.water]) {
          expect(zone.x - zone.width / 2).toBeGreaterThan(-0.01);
          expect(zone.x + zone.width / 2).toBeLessThan(course.width + 0.01);
          expect(zone.y - zone.height / 2).toBeGreaterThan(-0.01);
          expect(zone.y + zone.height / 2).toBeLessThan(course.height + 0.01);
        }
        const shot = putt(course, course.tee, 0, 0.4);
        expect(shot.frames.length).toBeGreaterThan(2);
      }
    }
  });

  it("allows a full-power shot down the long course without escaping bounds", () => {
    const shot = putt(longGolfCourse, longGolfCourse.tee, 0, 1);
    for (const point of shot.frames) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(longGolfCourse.width + 0.01);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(longGolfCourse.height + 0.01);
    }
  });
});

it("allows the protocol to play all five generated holes", async () => {
  const { actionSchema } = await import("../src/domain/actions");
  expect(actionSchema.parse({ type: "golf-next", hole: 3 })).toMatchObject({ hole: 3 });
  expect(actionSchema.parse({ type: "golf-putt", hole: 4, aim: 0, power: 0.5, previousStrokes: 0 })).toMatchObject({ hole: 4 });
});

it("varies the long course and preserves a clear route on each generated hole", async () => {
  const { golfSegmentClear } = await import("../src/domain/golf/routing");
  const signatures = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const courses = generateGolfCourses(`route-${index}`);
    signatures.add(JSON.stringify(courses[2]));
    for (const course of courses) {
      const route = [course.tee, ...course.line];
      expect(route.at(-1)).toEqual(course.cup);
      expect(route.slice(1).every((point, i) => golfSegmentClear(
        route[i]!, point, [...course.banks, ...course.water], 0.45,
      ))).toBe(true);
    }
  }
  expect(signatures.size).toBe(16);
});

it("generates longer seeded challenge holes with two routes", () => {
  const seed = "challenge-course";
  const normal = generateGolfCourses(seed);
  const challenge = generateGolfCourses(seed, "challenge");
  expect(challenge).toEqual(generateGolfCourses(seed, "challenge"));
  expect(challenge[2]!.width).toBeGreaterThan(normal[2]!.width);
  expect(challenge[2]!.branches?.length).toBeGreaterThan(0);
  expect(challenge[2]!.water.length).toBeGreaterThan(normal[2]!.water.length);
});
