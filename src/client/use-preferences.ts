import { useCallback, useRef, useState, type SetStateAction } from "react";
import { loadPreferences, type Preferences } from "./preferences";
export function usePreferences(
  initialise: (preferences: Preferences) => Preferences,
) {
  const [value, setValue] = useState(() => initialise(loadPreferences()));
  const current = useRef(value);
  const set = useCallback((update: SetStateAction<Preferences>) => {
    const next =
      typeof update === "function" ? update(current.current) : update;
    localStorage.setItem("onlinebg.preferences", JSON.stringify(next));
    current.current = next;
    setValue(next);
  }, []);
  return [value, set] as const;
}
