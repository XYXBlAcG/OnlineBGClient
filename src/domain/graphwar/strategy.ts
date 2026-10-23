import { Strategy, type SearchRequest, type RootSamples } from "../strategy";
import type {
  AiResult,
  Candidate,
  DecisionCandidate,
  GameState,
} from "../types";
import { firingView, type GraphwarView, type Point } from "./types";
import { TrajectorySolver, distance, containsTerrain } from "./trajectory";
import { GraphwarRules } from "./rules";
import { difficultyProfile, balance } from "./balance";
interface AimedCandidate extends Candidate {
  aim?: Point;
  target?: number;
}
function viewOf(state: GameState): GraphwarView {
  if (state.kind !== "graphwar") throw new Error("策略游戏不匹配");
  return state.view;
}
export class GraphwarStrategy extends Strategy {
  static readonly version = "graphwar-tactics-3";
  readonly version = GraphwarStrategy.version;
  budget(_request: SearchRequest) {
    return { samples: 0, depth: 0, shortlist: 0 };
  }
  candidates(request: SearchRequest): AimedCandidate[] {
    const base = viewOf(request.observation);
    if (base.finished || base.turn !== request.actor) return [];
    const groups: AimedCandidate[][] = [];
    for (const unit of base.soldiers.filter(
      (s) => s.player === request.actor && s.hp > 0,
    )) {
      const view = firingView(base, request.actor, unit.id);
      const profile = difficultyProfile[request.difficulty],
        team = view.teams[request.actor],
        direction = team === 0 ? 1 : -1;
      const origin = view.soldiers.find((s) => s.id === view.currentSoldier)!;
      const targets = view.soldiers
        .filter((s) => s.hp > 0 && view.teams[s.player] !== team)
        .sort(
          (a, b) => distance(origin, a) - distance(origin, b) || a.id - b.id,
        )
        .slice(0, profile.targets);
      const moves: AimedCandidate[] = [];
      const number = (n: number) =>
        n.toPrecision(
          request.difficulty === "easy"
            ? 3
            : request.difficulty === "normal"
              ? 5
              : 7,
        );
      for (const target of targets) {
        const random = this.engine.seed(`${request.seed}:aim:${target.id}`);
        const aim = {
          x:
            Math.round(target.x / profile.aimError) * profile.aimError +
            (random() - 0.5) * profile.aimError,
          y:
            Math.round(target.y / profile.aimError) * profile.aimError +
            (random() - 0.5) * profile.aimError,
        };
        const x0 = origin.x * direction,
          x1 = aim.x * direction,
          dx = x1 - x0;
        if (dx <= 0) continue;
        const slope = (aim.y - origin.y) / dx;
        for (const curve of profile.slopes) {
          const formula =
            curve === 0
              ? `${number(slope)}*x`
              : `${number(slope)}*(x-(${number(x0)}))+(${curve})*(x-(${number(x0)}))*(x-(${number(x1)}))`;
          moves.push({
            action: { type: "graphwar-fire", formula },
            label: curve === 0 ? "有限精度瞄准" : "有限精度绕障",
            aim,
            target: target.id,
          });
        }
        if (request.difficulty === "hard")
          for (const amplitude of [-10, -5, 5, 10])
            moves.push({
              action: {
                type: "graphwar-fire",
                formula: `${number(slope)}*(x-(${number(x0)}))+(${amplitude})*sin(3.141593*(x-(${number(x0)}))/(${number(dx)}))`,
              },
              label: "正弦绕障",
              aim,
              target: target.id,
            });
      }
      const actions = new GraphwarRules(() => 0)
        .candidates({ kind: "graphwar", view }, request.actor)
        .slice(0, request.difficulty === "easy" ? 6 : 10);
      const shotMoves = moves.slice(0, profile.candidates - actions.length);
      const tactical = actions.filter((a) => a.action.type === "graphwar-move");
      const combined = [
        ...shotMoves.slice(0, 1),
        ...tactical.slice(0, 1),
        ...actions.slice(0, 1),
        ...shotMoves.slice(1),
        ...tactical.slice(1),
        ...actions.filter((a) => a.action.type === "graphwar-pass"),
      ];
      groups.push(
        combined.map((m) => ({
          ...m,
          action:
            m.action.type === "graphwar-fire" ||
            m.action.type === "graphwar-move" ||
            m.action.type === "graphwar-guard"
              ? { ...m.action, soldier: unit.id }
              : m.action,
        })),
      );
    }
    const candidates: AimedCandidate[] = [];
    for (
      let index = 0;
      candidates.length < difficultyProfile[request.difficulty].candidates &&
      groups.some((g) => index < g.length);
      index++
    )
      for (const group of groups)
        if (
          group[index] &&
          candidates.length < difficultyProfile[request.difficulty].candidates
        )
          candidates.push(group[index]);
    return candidates;
  }
  score(request: SearchRequest, moves: Candidate[]): DecisionCandidate[] {
    const base = viewOf(request.observation),
      team = base.teams[request.actor],
      solvers = new Map<number, TrajectorySolver>();
    return moves.map((move) => {
      const id = "soldier" in move.action ? move.action.soldier : undefined,
        view = id === undefined ? base : firingView(base, request.actor, id);
      let solver = solvers.get(view.currentSoldier);
      if (!solver) {
        solver = new TrajectorySolver(view);
        solvers.set(view.currentSoldier, solver);
      }
      const origin = view.soldiers.find((s) => s.id === view.currentSoldier)!,
        enemies = view.soldiers.filter(
          (s) => s.hp > 0 && view.teams[s.player] !== team,
        );
      let score = 0;
      const features: DecisionCandidate["features"] = [];
      const add = (name: string, value: number, weight: number) => {
        score += value * weight;
        if (request.audit)
          features.push({ name, value, weight, contribution: value * weight });
      };
      if (move.action.type === "graphwar-fire") {
        const shot = solver.trace(request.actor, move.action.formula);
        for (const hit of shot.impacts) {
          const target = view.soldiers.find((s) => s.id === hit.soldier)!;
          const friendly = view.teams[target.player] === team;
          add(
            friendly ? "己方扣血" : "敌方扣血",
            hit.damage,
            friendly ? -2 : 1,
          );
          if (hit.hpAfter === 0)
            add(friendly ? "己方出局" : "敌方出局", 1, friendly ? -100 : 65);
        }
        if (shot.crater) {
          const crater = shot.crater;
          let opened = 0;
          for (let i = 0; i < 16; i++) {
            const a = (i * Math.PI) / 8,
              p = {
                x: crater.x + Math.cos(a) * crater.radius * 0.65,
                y: crater.y + Math.sin(a) * crater.radius * 0.65,
              };
            if (
              containsTerrain(view, p) &&
              !containsTerrain(
                { ...view, craters: [...view.craters, crater] },
                p,
              )
            )
              opened++;
          }
          add("实际开路面积采样", opened, 0.12);
          add(
            "开路位置接近敌军",
            -Math.min(...enemies.map((s) => distance(s, shot.crater!))),
            0.015,
          );
        }
        if (shot.reason === "undefined") add("无定义弹道", 1, -5);
        if (request.audit) {
          const aimed = move as AimedCandidate;
          if (aimed.aim) {
            add("瞄准点 x", aimed.aim.x, 0);
            add("瞄准点 y", aimed.aim.y, 0);
          }
          add(
            "难度瞄准尺度",
            difficultyProfile[request.difficulty].aimError,
            0,
          );
        }
      } else if (move.action.type === "graphwar-guard")
        add("防御收益", origin.hp < balance.hp * 0.5 ? 0.5 : -0.5, 1);
      else if (move.action.type === "graphwar-move") {
        const before = Math.min(...enemies.map((s) => distance(s, origin))),
          after = Math.min(
            ...enemies.map((s) => distance(s, move.action as Point)),
          );
        add("接近交战区域", before - after, 0.3);
        const at = move.action;
        const cover = view.terrain.reduce(
          (n, c) => n + Math.max(0, 3 - Math.abs(distance(c, at) - c.radius)),
          0,
        );
        add("可用掩体", Math.min(cover, 4), 0.35);
        add("移动代价", 1, -0.4);
      } else add("跳过代价", 1, -2);
      if (
        difficultyProfile[request.difficulty].response &&
        move.action.type !== "graphwar-pass"
      ) {
        const after = new GraphwarRules(() => 0).apply(
          request.observation as Extract<GameState, { kind: "graphwar" }>,
          request.actor,
          move.action,
        );
        const next = after.view;
        if (!next.finished) {
          const enemy = next.soldiers.find(
            (s) => s.id === next.currentSoldier,
          )!;
          if (next.teams[enemy.player] !== team) {
            const direction = next.teams[enemy.player] === 0 ? 1 : -1,
              solverAfter = new TrajectorySolver(next);
            let risk = 0;
            for (const friend of next.soldiers
              .filter((s) => s.hp > 0 && next.teams[s.player] === team)
              .slice(0, 8)) {
              const slope =
                (friend.y - enemy.y) / ((friend.x - enemy.x) * direction);
              const response = solverAfter.trace(
                enemy.player,
                `${slope.toFixed(3)}*x`,
              );
              const harm = response.impacts.reduce(
                (n, h) =>
                  n +
                  (next.teams[
                    next.soldiers.find((s) => s.id === h.soldier)!.player
                  ] === team
                    ? h.damage
                    : 0),
                0,
              );
              risk = Math.max(risk, harm);
            }
            add("下一回合直线反击风险", risk, -0.2);
          }
        }
      }
      return { ...move, score, features };
    });
  }
  complete(
    request: SearchRequest,
    candidates: DecisionCandidate[],
    samples: RootSamples[],
  ): AiResult {
    const result = super.complete(request, candidates, samples);
    if (result.audit)
      result.audit.assumptions = [
        `本难度使用${difficultyProfile[request.difficulty].name}，瞄准尺度 ${difficultyProfile[request.difficulty].aimError}，最多 ${difficultyProfile[request.difficulty].candidates} 个候选；误差在公式生成阶段按种子确定。`,
        "实际命中和伤害使用与真人相同的弹道、弧长、穿透与防御规则。",
        "评分比较实际扣血、友伤、开路、位置与防御；困难额外检查下一回合的有限直线反击，有限搜索不保证最优。",
      ];
    return result;
  }
}
