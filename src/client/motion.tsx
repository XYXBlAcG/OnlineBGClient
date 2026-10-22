import { createContext, useContext, useEffect } from "react";
import type { Preferences } from "./preferences";
import { motionPolicy } from "./motion-policy";
import { useMotion } from "./use-motion";
const MotionContext = createContext<ReturnType<typeof motionPolicy>>({
  ui: true,
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
  const allowed = useMotion(true);
  const policy = motionPolicy(preferences, !allowed, true);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = String(policy.ui);
    root.dataset.gameMotion = policy.game;
    for (const animation of document.getAnimations()) {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      if (!(target instanceof Element)) continue;
      const game =
        !!target.closest('[data-motion-scope="game"]') &&
        !target.closest('[data-motion-scope="ui"]');
      if (game ? policy.game === "reduced" : !policy.ui) animation.cancel();
    }
  }, [policy.ui, policy.game]);
  return (
    <MotionContext.Provider value={policy}>{children}</MotionContext.Provider>
  );
}
