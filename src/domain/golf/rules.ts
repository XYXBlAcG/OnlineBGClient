import type { Action } from "../actions";
import type { GameOptions } from "../game-options";
import type { Rules } from "../plugin";
import { golfFrameMs, putt } from "./physics";
import { classicGolfCourses, generateGolfCourses } from "./courses";
import type { GolfPlayer, GolfState } from "./types";

export class GolfRules implements Rules<"golf"> {
  create(players: number, _team: boolean, options?: GameOptions): GolfState {
    const arcade =
      options?.arcadeScenario?.kind === "golf"
        ? options.arcadeScenario
        : undefined;
    const courses = options?.golfCourses
      ? structuredClone([...options.golfCourses])
      : arcade ? [structuredClone(classicGolfCourses[0]!)]
        : generateGolfCourses(options?.roundSeed ?? "golf", options?.golf?.difficulty);
    return {
      kind: "golf",
      view: {
        hole: 0,
        holes: courses.length,
        courses,
        players: Array.from({ length: players }, (): GolfPlayer => ({
          position: courses[0]!.tee,
          strokes: 0,
          scores: [],
          sunk: false,
          lastShot: null,
        })),
        phase: "putting",
        strokeCap: arcade?.noActionCap ? null : 10,
      },
    };
  }

  finished({ view }: GolfState) {
    return view.phase === "finished";
  }

  actors({ view }: GolfState) {
    if (view.phase === "finished") return [];
    return view.players.flatMap((player, actor) =>
      view.phase === "scorecard" ||
      (!player.sunk && player.strokes < (view.strokeCap ?? Infinity))
        ? [actor]
        : [],
    );
  }

  candidates(state: GolfState, actor: number) {
    if (state.view.phase !== "scorecard" || !this.actors(state).includes(actor))
      return [];
    return [
      {
        action: { type: "golf-next" as const, hole: state.view.hole },
        label: "下一洞",
      },
    ];
  }

  project(state: GolfState) {
    return state;
  }

  apply(state: GolfState, actor: number, action: Action): GolfState {
    const { view } = state;
    if (
      action.type !== "golf-next" &&
      action.type !== "golf-putt" &&
      action.type !== "golf-reset"
    )
      throw new Error("不支持的球洞操作");
    if (action.hole !== view.hole || !this.actors(state).includes(actor))
      throw new Error("球洞已更新，或当前不能击球");
    if (action.type === "golf-reset") {
      if (view.phase !== "putting") throw new Error("现在不能重置球位");
      return {
        kind: "golf",
        view: {
          ...view,
          players: view.players.map((player, index) =>
            index === actor
              ? {
                  ...player,
                  position: view.courses[view.hole]!.tee,
                  sunk: false,
                  lastShot: null,
                }
              : player,
          ),
        },
      };
    }
    if (action.type === "golf-next" && view.phase === "scorecard") {
      const hole = view.hole + 1;
      return {
        kind: "golf",
        view: {
          ...view,
          hole,
          phase: "putting",
          players: view.players.map((player) => ({
            ...player,
            position: view.courses[hole]!.tee,
            strokes: 0,
            sunk: false,
            lastShot: null,
          })),
        },
      };
    }
    if (action.type !== "golf-putt" || view.phase !== "putting")
      throw new Error("请在下一个球洞击球");
    const golfers = [...view.players];
    const player = golfers[actor];
    if (action.previousStrokes !== player.strokes)
      throw new Error("球已移动，请重新瞄准");
    const shot = putt(
      view.courses[view.hole]!,
      player.position,
      action.aim,
      action.power,
    );
    const strokes = Math.min(
      view.strokeCap ?? Infinity,
      player.strokes + 1 + Number(shot.water),
    );
    golfers[actor] = {
      ...player,
      position: shot.position,
      strokes,
      sunk: shot.sunk,
      lastShot: shot,
    };
    const completed = golfers.every(
      ({ sunk, strokes }) => sunk || strokes >= (view.strokeCap ?? Infinity),
    );
    return {
      kind: "golf",
      view: {
        ...view,
        phase: completed
          ? view.hole + 1 === view.holes
            ? "finished"
            : "scorecard"
          : "putting",
        players: completed
          ? golfers.map((item) => ({
              ...item,
              scores: [...item.scores, item.strokes],
            }))
          : golfers,
      },
    };
  }

  acceptsLateActions({ view }: GolfState) {
    return view.phase === "putting";
  }

  actionDelay({ view }: GolfState) {
    return view.phase === "scorecard"
      ? Math.max(
          ...view.players.map((player) => player.lastShot?.frames.length ?? 0),
        ) * golfFrameMs
      : 0;
  }

  actionWindow({ view }: GolfState, action: Action) {
    return view.phase === "putting" &&
      (action.type === "golf-putt" || action.type === "golf-reset")
      ? `golf:${view.hole}`
      : undefined;
  }
}

export function golfTotal(player: GolfPlayer) {
  return player.scores.reduce((total, strokes) => total + strokes, 0);
}
