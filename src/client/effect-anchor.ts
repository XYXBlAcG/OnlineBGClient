export function effectAnchorRect(surface: HTMLElement, selector: string) {
  for (const node of surface.querySelectorAll<HTMLElement>(selector)) {
    const face =
      node.querySelector<HTMLElement>(
        "[data-effect-anchor],.game-avatar-face",
      ) ?? node;
    const rect = face.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.left + rect.width < 0 ||
      rect.top + rect.height < 0
    )
      continue;
    if (
      typeof innerWidth !== "undefined" &&
      (rect.left > innerWidth || rect.top > innerHeight)
    )
      continue;
    return {
      point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    };
  }
  return null;
}
