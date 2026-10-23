import { Movement } from "./movement";
import type { GameOptions } from "../game-options";
import type { Action, Candidate } from "../types";
import { compileFormula } from "./expression";
import { balance } from "./balance";
import { traceShot } from "./trajectory";
import { generateBattlefield } from "./map";
import {
  firingView,
  graphwarInitialSchema,
  graphwarOptionsSchema,
  battlefield,
  actionLimit,
  type GraphwarState,
  type Shot,
  type GraphwarView,
  type Point,
} from "./types";
export function canMove(view: GraphwarView, point: Point): boolean {
  return new Movement(view, view.currentSoldier).check(point).allowed;
}
export class GraphwarRules {
  constructor(private random: () => number) {}
  create(
    players: number,
    _team: boolean,
    options?: GameOptions,
  ): GraphwarState {
    const config = graphwarOptionsSchema.parse(options?.graphwar ?? {}),
      map = options?.graphwarInitial
        ? graphwarInitialSchema.parse(options.graphwarInitial)
        : generateBattlefield(players, config, this.random);
    if (
      map.teams.length !== players ||
      map.soldiers.length !== players * config.soldiers ||
      new Set(map.soldiers.map((s) => s.id)).size !== map.soldiers.length ||
      Array.from(
        { length: players },
        (_, p) => map.soldiers.filter((s) => s.player === p).length,
      ).some((n) => n !== config.soldiers)
    )
      throw new Error("初始战场记录不完整");
    return {
      kind: "graphwar",
      view: {
        solver: 2,
        options: config,
        ...map,
        craters: [],
        sequence: 0,
        turn: 0,
        currentSoldier: map.soldiers.find((s) => s.player === 0)!.id,
        cursors: Array(players).fill(0),
        playerTurns: Array(players).fill(0),
        lastShot: null,
        lastPass: null,
        lastAction: null,
        winner: null,
        finished: false,
      },
    };
  }
  finished(state: GraphwarState): boolean {
    return state.view.finished;
  }
  actors(state: GraphwarState): number[] {
    return state.view.finished ? [] : [state.view.turn];
  }
  candidates(state: GraphwarState, actor: number): Candidate[] {
    if (!this.actors(state).includes(actor)) return [];
    const unit = state.view.soldiers.find(
      (s) => s.id === state.view.currentSoldier,
    )!;
    const moves: Candidate[] = [
      { action: { type: "graphwar-guard" }, label: "防御下一次攻击" },
      { action: { type: "graphwar-pass" }, label: "跳过本回合" },
    ];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4,
        point = {
          x: unit.x + Math.cos(angle) * balance.moveDistance,
          y: unit.y + Math.sin(angle) * balance.moveDistance,
        };
      if (canMove(state.view, point))
        moves.push({
          action: { type: "graphwar-move", ...point },
          label: `移动至 (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`,
        });
    }
    return moves;
  }
  apply(
    state: GraphwarState,
    actor: number,
    action: Action,
    recorded?: Shot,
  ): GraphwarState {
    if (!this.actors(state).includes(actor)) throw new Error("还未轮到你行动");
    if (
      ![
        "graphwar-fire",
        "graphwar-pass",
        "graphwar-guard",
        "graphwar-move",
      ].includes(action.type)
    )
      throw new Error("Graphwar 动作不匹配");
    const source =
      action.type === "graphwar-fire" ||
      action.type === "graphwar-move" ||
      action.type === "graphwar-guard"
        ? firingView(state.view, actor, action.soldier)
        : state.view;
    if (action.type === "graphwar-fire") compileFormula(action.formula);
    if (
      action.type === "graphwar-move" &&
      !new Movement(source, source.currentSoldier).check(action).allowed
    )
      throw new Error(
        new Movement(source, source.currentSoldier).check(action).reason,
      );
    const next = structuredClone({ ...state, view: source }),
      v = next.view,
      unit = v.soldiers.find((s) => s.id === v.currentSoldier)!;
    v.lastPass = action.type === "graphwar-pass" ? actor : null;
    v.lastAction =
      action.type === "graphwar-fire"
        ? "fire"
        : action.type === "graphwar-move"
          ? "move"
          : action.type === "graphwar-guard"
            ? "guard"
            : "pass";
    if (action.type === "graphwar-fire") {
      if (
        recorded &&
        (recorded.actor !== actor ||
          recorded.soldier !== unit.id ||
          recorded.formula !== action.formula ||
          recorded.points[0].x !== unit.x ||
          recorded.points[0].y !== unit.y ||
          recorded.impacts.some((h) => {
            const target = v.soldiers.find((s) => s.id === h.soldier);
            return (
              !target || target.hp <= 0 || target.hp - h.damage !== h.hpAfter
            );
          }))
      )
        throw new Error("回放弹道与当前局面不一致");
      v.lastShot = recorded
        ? structuredClone(recorded)
        : traceShot(v, actor, action.formula);
      for (const hit of v.lastShot.impacts) {
        const target = v.soldiers.find((s) => s.id === hit.soldier)!;
        target.hp = hit.hpAfter;
        if (hit.damage > 0) target.guardUntil = 0;
      }
      if (v.lastShot.crater) v.craters.push(v.lastShot.crater);
    } else if (action.type === "graphwar-move") {
      unit.x = action.x;
      unit.y = action.y;
    } else if (action.type === "graphwar-guard")
      unit.guardUntil = v.playerTurns[actor] + 1;
    v.playerTurns[actor]++;
    v.sequence++;
    const survivors = [0, 1].map((team) =>
      v.soldiers.filter((s) => s.hp > 0 && v.teams[s.player] === team),
    );
    if (survivors.some((s) => !s.length) || v.sequence >= actionLimit(v)) {
      const value = survivors.map(
        (units) =>
          units.length * (balance.hp * v.soldiers.length + 1) +
          units.reduce((n, s) => n + s.hp, 0),
      );
      v.finished = true;
      v.winner = value[0] === value[1] ? null : value[0] > value[1] ? 0 : 1;
      return next;
    }
    const own = v.soldiers.filter((s) => s.player === actor);
    v.cursors[actor] =
      (own.findIndex((s) => s.id === v.currentSoldier) + 1) % own.length;
    for (let i = 1; i <= v.teams.length; i++) {
      const player = (actor + i) % v.teams.length,
        army = v.soldiers.filter((s) => s.player === player);
      for (let slot = 0; slot < army.length; slot++) {
        const index = (v.cursors[player] + slot) % army.length;
        if (army[index].hp > 0) {
          v.turn = player;
          v.currentSoldier = army[index].id;
          v.cursors[player] = index;
          return next;
        }
      }
    }
    return next;
  }
  project(state: GraphwarState): GraphwarState {
    return structuredClone(state);
  }
  needsResolution(state: GraphwarState): boolean {
    return !state.view.finished && state.view.options.turnSeconds > 0;
  }
  resolutionDelay(state: GraphwarState): number {
    return state.view.options.turnSeconds * 1000;
  }
  resolve(state: GraphwarState): GraphwarState {
    return this.apply(state, state.view.turn, { type: "graphwar-pass" });
  }
}
