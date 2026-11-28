import { expect, it } from "vitest";
import { generateGolfCourses, classicGolfCourses } from "../src/domain/golf/courses";
import { sampleGolfSurface } from "../src/domain/golf/terrain";
import type { GolfCourse } from "../src/domain/golf/types";
import { golfSegmentClear } from "../src/domain/golf/routing";
import { putt } from "../src/domain/golf/physics";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";

it("generates seed-stable hills and two clear playable routes on a larger course", () => {
  const first = generateGolfCourses("terrain-A")[2]!;
  expect(first.width).toBeGreaterThan(40);
  expect(first.terrain).toBeDefined();
  expect(first.terrain).toEqual(generateGolfCourses("terrain-A")[2]!.terrain);
  expect(first.terrain).not.toEqual(generateGolfCourses("terrain-B")[2]!.terrain);
  expect(first.branches).toHaveLength(1);
  for (const lane of [first.line, ...first.branches!]) {
    const points = [first.tee, ...lane];
    expect(points.at(-1)).toEqual(first.cup);
    expect(lane.every((point, i) => golfSegmentClear(points[i]!, point, [...first.banks, ...first.water], 0.45))).toBe(true);
  }
});

it("curves a rolling ball downhill while the old flat course still runs straight", () => {
  const original = classicGolfCourses[0]!;
  const start = { x: 2, y: 4 };
  const flat = { ...original, banks: [], sand: [], water: [] };
  const sloped: GolfCourse = {
    ...flat,
    tee: { x: 12, y: 7 },
    cup: { x: 13, y: 7.4 },
    terrain: [{ x: 4, y: 3, radiusX: 4, radiusY: 3, elevation: 0.85, kind: "hills" }],
  };
  expect(sampleGolfSurface(flat, start)).toEqual({ height: 0, dx: 0, dy: 0 });
  expect(sampleGolfSurface(sloped, start).dy).toBeLessThan(0);
  expect(putt(flat, start, 0, 0.48).position.y).toBe(4);
  expect(putt(sloped, start, 0, 0.48).position.y).toBeGreaterThan(4.07);
});

it("pins the live terrain and the replay physics to the saved course", () => {
  const room = new Room("terrain", { kind: "golf", humans: 2, ai: [], team: false, training: false });
  const host = room.claim("a"), guest = room.claim("b");
  room.setReady(guest, true);
  room.start(host);
  room.act(host, "shot", room.version, { type: "golf-putt", hole: 0, previousStrokes: 0, aim: 0.1, power: 0.5 });
  const archive = JSON.parse(JSON.stringify(room.export()));
  const replay = new Replay(archive.replay);
  expect(replay.record.golfCourses?.[0]?.terrain?.length).toBeGreaterThan(0);
  expect(replay.frame(replay.record.events.length)).toEqual(room.state);
  expect(Room.restore(archive).state).toEqual(room.state);
});

it("builds a continuous colored surface matching simulation heights on the slope", async () => {
  const { golfSurfaceGeometry } = await import("../src/client/golf/render3d/surface");
  const course = generateGolfCourses("terrain-A", "challenge")[2]!;
  const geometry = golfSurfaceGeometry(course, "#8fc17f");
  try {
    const positions = geometry.attributes.position!;
    const colors = geometry.attributes.color!;
    expect(geometry.index?.count).toBeGreaterThan(positions.count);
    expect(colors.count).toBe(positions.count);
    let raised = false;
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index) + course.width / 2;
      const y = positions.getZ(index) + course.height / 2;
      if (x < 0 || x > course.width || y < 0 || y > course.height) continue;
      expect(positions.getY(index)).toBeCloseTo(sampleGolfSurface(course, { x, y }).height, 4);
      raised ||= positions.getY(index) > 0.5;
    }
    expect(raised).toBe(true);
  } finally {
    geometry.dispose();
  }
});
