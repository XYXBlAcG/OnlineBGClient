import type { AnimationParams } from "animejs";
import type { PartySceneId } from "../../domain/party/stage";
export interface CinemaTrack {
  role: string;
  at: number;
  stagger: number;
  drawable?: boolean;
  parameters: AnimationParams;
}
export function cinemaScore(
  scene: PartySceneId,
  duration: number,
): CinemaTrack[] {
  const enter = Math.min(900, duration * 0.25),
    impact = enter * 0.7;
  const motions: Record<string, AnimationParams> = {
    scene: { scale: [0.94, 1], duration: enter, ease: "outCubic" },
    hand: { rotate: [0, 360], duration: 6000, loop: true, ease: "linear" },
    spin: { rotate: [0, 360], duration: 18000, loop: true, ease: "linear" },
    wheel: { rotate: [0, 1440], duration: 2400, loop: true, ease: "linear" },
    pulse: {
      scale: [0.98, 1.025, 0.98],
      duration: 2600,
      loop: true,
      ease: "inOutSine",
    },
    expand: {
      scale: [0.65, 1.3],
      opacity: [0.8, 0],
      duration: 2100,
      loop: true,
      ease: "outCubic",
    },
    bolt: {
      keyframes: [
        { opacity: 0, duration: 600 },
        { opacity: 1, duration: 25 },
        { opacity: 0.12, duration: 55 },
        { opacity: 1, duration: 35 },
        { opacity: 0, duration: 200 },
        { opacity: 0, duration: 1200 },
      ],
      loop: true,
    },
    draw: {
      draw: ["0 0", "0 1"],
      duration: Math.min(950, duration * 0.35),
      ease: "outCubic",
    },
    grow: {
      scaleY: [0.04, 1],
      opacity: [0, 1],
      duration: enter,
      ease: "outBack",
    },
    petal: {
      scale: [0.05, 1],
      rotate: [-25, 0],
      duration: enter,
      ease: "outBack",
    },
    sway: {
      rotate: [-2, 2, -2],
      duration: 4800,
      loop: true,
      ease: "inOutSine",
    },
    ride: {
      translateX: [-70, 70, -70],
      duration: 6500,
      loop: true,
      ease: "inOutSine",
    },
    train: {
      translateX: [-820, 0],
      duration: Math.min(1300, duration * 0.22),
      ease: "outQuart",
    },
    launch: {
      translateY: [80, -55, 80],
      duration: 3800,
      loop: true,
      ease: "inOutCubic",
    },
    fall: {
      translateY: [-420, 0],
      rotate: [-25, 0],
      scale: [0.55, 1],
      duration: enter,
      ease: "inQuad",
    },
    rise: {
      translateY: [55, -10],
      opacity: [0, 1],
      duration: enter,
      ease: "outCubic",
    },
    drip: {
      scaleY: [0.08, 1.2],
      duration: Math.min(3200, duration * 0.6),
      ease: "inOutCubic",
    },
    smoke: {
      translateY: [15, -200],
      translateX: [0, -70],
      scale: [0.35, 1.5],
      opacity: [0.65, 0],
      duration: 2700,
      loop: true,
      ease: "outSine",
    },
    pinball: {
      translateX: [-130, 120, -90, 140, 0],
      translateY: [-160, 100, 130, -100, 0],
      duration: 4000,
      loop: true,
      ease: "linear",
    },
    "curtain-left": {
      translateX: [0, -340],
      duration: enter * 1.6,
      ease: "inOutCubic",
    },
    "curtain-right": {
      translateX: [0, 340],
      duration: enter * 1.6,
      ease: "inOutCubic",
    },
    bomb: {
      rotate: [-5, 5, -5],
      duration: 1800,
      loop: true,
      ease: "inOutSine",
    },
    wave: {
      translateX: [-45, 45, -45],
      duration: 5200,
      loop: true,
      ease: "inOutSine",
    },
    swim: {
      translateX: [-100, 100, -100],
      duration: 7000,
      loop: true,
      ease: "inOutSine",
    },
    cards: {
      rotate: [-2, 2, -2],
      translateY: [6, -6, 6],
      duration: 4000,
      loop: true,
      ease: "inOutSine",
    },
    deal: {
      translateY: [90, 0],
      opacity: [0, 1],
      scale: [0.65, 1],
      duration: enter * 0.8,
      ease: "outBack",
    },
  };
  if (scene === "slash") {
    motions.draw = {
      draw: ["0 0", "0 1"],
      duration: Math.min(320, duration * 0.22),
      ease: "outExpo",
    };
    motions.sway = { rotate: [-7, 0], duration: enter, ease: "outExpo" };
  }
  if (scene === "ice")
    motions.grow = {
      scaleY: [0, 1],
      opacity: [0, 1],
      duration: enter * 1.15,
      ease: "outExpo",
    };
  if (scene === "bloom")
    motions.petal = {
      scale: [0, 1],
      rotate: [-40, 0],
      duration: enter * 1.2,
      ease: "outBack",
    };
  if (scene === "rocket" || scene === "runway")
    motions.launch = {
      keyframes: [
        { translateY: 35, duration: enter * 0.55, ease: "inQuad" },
        { translateY: -45, duration: enter * 1.4, ease: "outCubic" },
        { translateY: 0, duration: 2000, ease: "inOutSine" },
      ],
    };
  const tracks = Object.entries(motions).map(
    ([role, parameters]): CinemaTrack => ({
      role,
      parameters,
      at: role === "draw" && scene === "slash" ? impact * 0.35 : 0,
      stagger:
        role === "petal"
          ? 55
          : role === "deal"
            ? 75
            : role === "bolt"
              ? 90
              : role === "grow"
                ? 60
                : role === "smoke"
                  ? 200
                  : 0,
      drawable: role === "draw",
    }),
  );
  if (scene === "eggstorm")
    tracks.push({
      role: "fall",
      at: enter,
      stagger: 0,
      parameters: {
        scaleX: [1, 1.12, 0.98, 1],
        scaleY: [1, 0.82, 1.04, 1],
        duration: 420,
        ease: "outCubic",
      },
    });
  return tracks;
}
