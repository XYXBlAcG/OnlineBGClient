import { useSyncExternalStore } from "react";
import { themes } from "./themes";
const subscribe = (notify: () => void) => {
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const snapshot = () => matchMedia("(prefers-color-scheme: dark)").matches;
export function useThemeScheme(theme: string): "light" | "dark" {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  return themes.get(theme === "system" ? (dark ? "dark" : "light") : theme)
    .scheme;
}
