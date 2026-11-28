import seedrandom from "seedrandom";
import { golfHeight, golfWidth } from "./physics";
import { golfSegmentClear } from "./routing";
import { sampleGolfSurface } from "./terrain";
import {
  golfHoleCount,
  type GolfCourse,
  type GolfDifficulty,
  type GolfPoint,
  type GolfRect,
  type GolfTerrainKind,
} from "./types";

const round = (value: number) => +value.toFixed(2);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rect(x: number, y: number, width: number, height: number): GolfRect {
  return { x, y, width, height };
}

export const classicGolfCourses: readonly GolfCourse[] = [
  {
    name: "砂湾",
    par: 2,
    width: golfWidth,
    height: golfHeight,
    tee: { x: 1.5, y: 4 },
    cup: { x: 11.5, y: 4 },
    banks: [rect(8, 2.5, 2.5, 0.35)],
    sand: [rect(6, 5.2, 3.4, 1.6)],
    water: [],
    line: [{ x: 11.5, y: 4 }],
  },
  {
    name: "石桥",
    par: 3,
    width: golfWidth,
    height: golfHeight,
    tee: { x: 1.55, y: 6.25 },
    cup: { x: 12.1, y: 2 },
    banks: [rect(5.5, 1.65, 0.38, 3.3)],
    sand: [rect(8.7, 5.35, 1.9, 1.25)],
    water: [rect(6.5, 1.35, 1.2, 2.7), rect(6.5, 6, 1.2, 4)],
    line: [
      { x: 5, y: 3.65 },
      { x: 8, y: 3.53 },
      { x: 12.1, y: 2 },
    ],
  },
  {
    name: "林间回廊",
    par: 4,
    width: golfWidth,
    height: golfHeight,
    tee: { x: 1.4, y: 2 },
    cup: { x: 11.8, y: 6.35 },
    banks: [rect(4.5, 2.1, 0.38, 4.2), rect(9.5, 5.7, 0.38, 4.6)],
    sand: [rect(7, 5.8, 2, 1)],
    water: [rect(10.8, 4.9, 1.25, 1.7)],
    line: [
      { x: 4.45, y: 5.05 },
      { x: 8.6, y: 2.1 },
      { x: 10.5, y: 2.45 },
      { x: 11.8, y: 6.35 },
    ],
  },
];

export const longGolfCourse: GolfCourse = {
  name: "长征绿道",
  par: 6,
  width: 34,
  height: 10,
  tee: { x: 1.8, y: 5 },
  cup: { x: 31.8, y: 5 },
  banks: [
    rect(7, 2.4, 0.4, 4.6),
    rect(12.5, 7.6, 0.4, 4.4),
    rect(18, 2.6, 0.4, 5),
    rect(23.5, 7.4, 0.4, 4.8),
    rect(28, 2.4, 0.4, 4.2),
  ],
  sand: [rect(15, 5, 2.4, 1.6), rect(26, 5, 2, 1.4)],
  water: [rect(20.6, 4.8, 1.4, 2.6), rect(9.6, 8.4, 2, 2)],
  line: [
    { x: 6.4, y: 5 },
    { x: 12, y: 5.1 },
    { x: 17, y: 4.6 },
    { x: 22.4, y: 5.1 },
    { x: 27, y: 5.2 },
    { x: 31.8, y: 5 },
  ],
};

interface CourseSpec {
  width: number;
  height: number;
  bends: number;
  terrain?: "ridge" | "fork" | "basin" | "hills";
  walls: number;
  sand: number;
  water: number;
  par: number;
  challenge?: boolean;
}

function buildCourse(
  name: string,
  spec: CourseSpec,
  random: () => number,
  legacy = false,
): GolfCourse {
  const { width, height } = spec;
  const margin = 1.4;
  const points: GolfPoint[] = [{ x: margin, y: margin + random() * (height - margin * 2) }];
  const routeCenter = height / 2;
  if (!legacy) points[0]!.y = round(routeCenter + (random() - 0.5) * height * 0.36);
  for (let index = 1; index <= spec.bends; index++) {
    const x = margin + ((width - margin * 2) * index) / (spec.bends + 1);
    points.push({
      x: round(x + (random() - 0.5) * (width / (spec.bends + 2)) * 0.3),
      y: round(legacy ? margin + random() * (height - margin * 2) : routeCenter + (random() - 0.5) * height * 0.62),
    });
  }
  points.push({
    x: round(width - margin),
    y: round(legacy ? margin + random() * (height - margin * 2) : routeCenter + (random() - 0.5) * height * 0.58),
  });
  const fork = spec.terrain === "fork";
  const challenge = spec.challenge === true;
  if (fork) {
    for (let index = 1; index < points.length - 1; index++)
      points[index]!.y = round(routeCenter - height * (challenge ? 0.16 : 0.23) + (random() - 0.5) * 1.6);
  }
  const branch = fork ? points.slice(1).map((point, index) => index === points.length - 2
    ? point
    : { x: point.x, y: round(routeCenter + height * (challenge ? 0.29 : 0.24) + (random() - 0.5) * (challenge ? 3.4 : 1.7)) }) : null;
  const lanes = branch ? [points, [points[0]!, ...branch]] : [points];
  const banks: GolfRect[] = [];
  const sand: GolfRect[] = [];
  const water: GolfRect[] = [];
  const distanceFromPath = (point: GolfPoint) =>
    Math.min(
      ...points.slice(0, -1).map((start, index) => {
        const end = points[index + 1]!;
        const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
        const t = clamp(
          ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) /
            (length * length),
          0,
          1,
        );
        return Math.hypot(point.x - (start.x + (end.x - start.x) * t), point.y - (start.y + (end.y - start.y) * t));
      }),
    );
  const preservesRoute = (candidate: GolfRect) => lanes.every((lane) => lane.slice(1).every((point, index) =>
    golfSegmentClear(lane[index]!, point, [candidate], challenge && lane === points ? 0.54 : 0.78),
  ));
  const overlaps = (candidate: GolfRect) => [...banks, ...sand, ...water].some((previous) =>
    Math.abs(previous.x - candidate.x) * 2 < previous.width + candidate.width + 0.45 &&
    Math.abs(previous.y - candidate.y) * 2 < previous.height + candidate.height + 0.45,
  );
  if (fork) {
    const split = rect(width * 0.54, routeCenter, width * (challenge ? 0.28 : 0.19), height * 0.15);
    if (preservesRoute(split)) water.push(split);
  }
  for (let attempt = 0; attempt < 400 && banks.length < spec.walls; attempt++) {
    const vertical = random() > 0.45;
    const length = vertical ? 1.6 + random() * 3.6 : 1.2 + random() * 2.6;
    const candidate: GolfRect = vertical
      ? rect(margin + 2 + random() * (width - margin * 2 - 4), margin + random() * (height - margin * 2), 0.4, length)
      : rect(margin + random() * (width - margin * 2), margin + random() * (height - margin * 2), length, 0.4);
    const corners: GolfPoint[] = [
      { x: candidate.x - candidate.width / 2, y: candidate.y - candidate.height / 2 },
      { x: candidate.x + candidate.width / 2, y: candidate.y - candidate.height / 2 },
      { x: candidate.x - candidate.width / 2, y: candidate.y + candidate.height / 2 },
      { x: candidate.x + candidate.width / 2, y: candidate.y + candidate.height / 2 },
    ];
    if (corners.some((corner) => corner.x < 0.7 || corner.x > width - 0.7 || corner.y < 0.7 || corner.y > height - 0.7))
      continue;
    const blocksTee = corners.some((corner) => Math.hypot(corner.x - points[0]!.x, corner.y - points[0]!.y) < 1.2);
    const blocksCup = corners.some((corner) => Math.hypot(corner.x - points.at(-1)!.x, corner.y - points.at(-1)!.y) < 1.2);
    if (blocksTee || blocksCup) continue;
    if (banks.some((bank) => Math.abs(bank.x - candidate.x) < 1.6 && Math.abs(bank.y - candidate.y) < 1.6)) continue;
    if (legacy ? corners.some((corner) => distanceFromPath(corner) < 1.1)
      : overlaps(candidate) || !preservesRoute(candidate)) continue;
    banks.push(candidate);
  }
  const scatter = (target: GolfRect[], count: number, widthRange: [number, number], heightRange: [number, number]) => {
    for (let attempt = 0; attempt < 300 && target.length < count; attempt++) {
      const zoneWidth = widthRange[0] + random() * (widthRange[1] - widthRange[0]);
      const zoneHeight = heightRange[0] + random() * (heightRange[1] - heightRange[0]);
      const candidate = rect(
        round(2 + random() * (width - 4)),
        round(1.2 + random() * (height - 2.4)),
        round(zoneWidth),
        round(zoneHeight),
      );
      const corners: GolfPoint[] = [
        { x: candidate.x - candidate.width / 2, y: candidate.y - candidate.height / 2 },
        { x: candidate.x + candidate.width / 2, y: candidate.y + candidate.height / 2 },
      ];
      if (corners.some((corner) => corner.x < 0.4 || corner.x > width - 0.4 || corner.y < 0.4 || corner.y > height - 0.4))
        continue;
      if (corners.some((corner) => Math.hypot(corner.x - points[0]!.x, corner.y - points[0]!.y) < 1.6)) continue;
      if (corners.some((corner) => Math.hypot(corner.x - points.at(-1)!.x, corner.y - points.at(-1)!.y) < 1.6)) continue;
      if (target.some((zone) => Math.abs(zone.x - candidate.x) < 1.8 && Math.abs(zone.y - candidate.y) < 1.8)) continue;
      if (!legacy && (overlaps(candidate) || (target === water && !preservesRoute(candidate)))) continue;
      target.push(candidate);
    }
  };
  scatter(water, spec.water, [0.9, 1.6], [1.2, 2.4]);
  scatter(sand, spec.sand, [1.4, 2.6], [1, 1.8]);
  const landformKinds: GolfTerrainKind[] = ["mountain", "hills", "plateau", "basin"];
  const terrain: GolfCourse["terrain"] = spec.terrain ? Array.from({
    length: Math.min(12, Math.ceil(width / 4)),
  }, (_, index) => {
    const kind = landformKinds[Math.floor(random() * landformKinds.length)]!;
    const large = width > 30;
    const magnitude =
      kind === "mountain"
        ? 2 + random() * 0.7
        : kind === "plateau"
          ? 1.15 + random() * 0.65
          : kind === "basin"
            ? -(1.4 + random() * 1.3)
            : 0.55 + random() * 0.7;
    return {
      x: round((index + 0.5) * width / Math.ceil(width / 5) + (random() - 0.5) * 2.2),
      y: round(routeCenter + (random() - 0.5) * height * 0.9),
      radiusX: round((kind === "mountain" ? 3.2 : 3.8) + random() * (large ? 3.6 : 2.4)),
      radiusY: round(2.4 + random() * Math.min(3.6, height / 2.8)),
      elevation: round(magnitude),
      kind,
      ...(kind === "plateau" ? { flat: round(0.58 + random() * 0.2) } : {}),
    };
  }) : undefined;
  if (challenge && terrain && fork) {
    for (const t of [0.27, 0.51, 0.74])
      terrain.push({ x: round(width * t), y: round(routeCenter - height * 0.18), radiusX: 4.2, radiusY: 3.1, elevation: t === 0.51 ? -0.72 : 1.15, kind: t === 0.51 ? "basin" : "mountain" });
  }
  if (spec.terrain === "basin" && terrain) {
    const cup = points.at(-1)!;
    terrain.push({ ...cup, radiusX: 4.2, radiusY: 3.2, elevation: -0.75, kind: "basin" });
  } else if (spec.terrain === "ridge" && terrain) {
    terrain.push({ x: round(width * 0.53), y: round(routeCenter), radiusX: 5.1, radiusY: 5, elevation: 0.83, kind: "hills" });
  }
  const dominant = terrain
    ? landformKinds
        .map((kind) => ({ kind, count: terrain.filter((hill) => hill.kind === kind).length }))
        .sort((a, b) => b.count - a.count)[0]?.kind
    : undefined;
  const landformName =
    dominant === "mountain"
      ? "山地"
      : dominant === "plateau"
        ? "高原"
        : dominant === "basin"
          ? "盆地"
          : dominant === "hills"
            ? "丘陵"
            : "";
  const preview = {
    terrain,
    width,
    height,
    tee: points[0]!,
    cup: points.at(-1)!,
  };
  const gentle = (zone: GolfRect) => {
    const corners = [
      { x: zone.x - zone.width / 2, y: zone.y - zone.height / 2 },
      { x: zone.x + zone.width / 2, y: zone.y - zone.height / 2 },
      { x: zone.x - zone.width / 2, y: zone.y + zone.height / 2 },
      { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 },
      { x: zone.x, y: zone.y },
    ];
    return corners.every((point) => {
      const sample = sampleGolfSurface(preview, point);
      return Math.hypot(sample.dx, sample.dy) < 0.42;
    });
  };
  const flatSand = sand.filter(gentle);
  const flatWater = water.filter(gentle);
  return {
    name: landformName ? `${landformName}·${name}` : name,
    par: spec.par,
    width,
    height,
    tee: points[0]!,
    cup: points.at(-1)!,
    banks,
    sand: flatSand,
    water: flatWater,
    line: points.slice(1),
    ...(branch ? { branches: [branch] } : {}),
    ...(terrain ? { terrain } : {}),
  };
}

const courseNames = ["海风弯道", "松林迷宫", "潮汐长廊", "碎石小径", "逆风坡道", "萤火洼地", "镜湖之眼", "苔原折返"];

export function generateLegacyGolfCourses(seed: string, holes = golfHoleCount): GolfCourse[] {
  const random = seedrandom(`${seed}:golf`);
  const courses: GolfCourse[] = [];
  const curated = [...classicGolfCourses].sort(() => random() - 0.5);
  for (let index = 0; index < holes; index++) {
    if (index === 2) {
      courses.push(structuredClone(longGolfCourse));
      continue;
    }
    if (index === 0) {
      courses.push(structuredClone(curated[index % curated.length]!));
      continue;
    }
    const hard = index >= 3;
    const name = courseNames[Math.floor(random() * courseNames.length)]!;
    courses.push(
      buildCourse(
        name,
        {
          width: 14 + Math.floor(random() * 5) + (hard ? 2 : 0),
          height: 8 + Math.floor(random() * 3),
          bends: 2 + Math.floor(random() * 2) + (hard ? 1 : 0),
          walls: 3 + Math.floor(random() * 2) + (hard ? 2 : 0),
          sand: 1 + Math.floor(random() * 2),
          water: 1 + Math.floor(random() * (hard ? 3 : 2)),
          par: 3 + Math.floor(random() * 2) + (hard ? 1 : 0),
        },
        random,
        true,
      ),
    );
  }
  return courses;
}

export function generateGolfCourses(seed: string, difficulty: GolfDifficulty = "standard"): GolfCourse[] {
  const challenge = difficulty === "challenge";
  const random = seedrandom(`${seed}:golf:rolling-terrain${challenge ? ":challenge" : ""}`);
  const names = [...courseNames];
  return Array.from({ length: golfHoleCount }, (_, index) => {
    const long = index === 2 || index === 4;
    const later = index >= 3;
    const name = long
      ? index === 2 ? "山地长征" : "盆地长征"
      : index === 5 ? "高原果岭"
        : names.splice(Math.floor(random() * names.length), 1)[0]!;
    const width =
      (long
        ? (index === 2 ? 46 : 52) + Math.floor(random() * 10)
        : later
          ? 26 + (index - 3) * 5 + Math.floor(random() * 5)
          : 15 + index * 4 + Math.floor(random() * 4)) +
      (challenge ? (long ? 16 : 6 + index * 2) : 0);
    const course = buildCourse(name, {
      width,
      height:
        (long
          ? 15 + Math.floor(random() * 4)
          : 10 + Number(later) * 4 + Math.floor(random() * 3)) +
        (challenge ? 3 : 0),
      terrain:
        index === 2 ? "fork" : index === 4 ? "basin" : later ? "ridge" : "hills",
      bends: long ? 11 : later ? 6 : index + 2,
      walls: long ? 21 : 6 + index * 2,
      sand: long ? 7 : 3 + Number(later) * 2,
      water: (long ? 9 : 3 + index) + (challenge ? 5 : 0),
      par: (long ? 8 : index + 3) + Number(challenge),
      challenge,
    }, random);
    return signatureLandform(course, index, random);
  });
}

function signatureLandform(
  course: GolfCourse,
  index: number,
  random: () => number,
): GolfCourse {
  const terrain = [...(course.terrain ?? [])];
  const mid = { x: course.width / 2, y: course.height / 2 };
  const spreadY = course.height * 0.3;
  if (index === 2) {
    for (let step = 0; step < 4; step += 1) {
      terrain.push({
        x: round(course.width * (0.22 + step * 0.16)),
        y: round(mid.y + (random() - 0.5) * spreadY * 2),
        radiusX: round(3.4 + random() * 1.8),
        radiusY: round(2.6 + random() * 1.4),
        elevation: round(2.1 + random() * 0.55),
        kind: "mountain",
      });
    }
  } else if (index === 4) {
    terrain.push({
      x: round(course.cup.x - 2.4),
      y: round(course.cup.y),
      radiusX: 4.8,
      radiusY: 3.6,
      elevation: -2.45,
      kind: "basin",
    });
    terrain.push({
      x: round(mid.x),
      y: round(mid.y - spreadY),
      radiusX: 3.2,
      radiusY: 2.4,
      elevation: 1.9,
      kind: "mountain",
    });
  } else if (index === 5) {
    for (let step = 0; step < 3; step += 1) {
      terrain.push({
        x: round(course.width * (0.3 + step * 0.18)),
        y: round(mid.y),
        radiusX: 4.2,
        radiusY: 3.4,
        elevation: 1.5,
        kind: "plateau",
        flat: 0.66,
      });
    }
  }
  return { ...course, terrain };
}
