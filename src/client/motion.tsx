import { listen } from "@tauri-apps/api/event";
import { isTauri } from "@tauri-apps/api/core";
import { installSelectionPolicy, selectAll } from "./selection-policy";
import { createContext, useContext, useEffect } from "react";
import type { Preferences } from "./preferences";
import { motionPolicy } from "./motion-policy";
import { useMotion } from "./use-motion";
const MotionContext = createContext<ReturnType<typeof motionPolicy>>({
  ui: true,
  social: true,
  game: "baseline",
});
export const usePresentation = () => useContext(MotionContext);
export function MotionProvider({
  preferences,
  children,
}: {
  preferences: Preferences;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const dispose = installSelectionPolicy(document);
    const native = isTauri()
      ? listen("edit-select-all", () => selectAll(document))
      : null;
    return () => {
      dispose();
      if (native) void native.then((stop) => stop()).catch(console.error);
    };
  }, []);
  const allowed = useMotion(true);
  const policy = motionPolicy(preferences, !allowed, true);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = String(policy.ui);
    root.dataset.gameMotion = policy.game;
    for (const animation of document.getAnimations()) {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      if (!(target instanceof Element)) continue;
      if (target.closest('[data-motion-scope="social"]')) {
        if (!policy.social) animation.cancel();
        continue;
      }
      const game =
        !!target.closest('[data-motion-scope="game"]') &&
        !target.closest('[data-motion-scope="ui"]');
      if (game ? policy.game === "reduced" : !policy.ui) animation.cancel();
    }
  }, [policy.ui, policy.game, allowed]);
  return (
    <MotionContext.Provider value={policy}>{children}</MotionContext.Provider>
  );
}
