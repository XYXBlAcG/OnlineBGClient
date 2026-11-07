import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
export interface GuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
const usePlacementEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
export function placeGuideCaption(
  rects: GuideRect[],
  size: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const margin = 12,
    gap = 12,
    width = Math.max(
      120,
      Math.min(size.width || 260, viewport.width - margin * 2),
    ),
    height = Math.max(32, size.height || 52),
    expanded = rects.map((rect) => {
      const rectWidth = Math.max(12, rect.width),
        rectHeight = Math.max(12, rect.height);
      return {
        left: rect.x - 8,
        top: rect.y - 8,
        right: rect.x + rectWidth + 8,
        bottom: rect.y + rectHeight + 8,
      };
    }),
    left = Math.min(...expanded.map((rect) => rect.left)),
    top = Math.min(...expanded.map((rect) => rect.top)),
    right = Math.max(...expanded.map((rect) => rect.right)),
    bottom = Math.max(...expanded.map((rect) => rect.bottom)),
    clampX = (value: number) =>
      Math.max(margin, Math.min(viewport.width - width - margin, value)),
    clampY = (value: number) =>
      Math.max(margin, Math.min(viewport.height - height - margin, value)),
    candidates = [
      { left: clampX((left + right - width) / 2), top: bottom + gap },
      { left: clampX((left + right - width) / 2), top: top - height - gap },
      { left: right + gap, top: clampY(top) },
      { left: left - width - gap, top: clampY(top) },
      { left: margin, top: viewport.height - height - margin },
      { left: margin, top: margin },
    ],
    overlap = (candidate: { left: number; top: number }) =>
      expanded.reduce((area, rect) => {
        const overlapX = Math.max(
            0,
            Math.min(candidate.left + width, rect.right) -
              Math.max(candidate.left, rect.left),
          ),
          overlapY = Math.max(
            0,
            Math.min(candidate.top + height, rect.bottom) -
              Math.max(candidate.top, rect.top),
          );
        return area + overlapX * overlapY;
      }, 0),
    fits = (candidate: { left: number; top: number }) =>
      candidate.left >= margin &&
      candidate.top >= margin &&
      candidate.left + width <= viewport.width - margin &&
      candidate.top + height <= viewport.height - margin;
  let bestFit: { left: number; top: number } | null = null;
  let bestFitOverlap = Number.POSITIVE_INFINITY;
  let bestAny = candidates[0];
  let bestAnyOverlap = overlap(bestAny);
  for (const candidate of candidates) {
    const current = overlap(candidate);
    if (fits(candidate) && current === 0)
      return { left: candidate.left, top: candidate.top };
    if (fits(candidate) && current < bestFitOverlap) {
      bestFit = candidate;
      bestFitOverlap = current;
    }
    if (current < bestAnyOverlap) {
      bestAny = candidate;
      bestAnyOverlap = current;
    }
  }
  const best = bestFit ?? bestAny;
  return { left: best.left, top: best.top };
}
export function GuideHighlight({
  rects,
  caption,
}: {
  rects: GuideRect[];
  caption: string;
}) {
  const captionRef = useRef<HTMLSpanElement>(null);
  usePlacementEffect(() => {
    const element = captionRef.current;
    if (!element || typeof window === "undefined") return;
    const position = placeGuideCaption(
      rects,
      { width: element.offsetWidth, height: element.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
    element.style.left = `${position.left}px`;
    element.style.top = `${position.top}px`;
    element.style.visibility = "visible";
  });
  if (!rects.length || typeof document === "undefined") return null;
  return createPortal(
    <div className="guide-highlight" aria-label="教学目标标记">
      <svg width="100%" height="100%" aria-hidden="true">
        {rects.map((rect, index) => (
          <g key={index}>
            <rect
              x={rect.x - 4}
              y={rect.y - 4}
              width={Math.max(12, rect.width) + 8}
              height={Math.max(12, rect.height) + 8}
              rx="8"
              className="guide-halo"
            />
            <rect
              x={rect.x - 4}
              y={rect.y - 4}
              width={Math.max(12, rect.width) + 8}
              height={Math.max(12, rect.height) + 8}
              rx="8"
              className="guide-ring"
            />
            <circle
              cx={rect.x + Math.min(rect.width, 18)}
              cy={Math.max(14, rect.y - 8)}
              r="13"
              fill="#f59e0b"
              stroke="white"
              strokeWidth="3"
            />
            <text
              x={rect.x + Math.min(rect.width, 18)}
              y={Math.max(14, rect.y - 8) + 4}
              textAnchor="middle"
              fill="#191919"
              fontSize="12"
              fontWeight="bold"
            >
              {index + 1}
            </text>
          </g>
        ))}
      </svg>
      <span
        ref={captionRef}
        className="guide-target-caption"
        style={{ left: -9999, top: -9999, visibility: "hidden" }}
      >
        {caption}
      </span>
    </div>,
    document.body,
  );
}
