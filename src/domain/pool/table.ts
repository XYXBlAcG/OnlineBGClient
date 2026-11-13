import type { PoolBall, PoolMode } from "./types";

export interface PoolTableSpec {
  width: number;
  height: number;
  ballRadius: number;
  pocketRadius: number;
  railThickness: number;
  railHeight: number;
}

export interface PoolTableLayout {
  table: PoolTableSpec;
  pockets: PoolPoint[];
  rails: PoolRail[];
  jaws: PoolJaw[];
}

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

function buildLayout(spec: PoolTableSpec): PoolTableLayout {
  const { width: w, height: h, pocketRadius: pr, railThickness: rt } = spec,
    cornerMouth = spec.ballRadius * 2.8;
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
  const pockets: PoolPoint[] = [
    { x: -w / 2, y: -h / 2 },
    { x: 0, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: -w / 2, y: h / 2 },
    { x: 0, y: h / 2 },
    { x: w / 2, y: h / 2 },
  ];
  const rails: PoolRail[] = [
    horizontalRail(-h / 2, -w / 2 + cornerMouth, -pr),
    horizontalRail(-h / 2, pr, w / 2 - cornerMouth),
    horizontalRail(h / 2, -w / 2 + cornerMouth, -pr),
    horizontalRail(h / 2, pr, w / 2 - cornerMouth),
    verticalRail(-w / 2, -h / 2 + cornerMouth, h / 2 - cornerMouth),
    verticalRail(w / 2, -h / 2 + cornerMouth, h / 2 - cornerMouth),
  ];
  const jawThickness = rt * 0.4,
    jawDepth = rt * 0.9;
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
  const jaws: PoolJaw[] = [
    ...sideJaws(-h / 2),
    ...sideJaws(h / 2),
    ...horizontalCornerJaws(-h / 2),
    ...horizontalCornerJaws(h / 2),
    ...verticalCornerJaws(-w / 2),
    ...verticalCornerJaws(w / 2),
  ];
  return { table: spec, pockets, rails, jaws };
}

export const standardPoolLayout = buildLayout({
  width: 2.24,
  height: 1.12,
  ballRadius: 0.031,
  pocketRadius: 0.05,
  railThickness: 0.045,
  railHeight: 0.065,
});
export const partyPoolLayout = buildLayout({
  width: 3.1,
  height: 1.55,
  ballRadius: 0.031,
  pocketRadius: 0.055,
  railThickness: 0.045,
  railHeight: 0.065,
});
export const POOL_TABLE = standardPoolLayout.table;
export const poolPockets = standardPoolLayout.pockets;
export const poolRails = standardPoolLayout.rails;
export const poolJaws = standardPoolLayout.jaws;

export function poolLayout(mode: PoolMode): PoolTableLayout {
  return mode === "party" ? partyPoolLayout : standardPoolLayout;
}

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

const triangle = (
  layout: PoolTableLayout,
  rows: number,
): PoolPoint[] => {
  const r = layout.table.ballRadius,
    dx = r * Math.sqrt(3) + 0.0002,
    dy = r * 2 + 0.0002,
    points: PoolPoint[] = [];
  for (let row = 0; row < rows; row++)
    for (let column = 0; column <= row; column++)
      points.push({
        x: layout.table.width / 4 + row * dx,
        y: (column - row / 2) * dy,
      });
  return points;
};

const diamond = (layout: PoolTableLayout): PoolPoint[] => {
  const r = layout.table.ballRadius,
    dx = r * Math.sqrt(3) + 0.0002,
    dy = r * 2 + 0.0002,
    points: PoolPoint[] = [];
  for (let row = 0; row < 5; row++) {
    const count = row < 3 ? row + 1 : 5 - row;
    for (let column = 0; column < count; column++)
      points.push({
        x: layout.table.width / 4 + row * dx,
        y: (column - (count - 1) / 2) * dy,
      });
  }
  return points;
};

export const partyBallOwners = (players: number): number[][] =>
  Array.from({ length: players }, (_, player) =>
    [1, 2, 3].map((index) => player * 3 + index),
  );

export const partySpecialBalls = (players: number) => [
  { id: players * 3 + 1, kind: "bolt" as const },
  { id: players * 3 + 2, kind: "gold" as const },
];

export function rackBalls(
  mode: PoolMode,
  seed: string,
  players = 2,
): PoolBall[] {
  const layout = poolLayout(mode),
    random = seeded(seed),
    cue: PoolBall = {
      id: 0,
      x: -layout.table.width / 4,
      y: 0,
      pocketed: false,
    };
  if (mode === "nine-ball") {
    const order = [1, ...shuffle([2, 3, 4, 5, 6, 7, 8], random)];
    order.splice(4, 0, 9);
    return [
      cue,
      ...diamond(layout).map((point, index) => ({
        id: order[index],
        ...point,
        pocketed: false,
      })),
    ];
  }
  if (mode === "party") {
    const count = players * 3,
      order = shuffle(
        Array.from({ length: count }, (_, index) => index + 1),
        random,
      ),
      specials = partySpecialBalls(players);
    return [
      cue,
      ...triangle(layout, 4)
        .concat(triangle(layout, 5).slice(0, Math.max(0, count - 10)))
        .slice(0, count)
        .map((point, index) => ({
          id: order[index],
          ...point,
          pocketed: false,
        })),
      ...specials.map((special, index) => ({
        id: special.id,
        x: 0,
        y: (index === 0 ? -1 : 1) * (layout.table.height / 4),
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
    ...triangle(layout, 5).map((point, index) => ({
      id: order[index],
      ...point,
      pocketed: false,
    })),
  ];
}

export function respotBall(
  balls: PoolBall[],
  id: number,
  start?: number,
  layout: PoolTableLayout = standardPoolLayout,
): PoolPoint {
  const w = layout.table.width,
    ballRadius = layout.table.ballRadius,
    startX = start ?? w / 4;
  const occupied = balls.filter((ball) => !ball.pocketed && ball.id !== id);
  const spacing = ballRadius * 2.1;
  const limit = w / 2 - ballRadius - 0.004;
  const candidates = [
    startX,
    ...occupied.flatMap((ball) => {
      if (Math.abs(ball.y) >= spacing) return [];
      const offset = Math.sqrt(spacing * spacing - ball.y * ball.y) + 0.00001;
      return [ball.x - offset, ball.x + offset];
    }),
  ]
    .filter((x) => Math.abs(x) <= limit)
    .sort((a, b) => {
      if (a >= startX !== b >= startX) return a >= startX ? -1 : 1;
      return a >= startX ? a - b : b - a;
    });
  for (const x of candidates) {
    if (occupied.every((ball) => Math.hypot(ball.x - x, ball.y) >= spacing))
      return { x, y: 0 };
  }
  throw new Error("球桌中心线没有合法复位位置");
}

export function insideTable(
  point: PoolPoint,
  layout: PoolTableLayout = standardPoolLayout,
): boolean {
  const margin = layout.table.ballRadius + 0.004;
  return (
    Math.abs(point.x) <= layout.table.width / 2 - margin &&
    Math.abs(point.y) <= layout.table.height / 2 - margin
  );
}

export function cuePlacementValid(
  balls: PoolBall[],
  cue: PoolPoint,
  layout: PoolTableLayout = standardPoolLayout,
): boolean {
  if (!insideTable(cue, layout)) return false;
  return balls.every(
    (ball) =>
      ball.id === 0 ||
      ball.pocketed ||
      Math.hypot(ball.x - cue.x, ball.y - cue.y) >
        layout.table.ballRadius * 2.05,
  );
}
