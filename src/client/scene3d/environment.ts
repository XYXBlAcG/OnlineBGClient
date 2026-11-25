export const sceneRenderers = ["auto", "2d", "3d"] as const;
export type SceneRenderer = (typeof sceneRenderers)[number];
export type SceneRendererKind = "2d" | "3d";

export const golfEnvironments = ["coast", "forest"] as const;
export type GolfEnvironment = (typeof golfEnvironments)[number];

export const poolEnvironments = ["midnight", "arena"] as const;
export type PoolEnvironment = (typeof poolEnvironments)[number];

export interface SceneEnvironment {
  finePointer: boolean;
  width: number;
  webgl: boolean;
}

export function detectSceneEnvironment(): SceneEnvironment {
  if (typeof window === "undefined")
    return { finePointer: false, width: 0, webgl: false };
  let webgl = false;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webgl = !!context;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  return {
    finePointer:
      typeof window.matchMedia === "function"
        ? window.matchMedia("(pointer: fine)").matches
        : false,
    width: window.innerWidth,
    webgl,
  };
}

export function resolveSceneRenderer(
  preference: SceneRenderer,
  fallback: boolean,
  environment: SceneEnvironment,
): SceneRendererKind {
  if (fallback || preference === "2d" || !environment.webgl) return "2d";
  if (preference === "3d") return "3d";
  return environment.finePointer && environment.width >= 900 ? "3d" : "2d";
}

export interface ScenePalette {
  sky: string;
  fog: string;
  ground: string;
  groundAccent: string;
  sun: string;
  fill: string;
  ambient: string;
}

export const scenePalettes: Record<GolfEnvironment | PoolEnvironment, ScenePalette> = {
  coast: {
    sky: "#b8dce7",
    fog: "#c9e4e8",
    ground: "#5f9a63",
    groundAccent: "#8fc17f",
    sun: "#ffdca3",
    fill: "#b8d8ff",
    ambient: "#f4f1dc",
  },
  forest: {
    sky: "#8ea58f",
    fog: "#a8b7a0",
    ground: "#3f7250",
    groundAccent: "#759b62",
    sun: "#ffe2ac",
    fill: "#9dc9b8",
    ambient: "#e9ead9",
  },
  midnight: {
    sky: "#0d151c",
    fog: "#101b24",
    ground: "#11161b",
    groundAccent: "#1c2a2e",
    sun: "#ffd59b",
    fill: "#5b88a0",
    ambient: "#2d4b54",
  },
  arena: {
    sky: "#080b10",
    fog: "#0c1218",
    ground: "#101317",
    groundAccent: "#1b2229",
    sun: "#fff4d6",
    fill: "#6b9caf",
    ambient: "#253a42",
  },
};

export const scene3dQualities = ["high", "balanced", "performance"] as const;
export type Scene3dQuality = (typeof scene3dQualities)[number];

export function postSettings(quality: Scene3dQuality) {
  if (quality === "high")
    return { enabled: true, samples: 4, bloom: true, smaa: true, sharpen: true };
  if (quality === "performance") return { enabled: false };
  return { enabled: true, samples: 0, bloom: true, smaa: true, sharpen: false };
}

export function pixelRatioFor(quality: Scene3dQuality) {
  if (quality === "high") return Math.min(2, Math.max(1.5, devicePixelRatio || 1));
  if (quality === "performance") return 1;
  return Math.min(1.5, Math.max(1, devicePixelRatio || 1));
}
