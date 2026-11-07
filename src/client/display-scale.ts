export function applyDisplayScale(preferences: {
  uiFontScale: number;
  uiScale: number;
}) {
  const root = document.documentElement;
  root.style.setProperty("--ui-font-scale", String(preferences.uiFontScale));
  root.style.setProperty("--ui-scale", String(preferences.uiScale));
}
