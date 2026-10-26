export const mapZoom = (value: number) => Math.max(0.25, Math.min(4, value));
export interface MapAnchor {
  left: number;
  top: number;
  x: number;
  y: number;
  zoom: number;
}
export function zoomScroll(
  anchor: MapAnchor,
  zoom: number,
  mode: "fitted" | "intrinsic" = "fitted",
): { left: number; top: number } {
  const scale =
    mode === "intrinsic"
      ? zoom / anchor.zoom
      : Math.max(1, zoom) / Math.max(1, anchor.zoom);
  return {
    left: Math.max(0, (anchor.left + anchor.x) * scale - anchor.x),
    top: Math.max(0, (anchor.top + anchor.y) * scale - anchor.y),
  };
}
export interface MapViewBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  scrollWidth: number;
  scrollHeight: number;
}
export function resizeScroll(
  before: MapViewBounds,
  after: Omit<MapViewBounds, "left" | "top">,
): { left: number; top: number } {
  const x = (before.left + before.width / 2) / Math.max(1, before.scrollWidth);
  const y = (before.top + before.height / 2) / Math.max(1, before.scrollHeight);
  return {
    left: Math.max(
      0,
      Math.min(
        after.scrollWidth - after.width,
        x * after.scrollWidth - after.width / 2,
      ),
    ),
    top: Math.max(
      0,
      Math.min(
        after.scrollHeight - after.height,
        y * after.scrollHeight - after.height / 2,
      ),
    ),
  };
}

export function fitMapZoom(
  view: { width: number; height: number },
  content: { width: number; height: number },
): number {
  return mapZoom(
    Math.min(view.width / content.width, view.height / content.height),
  );
}
