import { z } from "zod";
import { UpstreamRuntime } from "../upstream/runtime";
import type { GameOptions } from "./game-options";
import type {
  Action,
  Candidate,
  FlightLastEffect,
  FlightSpecialView,
  FlightView,
  FlightWeather,
} from "./types";

export const flightOptionsSchema = z.object({
  mode: z.enum(["classic", "storm"]).default("classic"),
});
export type FlightOptions = z.infer<typeof flightOptionsSchema>;

const weathers = ["tailwind", "headwind", "crosswind", "storm"] as const;
const checkpoints = [13, 31, 49] as const;

export interface FlightWeatherEffect {
  weather: FlightWeather;
  move: number;
  energy: number;
  label: string;
  detail: string;
}
export const flightWeatherEffects: Record<FlightWeather, FlightWeatherEffect> =
  {
    tailwind: {
      weather: "tailwind",
      move: 1,
      energy: 0,
      label: "顺风",
      detail: "移动 +1 格",
    },
    headwind: {
      weather: "headwind",
      move: -1,
      energy: 0,
      label: "逆风",
      detail: "移动 -1 格",
    },
    crosswind: {
      weather: "crosswind",
      move: -1,
      energy: 1,
      label: "侧风",
      detail: "移动 -1 格，落地获得 1 能量",
    },
    storm: {
      weather: "storm",
      move: -2,
      energy: 0,
      label: "风暴",
      detail: "移动 -2 格",
    },
  };
export function flightWeatherEffect(weather: FlightWeather) {
  return flightWeatherEffects[weather];
}
export interface FlightMovePreview {
  plane: number;
  from: number;
  baseTo: number;
  to: number;
  base: number;
  weather?: FlightWeather;
  weatherMove: number;
  boost: number;
  shielded: boolean;
  energyGain: number;
  checkpoint: boolean;
  jumped: boolean;
  bounced: boolean;
  returned: boolean;
  finish: boolean;
  point: [number, number];
}

export class FlightRules {
  readonly original;
  readonly codec;
  constructor(private readonly runtime: UpstreamRuntime) {
    this.original = runtime.load(4062);
    this.codec = runtime.load(6630).b;
  }
  create(players: number, _team = false, options?: GameOptions): FlightView {
    const view = this.original.Bx(
      { playerList: Array(players).fill({}) },
      this.codec.encode({ rule: 0 }).finish(),
    ) as FlightView;
    if (options?.flight?.mode !== "storm") return view;
    return {
      ...view,
      special: {
        mode: "storm",
        weather: weathers[Math.floor(this.runtime.random() * weathers.length)],
        round: 1,
        energy: Array(players).fill(0),
        maxEnergy: 3,
        shield: Array(players).fill(0),
        boost: Array(players).fill(0),
        checkpoints: [...checkpoints],
        checkpointHits: Array(players).fill(0),
      },
    };
  }
  finished(view: FlightView): boolean {
    return this.original.f0(view);
  }
  actors(view: FlightView): number[] {
    return this.finished(view) ? [] : [view.state & 3];
  }
  candidates(view: FlightView, actor: number): Candidate[] {
    if (this.finished(view) || (view.state & 3) !== actor) return [];
    const result: Candidate[] = [];
    if (view.special && !(view.state & 4) && view.special.energy[actor] > 0) {
      result.push(
        {
          action: { type: "fxq-special", ability: "boost" },
          label: "风暴加速：本次移动额外前进 2 格",
        },
        {
          action: { type: "fxq-special", ability: "shield" },
          label: "风暴护盾：抵消一次逆风、侧风或风暴",
        },
      );
    }
    if (!(view.state & 4)) {
      result.push({ action: { type: "fxq-roll" }, label: "掷骰子" });
      return result;
    }
    const seen = new Set<number>();
    for (const [plane, position] of view.planePositionList.entries()) {
      if (
        Math.floor(plane / 4) !== actor ||
        (position > 0 && seen.has(position)) ||
        !(position ? position < 57 : !(view.lastDice % 2) && view.sixTimes < 3)
      )
        continue;
      if (position > 0) seen.add(position);
      result.push({
        action: { type: "fxq-move", plane },
        label: `${view.sixTimes >= 3 ? "返航" : position ? "移动" : "起飞"} ${(plane % 4) + 1} 号飞机`,
      });
    }
    return result;
  }
  apply(view: FlightView, actor: number, action: Action): FlightView {
    if (
      !this.candidates(view, actor).some(
        (candidate) =>
          JSON.stringify(candidate.action) === JSON.stringify(action),
      )
    )
      throw new Error("不是合法的飞行棋动作");
    if (action.type === "fxq-special") {
      const next = structuredClone(view);
      if (!next.special) throw new Error("当前不是风暴航线");
      next.special.energy[actor]--;
      if (action.ability === "boost") next.special.boost[actor]++;
      else next.special.shield[actor]++;
      next.special.lastAbility = {
        actor,
        ability: action.ability,
        round: next.special.round,
      };
      return next;
    }
    if (action.type === "fxq-roll") return this.original.HU(view, actor);
    if (action.type !== "fxq-move") throw new Error("游戏类型不匹配");
    const beforeActor = view.state & 3;
    const { next, effect } = this.resolveMove(view, actor, action.plane);
    if (next.special && effect) next.special.lastEffect = effect;
    if (next.special && (next.state & 3) !== beforeActor) {
      next.special.lastAbility = undefined;
      next.special.round++;
      next.special.weather =
        weathers[Math.floor(this.runtime.random() * weathers.length)];
    }
    return next;
  }
  private resolveMove(view: FlightView, actor: number, plane: number) {
    const next = structuredClone(
      this.original.VX(view, actor, plane),
    ) as FlightView;
    const special = next.special;
    if (!special) return { next, effect: undefined };
    special.lastAbility = undefined;
    const weather = flightWeatherEffect(special.weather);
    const from = view.planePositionList[plane];
    const baseTo = next.planePositionList[plane];
    const movable = baseTo > 0 && baseTo < 57;
    let weatherMove = movable ? weather.move : 0;
    let shielded = false;
    if (weatherMove < 0 && special.shield[actor] > 0) {
      special.shield[actor]--;
      weatherMove = 0;
      shielded = true;
    }
    let boost = 0;
    if (movable && special.boost[actor] > 0) {
      special.boost[actor]--;
      boost = 2;
    }
    if (weatherMove || boost) {
      const adjusted = Math.max(1, Math.min(58, baseTo + weatherMove + boost));
      next.planePositionList[plane] = adjusted === 57 ? 58 : adjusted;
    }
    if (next.planePositionList[plane] === 57)
      next.planePositionList[plane] = 58;
    const to = next.planePositionList[plane];
    if (
      next.planePositionList
        .slice(actor * 4, actor * 4 + 4)
        .every((position) => position >= 57) &&
      !next.winners.includes(actor)
    )
      next.winners.push(actor);
    const checkpoint =
      to !== baseTo &&
      special.checkpoints.includes(to) &&
      !special.checkpoints.includes(baseTo);
    const energyGain =
      (weather.energy > 0 && !shielded && movable ? weather.energy : 0) +
      (checkpoint ? 1 : 0);
    if (energyGain)
      special.energy[actor] = Math.min(
        special.maxEnergy,
        special.energy[actor] + energyGain,
      );
    const effect: FlightLastEffect = {
      actor,
      plane,
      weather: special.weather,
      base: view.lastDice,
      weatherMove,
      boost,
      shielded,
      energyGain,
      checkpoint,
      from,
      baseTo,
      to,
    };
    return { next, effect };
  }
  previewMove(
    view: FlightView,
    actor: number,
    plane: number,
  ): FlightMovePreview | null {
    if (
      !this.candidates(view, actor).some(
        (candidate) =>
          candidate.action.type === "fxq-move" &&
          candidate.action.plane === plane,
      )
    )
      return null;
    const from = view.planePositionList[plane];
    if (!view.special) {
      const next = structuredClone(
        this.original.VX(view, actor, plane),
      ) as FlightView;
      if (next.planePositionList[plane] === 57)
        next.planePositionList[plane] = 58;
      const to = next.planePositionList[plane];
      return {
        plane,
        from,
        baseTo: to,
        to,
        base: view.lastDice,
        weatherMove: 0,
        boost: 0,
        shielded: false,
        energyGain: 0,
        checkpoint: false,
        jumped: from > 0 && to - from > view.lastDice,
        bounced:
          from > 0 &&
          to > 0 &&
          to - from !== view.lastDice &&
          to - from <= view.lastDice,
        returned: from > 0 && to === 0,
        finish: to >= 57,
        point: this.point(plane, to, view.planePositionList.length / 4),
      };
    }
    const { effect } = this.resolveMove(view, actor, plane);
    if (!effect) return null;
    return {
      plane,
      from: effect.from,
      baseTo: effect.baseTo,
      to: effect.to,
      base: effect.base,
      weather: effect.weather,
      weatherMove: effect.weatherMove,
      boost: effect.boost,
      shielded: effect.shielded,
      energyGain: effect.energyGain,
      checkpoint: effect.checkpoint,
      jumped:
        effect.from > 0 &&
        effect.to - effect.from >
          effect.base + effect.weatherMove + effect.boost,
      bounced:
        effect.from > 0 &&
        effect.to > 0 &&
        effect.to - effect.from !==
          effect.base + effect.weatherMove + effect.boost &&
        effect.to - effect.from <=
          effect.base + effect.weatherMove + effect.boost,
      returned: effect.from > 0 && effect.to === 0,
      finish: effect.to >= 57,
      point: this.point(plane, effect.to, view.planePositionList.length / 4),
    };
  }
  point(
    plane: number,
    position: number,
    playerCount: number,
  ): [number, number] {
    const color = this.original.iM(4 * Math.floor(plane / 4), playerCount);
    return this.original.Vh(plane % 4, position, color);
  }
  previews(view: FlightView, actor: number, candidates: Candidate[]) {
    return candidates
      .filter((candidate) => candidate.action.type === "fxq-move")
      .map((candidate) =>
        candidate.action.type === "fxq-move"
          ? this.previewMove(view, actor, candidate.action.plane)
          : null,
      )
      .filter((preview): preview is FlightMovePreview => preview !== null);
  }
  progress(view: FlightView, actor: number): number {
    return view.planePositionList
      .slice(actor * 4, actor * 4 + 4)
      .reduce((sum, position) => sum + Math.min(57, position), 0);
  }
  risk(view: FlightView, actor: number): number {
    if (this.finished(view)) return 0;
    let loss = 0;
    for (let enemy = 0; enemy < view.planePositionList.length / 4; enemy++) {
      if (enemy === actor || view.winners.includes(enemy)) continue;
      for (let dice = 1; dice <= 6; dice++) {
        const hypothetical = {
          ...view,
          state: enemy | 4,
          lastDice: dice,
          sixTimes: dice === 6 ? 1 : 0,
        };
        const losses = this.candidates(hypothetical, enemy).map((candidate) => {
          const result = this.apply(hypothetical, enemy, candidate.action);
          return view.planePositionList
            .slice(actor * 4, actor * 4 + 4)
            .reduce(
              (sum, position, index) =>
                sum +
                (position > 0 &&
                result.planePositionList[actor * 4 + index] === 0
                  ? position
                  : 0),
              0,
            );
        });
        loss += Math.max(0, ...losses) / 6;
      }
    }
    return loss;
  }
}

let previewRules: FlightRules | null = null;
function flightPreviewRules() {
  previewRules ??= new FlightRules(new UpstreamRuntime());
  return previewRules;
}
export function flightMovePreview(
  view: FlightView,
  actor: number,
  plane: number,
) {
  return flightPreviewRules().previewMove(view, actor, plane);
}
export function flightMovePreviews(
  view: FlightView,
  actor: number,
  candidates: Candidate[],
) {
  return flightPreviewRules().previews(view, actor, candidates);
}
export function flightBoardPoint(
  plane: number,
  position: number,
  playerCount: number,
) {
  return flightPreviewRules().point(plane, position, playerCount);
}
