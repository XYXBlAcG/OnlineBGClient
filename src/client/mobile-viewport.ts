export interface ViewportSize {
  width: number;
  height: number;
  visualHeight: number;
  offsetTop: number;
  orientation?: "portrait" | "landscape";
  windowHeight?: number;
}
export function mobileViewport(size: ViewportSize) {
  return {
    landscape: size.orientation
      ? size.orientation === "landscape"
      : size.width > size.height,
    height: Math.max(1, Math.round(size.visualHeight)),
    keyboard: size.height - size.visualHeight > 120,
    bottom: Math.max(
      0,
      (size.windowHeight ?? size.height) - size.visualHeight - size.offsetTop,
    ),
  };
}
