import { createPortal } from "react-dom";
export interface GuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function GuideHighlight({
  rects,
  caption,
}: {
  rects: GuideRect[];
  caption: string;
}) {
  if (!rects.length || typeof document === "undefined") return null;
  const first = rects[0];
  const left = Math.max(
    12,
    Math.min(innerWidth - 280, first.x + first.width + 14),
  );
  const top = Math.max(12, Math.min(innerHeight - 90, first.y));
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
      <span className="guide-target-caption" style={{ left, top }}>
        {caption}
      </span>
    </div>,
    document.body,
  );
}
