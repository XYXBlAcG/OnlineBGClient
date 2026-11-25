import seedrandom from "seedrandom";
import { Strategy, type SearchRequest } from "../strategy";
import type { Candidate, DecisionCandidate } from "../types";
import { putt } from "./physics";
import { golfRoute } from "./routing";

const playStyle = {
  easy: { maxPower: 0.65, error: 0.18, targetCount: 3 },
  normal: { maxPower: 0.73, error: 0.11, targetCount: 4 },
  hard: { maxPower: 0.81, error: 0.06, targetCount: 5 },
};

export class GolfStrategy extends Strategy {
  static readonly version = "4";
  readonly version = GolfStrategy.version;

  budget() {
    return { samples: 0, depth: 0, shortlist: 0 };
  }

  candidates(request: SearchRequest): Candidate[] {
    if (request.observation.kind !== "golf") return [];
    const { view } = request.observation;
    if (view.phase !== "putting") return super.candidates(request);
    const player = view.players[request.actor]!;
    const course = view.courses[view.hole]!;
    const { error, maxPower, targetCount } = playStyle[request.difficulty];
    const accuracy = (seedrandom(request.seed)() - 0.5) * error;
    const terrainOffsets = course.terrain ? [-0.22, 0.22] : [];
    const route = golfRoute(course);
    const targets = route.targets(player.position).slice(0, targetCount);
    const candidates = new Map<string, Candidate>();
    const add = (angle: number, power: number) => {
      const aim = Math.atan2(Math.sin(angle), Math.cos(angle));
      const boundedPower = Math.max(0.035, Math.min(maxPower, power));
      const key = `${aim.toFixed(3)}:${boundedPower.toFixed(3)}`;
      candidates.set(key, {
        action: { type: "golf-putt", hole: view.hole, previousStrokes: player.strokes, aim, power: boundedPower },
        label: "推杆",
      });
    };
    for (const { point } of targets) {
      const dx = point.x - player.position.x;
      const dy = point.y - player.position.y;
      const range = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const power = Math.sqrt(10.2 * range) / 14.8;
      const precision = range < 2.4 || player.strokes >= 2;
      for (const offset of precision ? [0, accuracy, -0.14, 0.14, ...terrainOffsets] : [accuracy, accuracy - 0.12, accuracy + 0.12, ...terrainOffsets])
        for (const factor of [0.72, 0.94, 1.03, 1.17])
          add(angle + offset, power * factor);
    }
    if (!targets.length || player.strokes > 0) {
      const aim = Math.atan2(course.cup.y - player.position.y, course.cup.x - player.position.x);
      for (let i = 0; i < 12; i++)
        for (const power of [0.19, 0.36]) add(aim + i * Math.PI / 6, power);
    }
    return [...candidates.values()];
  }

  score(request: SearchRequest, moves: Candidate[]): DecisionCandidate[] {
    if (request.observation.kind !== "golf") return [];
    const { view } = request.observation;
    const course = view.courses[view.hole]!;
    const player = view.players[request.actor]!;
    const route = golfRoute(course);
    const remaining = route.remaining(player.position);
    return moves.map((candidate) => {
      if (candidate.action.type !== "golf-putt")
        return { ...candidate, score: 0, features: [] };
      const shot = putt(course, player.position, candidate.action.aim, candidate.action.power);
      const progress = remaining - route.remaining(shot.position);
      const scores = [
        ["进洞", Number(shot.sunk), 1000],
        ["安全路线进展", progress, 4],
        ["落水", Number(shot.water), -90],
        ["停在原地", Number(Math.hypot(shot.position.x - player.position.x, shot.position.y - player.position.y) < 0.14), -2],
      ] as const;
      const features = scores.map(([name, value, weight]) => ({ name, value, weight, contribution: value * weight }));
      return { ...candidate, score: features.reduce((sum, item) => sum + item.contribution, 0), features };
    });
  }
}
