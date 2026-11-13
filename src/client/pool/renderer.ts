export const poolRenderers = ["auto", "2d", "3d"] as const;
export type PoolRenderer = (typeof poolRenderers)[number];
export type PoolRendererKind = "2d" | "3d";

export interface PoolRendererEnvironment {
  finePointer: boolean;
  width: number;
  webgl: boolean;
}

export function resolvePoolRenderer(
  preference: PoolRenderer,
  fallback: boolean,
  environment: PoolRendererEnvironment,
): PoolRendererKind {
  if (fallback || preference === "2d" || !environment.webgl) return "2d";
  if (preference === "3d") return "3d";
  return environment.finePointer && environment.width >= 900 ? "3d" : "2d";
}

export function detectPoolRendererEnvironment(): PoolRendererEnvironment {
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
