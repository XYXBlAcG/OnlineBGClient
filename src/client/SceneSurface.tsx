import type { ReactNode } from "react";
import { usePresentation } from "./motion";
import { useSceneTransition } from "./scene-transition";
export function SceneSurface({
  scene,
  children,
}: {
  scene: string;
  children: ReactNode;
}) {
  const root = useSceneTransition(scene, usePresentation().ui);
  return (
    <div ref={root} className="scene-surface" data-scene-enter="fade">
      {children}
    </div>
  );
}
