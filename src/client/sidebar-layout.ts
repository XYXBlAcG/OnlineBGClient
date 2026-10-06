export const sidebarBreakpoint = 1100;
export function sidebarBounds(viewport: number) {
  return { min: 280, max: Math.max(280, Math.min(520, viewport - 740)) };
}
