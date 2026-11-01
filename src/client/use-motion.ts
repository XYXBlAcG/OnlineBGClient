import { useSyncExternalStore } from "react";
function subscribe(update: () => void) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  return () => {
    media.removeEventListener("change", update);
    document.removeEventListener("visibilitychange", update);
  };
}
export function useMotion(enabled: boolean, visibility = true): boolean {
  return useSyncExternalStore(
    subscribe,
    () =>
      enabled &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      (!visibility || document.visibilityState !== "hidden"),
    () => enabled,
  );
}
