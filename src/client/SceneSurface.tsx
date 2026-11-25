import type { ReactNode } from "react";
import { usePresentation } from "./motion";
import { useSceneTransition, type SceneProfile } from "./scene-transition";
export function SceneSurface({
  scene,
  children,
  className = "scene-surface",
  profile = "scene",
  enabled = true,
  resize = false,
}: {
  scene: string;
  children: ReactNode;
  className?: string;
  profile?: SceneProfile;
  enabled?: boolean;
  resize?: boolean;
}) {
  const root = useSceneTransition(
    scene,
    usePresentation().ui && enabled,
    profile,
  );
  return (
    <div ref={root} className={className} data-scene-enter="fade">
      {resize ? <div data-scene-size="panel">{children}</div> : children}
    </div>
  );
}
