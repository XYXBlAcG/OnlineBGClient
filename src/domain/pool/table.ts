import type { PoolBall, PoolMode } from "./types";

export const POOL_TABLE = {
  width: 2.24,
  height: 1.12,
  ballRadius: 0.031,
  pocketRadius: 0.05,
  railThickness: 0.045,
  railHeight: 0.065,
} as const;

export interface PoolPoint {
  x: number;
  y: number;
}

export interface PoolRail {
  points: [PoolPoint, PoolPoint, PoolPoint, PoolPoint];
}

export interface PoolJaw {
  a: PoolPoint;
  b: PoolPoint;
  thickness: number;
}

export const poolPockets: PoolPoint[] = [
  { x: -POOL_TABLE.width / 2, y: -POOL_TABLE.height / 2 },
  { x: 0, y: -POOL_TABLE.height / 2 },
  { x: POOL_TABLE.width / 2, y: -POOL_TABLE.height / 2 },
  { x: -POOL_TABLE.width / 2, y: POOL_TABLE.height / 2 },
  { x: 0, y: POOL_TABLE.height / 2 },
  { x: POOL_TABLE.width / 2, y: POOL_TABLE.height / 2 },
];

const { width: w, height: h, pocketRadius: pr, railThickness: rt } = POOL_TABLE;
const cornerMouth = POOL_TABLE.ballRadius * 2.8;

const horizontalRail = (y: number, from: number, to: number): PoolRail => ({
  points: [
    { x: from, y },
    { x: to, y },
    { x: to, y: y + Math.sign(y) * rt },
    { x: from, y: y + Math.sign(y) * rt },
  ],
});
const verticalRail = (x: number, from: number, to: number): PoolRail => ({
  points: [
    { x, y: from },
    { x, y: to },
    { x: x + Math.sign(x) * rt, y: to },
    { x: x + Math.sign(x) * rt, y: from },
  ],
});

export const poolRails: PoolRail[] = [
  horizontalRail(-h / 2, -w / 2 + cornerMouth, -pr),
  horizontalRail(-h / 2, pr, w / 2 - cornerMouth),
  horizontalRail(h / 2, -w / 2 + cornerMouth, -pr),
  horizontalRail(h / 2, pr, w / 2 - cornerMouth),
  verticalRail(-w / 2, -h / 2 + cornerMouth, h / 2 - cornerMouth),
  verticalRail(w / 2, -h / 2 + cornerMouth, h / 2 - cornerMouth),
];

const jawThickness = POOL_TABLE.railThickness * 0.4;
const jawDepth = POOL_TABLE.railThickness * 0.9;
const sideJaws = (railY: number): PoolJaw[] => {
  const outward = Math.sign(railY),
    edge = railY + (outward * jawThickness) / 2;
  return [-1, 1].map((side) => ({
    a: { x: side * pr, y: edge },
    b: { x: side * pr * 0.5, y: railY + outward * jawDepth },
    thickness: jawThickness,
  }));
};
const horizontalCornerJaws = (railY: number): PoolJaw[] => {
  const outward = Math.sign(railY),
    edge = railY + (outward * jawThickness) / 2;
  return [-1, 1].map((side) => ({
    a: { x: side * (w / 2 - cornerMouth), y: edge },
    b: {
      x: side * (w / 2 - cornerMouth * 0.5),
      y: railY + outward * jawDepth,
    },
    thickness: jawThickness,
  }));
};
const verticalCornerJaws = (railX: number): PoolJaw[] => {
  const outward = Math.sign(railX),
    edge = railX + (outward * jawThickness) / 2;
  return [-1, 1].map((side) => ({
    a: { x: edge, y: side * (h / 2 - cornerMouth) },
    b: {
      x: railX + outward * jawDepth,
      y: side * (h / 2 - cornerMouth * 0.5),
    },
    thickness: jawThickness,
  }));
};

export const poolJaws: PoolJaw[] = [
  ...sideJaws(-h / 2),
  ...sideJaws(h / 2),
  ...horizontalCornerJaws(-h / 2),
  ...horizontalCornerJaws(h / 2),
  ...verticalCornerJaws(-w / 2),
  ...verticalCornerJaws(w / 2),
];

export function jawPolygon(
  jaw: PoolJaw,
): [PoolPoint, PoolPoint, PoolPoint, PoolPoint] {
  const dx = jaw.b.x - jaw.a.x,
    dy = jaw.b.y - jaw.a.y,
    length = Math.hypot(dx, dy) || 1,
    nx = (-dy / length) * (jaw.thickness / 2),
    ny = (dx / length) * (jaw.thickness / 2);
  return [
    { x: jaw.a.x + nx, y: jaw.a.y + ny },
    { x: jaw.b.x + nx, y: jaw.b.y + ny },
    { x: jaw.b.x - nx, y: jaw.b.y - ny },
    { x: jaw.a.x - nx, y: jaw.a.y - ny },
  ];
}

function seeded(seed: string): () => number {
  let value = 2166136261;
  for (const character of seed)
    value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const triangle = (r: number, rows: number): PoolPoint[] => {
  const dx = r * Math.sqrt(3) + 0.0002,
    dy = r * 2 + 0.0002,
    points: PoolPoint[] = [];
  for (let row = 0; row < rows; row++)
    for (let column = 0; column <= row; column++)
      points.push({
        x: w / 4 + row * dx,
        y: (column - row / 2) * dy,
      });
  return points;
};

const diamond = (r: number): PoolPoint[] => {
  const dx = r * Math.sqrt(3) + 0.0002,
    dy = r * 2 + 0.0002,
    points: PoolPoint[] = [];
  for (let row = 0; row < 5; row++) {
    const count = row < 3 ? row + 1 : 5 - row;
    for (let column = 0; column < count; column++)
      points.push({
        x: w / 4 + row * dx,
        y: (column - (count - 1) / 2) * dy,
      });
  }
  return points;
};

export function rackBalls(mode: PoolMode, seed: string): PoolBall[] {
  const random = seeded(seed),
    r = POOL_TABLE.ballRadius,
    cue: PoolBall = {
      id: 0,
      x: -w / 4,
      y: 0,
      pocketed: false,
    };
  if (mode === "nine-ball") {
    const order = [1, ...shuffle([2, 3, 4, 5, 6, 7, 8], random)];
    order.splice(4, 0, 9);
    return [
      cue,
      ...diamond(r).map((point, index) => ({
        id: order[index],
        ...point,
        pocketed: false,
      })),
    ];
  }
  const solids = shuffle([1, 2, 3, 4, 5, 6, 7], random),
    stripes = shuffle([9, 10, 11, 12, 13, 14, 15], random),
    order: number[] = [];
  for (let i = 0; i < 7; i++) order.push(solids[i], stripes[i]);
  order.splice(4, 0, 8);
  return [
    cue,
    ...triangle(r, 5).map((point, index) => ({
      id: order[index],
      ...point,
      pocketed: false,
    })),
  ];
}

export function respotBall(
  balls: PoolBall[],
  id: number,
  start = w / 4,
): PoolPoint {
  const occupied = balls.filter((ball) => !ball.pocketed && ball.id !== id);
  const spacing = POOL_TABLE.ballRadius * 2.1;
  const limit = w / 2 - POOL_TABLE.ballRadius - 0.004;
  const candidates = [
    start,
    ...occupied.flatMap((ball) => {
      if (Math.abs(ball.y) >= spacing) return [];
      const offset = Math.sqrt(spacing * spacing - ball.y * ball.y) + 0.00001;
      return [ball.x - offset, ball.x + offset];
    }),
  ]
    .filter((x) => Math.abs(x) <= limit)
    .sort((a, b) => {
      if (a >= start !== b >= start) return a >= start ? -1 : 1;
      return a >= start ? a - b : b - a;
    });
  for (const x of candidates) {
    if (occupied.every((ball) => Math.hypot(ball.x - x, ball.y) >= spacing))
      return { x, y: 0 };
  }
  throw new Error("球桌中心线没有合法复位位置");
}

export function insideTable(point: PoolPoint): boolean {
  const margin = POOL_TABLE.ballRadius + 0.004;
  return (
    Math.abs(point.x) <= w / 2 - margin && Math.abs(point.y) <= h / 2 - margin
  );
}

export function cuePlacementValid(balls: PoolBall[], cue: PoolPoint): boolean {
  if (!insideTable(cue)) return false;
  return balls.every(
    (ball) =>
      ball.id === 0 ||
      ball.pocketed ||
      Math.hypot(ball.x - cue.x, ball.y - cue.y) > POOL_TABLE.ballRadius * 2.05,
  );
}
