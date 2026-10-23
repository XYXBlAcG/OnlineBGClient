export interface ViewportBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export function effectClip(box: ViewportBox, width: number, height: number) {
  return {
    left: Math.max(0, Math.min(width, box.left)),
    top: Math.max(0, Math.min(height, box.top)),
    right: Math.max(0, width - box.right),
    bottom: Math.max(0, height - box.bottom),
  };
}
