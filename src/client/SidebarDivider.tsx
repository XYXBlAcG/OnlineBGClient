import { useRef } from "react";
import { sidebarBounds } from "./sidebar-layout";
export function SidebarDivider({
  width,
  onChange,
}: {
  width: number;
  onChange: (width: number) => void;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const bounds = sidebarBounds(innerWidth);
  const change = (value: number) =>
    onChange(Math.round(Math.max(bounds.min, Math.min(bounds.max, value))));
  return (
    <div
      role="separator"
      aria-label="辅助区域宽度"
      aria-orientation="vertical"
      aria-valuemin={bounds.min}
      aria-valuemax={bounds.max}
      aria-valuenow={width}
      tabIndex={0}
      className="sidebar-divider"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.focus();
        drag.current = { x: event.clientX, width };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        if (drag.current)
          change(drag.current.width + drag.current.x - event.clientX);
      }}
      onPointerUp={(event) => {
        drag.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        if (drag.current) onChange(drag.current.width);
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onDoubleClick={() => change(320)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && drag.current) {
          onChange(drag.current.width);
          drag.current = null;
          event.stopPropagation();
          event.preventDefault();
          return;
        }
        const value =
          event.key === "Home"
            ? bounds.min
            : event.key === "End"
              ? bounds.max
              : event.key === "ArrowLeft"
                ? width + 16
                : event.key === "ArrowRight"
                  ? width - 16
                  : null;
        if (value !== null) {
          change(value);
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    />
  );
}
