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
