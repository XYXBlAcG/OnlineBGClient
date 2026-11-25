import { useState, type SetStateAction } from "react";

export const focusToggleBinding = "F";
export const borderlessToggleBinding = "F11";

export function useTableFocus(round: string | null, automatic: boolean) {
  const [choice, setChoice] = useState<{ round: string; focused: boolean }>();
  const focused =
    !!round && (choice?.round === round ? choice.focused : automatic);
  const setFocused = (next: SetStateAction<boolean>) => {
    if (round)
      setChoice((previous) => ({
        round,
        focused:
          typeof next === "function"
            ? next(previous?.round === round ? previous.focused : automatic)
            : next,
      }));
  };
  return [focused, setFocused] as const;
}

export function focusPresentation({
  focused,
  playing,
  tab,
}: {
  focused: boolean;
  playing: boolean;
  tab: string;
}): boolean {
  return focused && playing && tab === "game";
}
