import { lazy, Suspense, useCallback, useEffect, useState, type ComponentProps } from "react";
import { GolfTable } from "./GolfTable";
import {
  detectSceneEnvironment,
  resolveSceneRenderer,
  type GolfEnvironment,
  type SceneRenderer,
} from "../scene3d/environment";

const GolfTable3D = lazy(() =>
  import("./GolfTable3D").then((module) => ({ default: module.GolfTable3D })),
);

type GolfTableProps = Omit<ComponentProps<typeof GolfTable>, "onRendererToggle">;

export function GolfGame({
  renderer = "auto",
  environment = "coast",
  quality = "balanced",
  onRendererChange,
  ...props
}: GolfTableProps & {
  renderer?: SceneRenderer;
  environment?: GolfEnvironment;
  quality?: import("../scene3d/environment").Scene3dQuality;
  onRendererChange?: (renderer: SceneRenderer) => void;
}) {
  const [detected, setDetected] = useState(detectSceneEnvironment);
  const [override, setOverride] = useState<SceneRenderer | null>(null);
  const [fallback, setFallback] = useState(false);
  const preference = override ?? renderer;
  useEffect(() => {
    setOverride(null);
    setFallback(false);
  }, [renderer]);
  useEffect(() => {
    const update = () => setDetected(detectSceneEnvironment());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const kind = resolveSceneRenderer(preference, fallback, detected);
  const change = (next: SceneRenderer) => {
    setOverride(next);
    setFallback(false);
    onRendererChange?.(next);
  };
  const unavailable = useCallback(() => setFallback(true), []);
  if (kind === "3d")
    return (
      <Suspense fallback={<GolfTable {...props} onRendererToggle={detected.webgl ? () => change("2d") : undefined} />}>
        <GolfTable3D
          {...props}
          environment={environment}
          quality={quality}
          onRendererToggle={() => change("2d")}
          onUnavailable={unavailable}
        />
      </Suspense>
    );
  return (
    <GolfTable
      {...props}
      onRendererToggle={detected.webgl ? () => change("3d") : undefined}
    />
  );
}

export type { GolfEnvironment };
