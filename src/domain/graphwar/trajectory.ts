import { balance } from "./balance";
import { shotDamage } from "./damage";
import RBush from "rbush";
import { compileFormula } from "./expression";
import {
  openingProtected,
  graphwarModes,
  battlefield,
  guarded,
  type Impact,
  type Soldier,
  type Point,
  type GraphwarView,
  type Shot,
  type Circle,
} from "./types";
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export function containsTerrain(
  view: Pick<GraphwarView, "terrain" | "craters">,
  p: Point,
  padding = 0,
): boolean {
  return view.terrain.some(
    (c) =>
      (c.x - p.x) ** 2 + (c.y - p.y) ** 2 <= (c.radius + padding) ** 2 &&
      (c.permanent ||
        !view.craters.some(
          (hole) =>
            hole.radius > padding &&
            (hole.x - p.x) ** 2 + (hole.y - p.y) ** 2 <=
              (hole.radius - padding) ** 2,
        )),
  );
}
export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(p.x - a.x - ratio * dx, p.y - a.y - ratio * dy);
}
export function circleInterval(
  circle: Circle,
  a: Point,
  b: Point,
): [number, number] | null {
  if (
    Math.max(a.x, b.x) < circle.x - circle.radius ||
    Math.min(a.x, b.x) > circle.x + circle.radius ||
    Math.max(a.y, b.y) < circle.y - circle.radius ||
    Math.min(a.y, b.y) > circle.y + circle.radius
  )
    return null;
  const dx = b.x - a.x,
    dy = b.y - a.y,
    length = dx * dx + dy * dy;
  const px = a.x - circle.x,
    py = a.y - circle.y,
    dot = px * dx + py * dy;
  if (!length)
    return px * px + py * py <= circle.radius * circle.radius ? [0, 1] : null;
  const discriminant =
    dot * dot - length * (px * px + py * py - circle.radius * circle.radius);
  if (discriminant < 0) return null;
  const delta = Math.sqrt(discriminant);
  const low = Math.max(0, (-dot - delta) / length),
    high = Math.min(1, (-dot + delta) / length);
  return low <= high ? [low, high] : null;
}
export function terrainIntersection(
  view: Pick<GraphwarView, "terrain" | "craters">,
  a: Point,
  b: Point,
): Point | null {
  const cuts: number[] = [];
  for (const c of view.terrain) {
    const interval = circleInterval(c, a, b);
    if (interval) cuts.push(...interval);
  }
  if (!cuts.length) return null;
  for (const c of view.craters) {
    const interval = circleInterval(c, a, b);
    if (interval) cuts.push(...interval);
  }
  cuts.sort((a, b) => a - b);
  const dx = b.x - a.x,
    dy = b.y - a.y;
  for (let i = 1; i < cuts.length; i++) {
    const t = (cuts[i - 1] + cuts[i]) / 2;
    if (containsTerrain(view, { x: a.x + dx * t, y: a.y + dy * t }))
      return { x: a.x + dx * cuts[i - 1], y: a.y + dy * cuts[i - 1] };
  }
  return null;
}

interface IndexedCircle {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  circle: Circle;
}
export class BattlefieldIndex {
  private terrain = new RBush<IndexedCircle>();
  private holes = new RBush<IndexedCircle>();
  constructor(view: Pick<GraphwarView, "terrain" | "craters">) {
    const item = (circle: Circle): IndexedCircle => ({
      minX: circle.x - circle.radius,
      minY: circle.y - circle.radius,
      maxX: circle.x + circle.radius,
      maxY: circle.y + circle.radius,
      circle,
    });
    this.terrain.load(view.terrain.map(item));
    this.holes.load(view.craters.map(item));
  }
  sweep(a: Point, b: Point, padding = 0): Point | null {
    const box = {
      minX: Math.min(a.x, b.x) - padding,
      minY: Math.min(a.y, b.y) - padding,
      maxX: Math.max(a.x, b.x) + padding,
      maxY: Math.max(a.y, b.y) + padding,
    };
    const terrain = this.terrain.search(box).map((item) => ({
      ...item.circle,
      radius: item.circle.radius + padding,
    }));
    if (!terrain.length) return null;
    const craters = this.holes
      .search(box)
      .filter((item) => item.circle.radius > padding)
      .map((item) => ({
        ...item.circle,
        radius: item.circle.radius - padding,
      }));
    return terrainIntersection({ terrain, craters }, a, b);
  }
}
export class TrajectorySolver {
  readonly field: BattlefieldIndex;
  private units: RBush<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    soldier: Soldier;
  }>;
  constructor(readonly view: GraphwarView) {
    this.field = new BattlefieldIndex(view);
    this.units = new RBush();
    this.units.load(
      view.soldiers
        .filter((s) => s.hp > 0)
        .map((soldier) => ({
          minX: soldier.x - balance.soldierRadius,
          minY: soldier.y - balance.soldierRadius,
          maxX: soldier.x + balance.soldierRadius,
          maxY: soldier.y + balance.soldierRadius,
          soldier,
        })),
    );
  }
  trace(actor: number, formula: string): Shot {
    const view = this.view,
      evaluate = compileFormula(formula).evaluate;
    const origin = view.soldiers.find(
      (s) => s.id === view.currentSoldier && s.player === actor && s.hp > 0,
    );
    if (!origin) throw new Error("当前士兵不可行动");
    const bounds = battlefield(view),
      direction = view.teams[actor] === 0 ? 1 : -1;
    const startX = origin.x * direction,
      base = evaluate(startX);
    const shot: Shot = {
      actor,
      soldier: origin.id,
      formula,
      points: [{ x: origin.x, y: origin.y }],
      impacts: [],
      length: 0,
      crater: null,
      reason: "limit",
    };
    if (!Number.isFinite(base)) {
      shot.reason = "undefined";
      return shot;
    }
    let localX = startX,
      penetrations = 0;
    const record = (
      target: Soldier,
      point: Point,
      length: number,
      kind: Impact["kind"],
      raw: number,
      penetration: number,
    ) => {
      const shield = guarded(view, target),
        damage = Math.min(
          target.hp,
          Math.max(0, Math.round(raw * (shield ? balance.guard : 1))),
        );
      const applied = openingProtected(view)
        ? Math.min(damage, Math.max(0, target.hp - 1))
        : damage;
      return {
        soldier: target.id,
        point,
        length,
        distance: distance(origin, point),
        penetration,
        damage: applied,
        hpAfter: target.hp - applied,
        openingProtected: applied < damage,
        guarded: shield,
        kind,
      } satisfies Impact;
    };
    for (let i = 1; i < balance.maxSteps; i++) {
      const previous = shot.points.at(-1)!;
      let step = balance.step as number,
        next = previous,
        resolved = false;
      for (let attempt = 0; attempt < 14; attempt++) {
        const x = localX + step;
        next = { x: x * direction, y: origin.y + evaluate(x) - base };
        if (!Number.isFinite(next.y)) {
          shot.reason = "undefined";
          return shot;
        }
        const chord = distance(previous, next);
        let walked = 0,
          sample = previous,
          deviation = 0;
        for (const fraction of [0.211324865405187, 0.5, 0.788675134594813, 1]) {
          const x = localX + step * fraction;
          const point =
            fraction === 1
              ? next
              : { x: x * direction, y: origin.y + evaluate(x) - base };
          if (!Number.isFinite(point.y)) {
            shot.reason = "undefined";
            return shot;
          }
          walked += distance(sample, point);
          deviation = Math.max(
            deviation,
            segmentDistance(point, previous, next),
          );
          sample = point;
        }
        if (
          walked <= balance.maxSegment &&
          walked - chord <= 0.0005 &&
          deviation <= 0.002
        ) {
          resolved = true;
          break;
        }
        step /= 2;
      }
      let segment = distance(previous, next);
      if (!resolved || shot.length + segment > bounds.width * 4) return shot;
      if (
        Math.abs(next.x) > bounds.width / 2 ||
        Math.abs(next.y) > bounds.height / 2
      ) {
        shot.reason = "boundary";
        return shot;
      }
      const collision = this.field.sweep(previous, next);
      if (collision) {
        next = collision;
        segment = distance(previous, next);
      }
      const candidates = this.units.search({
        minX: Math.min(previous.x, next.x),
        minY: Math.min(previous.y, next.y),
        maxX: Math.max(previous.x, next.x),
        maxY: Math.max(previous.y, next.y),
      });
      const contacts = candidates
        .flatMap(({ soldier: target }) => {
          if (
            target.id === origin.id ||
            shot.impacts.some((h) => h.soldier === target.id)
          )
            return [];
          const interval = circleInterval(
            { ...target, radius: balance.soldierRadius },
            previous,
            next,
          );
          return interval ? [{ target, t: interval[0] }] : [];
        })
        .sort((a, b) => a.t - b.t || a.target.id - b.target.id);
      for (const { target, t } of contacts) {
        const point = {
          x: previous.x + (next.x - previous.x) * t,
          y: previous.y + (next.y - previous.y) * t,
        };
        const length = shot.length + segment * t;
        shot.impacts.push(
          record(
            target,
            point,
            length,
            "direct",
            shotDamage(
              length,
              distance(origin, point),
              bounds.width,
              penetrations,
            ),
            penetrations,
          ),
        );
        penetrations++;
        if (penetrations === balance.maxPenetrations) {
          shot.points.push(point);
          shot.length = length;
          shot.reason = "penetration";
          return shot;
        }
      }
      localX += step;
      shot.length += segment;
      shot.points.push(next);
      if (collision) {
        shot.reason = "terrain";
        shot.crater = {
          ...next,
          radius: graphwarModes[view.options.mode].radius,
        };
        for (const target of view.soldiers)
          if (target.hp > 0) {
            const fraction = Math.max(
              0,
              1 -
                distance(target, next) /
                  (shot.crater.radius + balance.soldierRadius),
            );
            if (fraction <= 0) continue;
            const impact = record(
              target,
              next,
              shot.length,
              "blast",
              balance.blastDamage *
                fraction *
                balance.penetration ** penetrations,
              penetrations,
            );
            const existing = shot.impacts.findIndex(
              (h) => h.soldier === target.id,
            );
            if (existing < 0) shot.impacts.push(impact);
            else if (shot.impacts[existing].damage < impact.damage)
              shot.impacts[existing] = impact;
          }
        return shot;
      }
    }
    return shot;
  }
}
export function traceShot(
  view: GraphwarView,
  actor: number,
  formula: string,
): Shot {
  return new TrajectorySolver(view).trace(actor, formula);
}
