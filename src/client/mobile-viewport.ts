export interface ViewportSize {
  width: number;
  height: number;
  visualHeight: number;
  visualWidth?: number;
  scale?: number;
  offsetTop: number;
  orientation?: "portrait" | "landscape";
  windowHeight?: number;
}
export function mobileViewport(size: ViewportSize) {
  return {
    landscape: size.orientation
      ? size.orientation === "landscape"
      : size.width > size.height,
    width: Math.max(1, Math.round(size.visualWidth ?? size.width)),
    height: Math.max(1, Math.round(Math.min(size.height, size.visualHeight))),
    keyboard: (size.scale ?? 1) === 1 && size.height - size.visualHeight > 120,
    bottom: Math.max(
      0,
      (size.windowHeight ?? size.height) - size.visualHeight - size.offsetTop,
    ),
  };
}
