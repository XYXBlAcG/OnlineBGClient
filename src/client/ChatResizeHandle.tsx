import { useRef } from "react";
export function ChatResizeHandle({
  width,
  onChange,
}: {
  width: number;
  onChange: (width: number) => void;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  return (
    <div
      role="separator"
      aria-label="聊天侧栏宽度"
      aria-orientation="vertical"
      aria-valuemin={260}
      aria-valuemax={520}
      aria-valuenow={width}
      tabIndex={0}
      className="chat-resize-handle"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        drag.current = {
          x: event.clientX,
          width:
            event.currentTarget.parentElement!.getBoundingClientRect().width,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        if (drag.current)
          onChange(
            Math.max(
              260,
              Math.min(
                520,
                Math.round(drag.current.width + drag.current.x - event.clientX),
              ),
            ),
          );
      }}
      onPointerUp={(event) => {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(event) => {
        const next =
          event.key === "Home"
            ? 260
            : event.key === "End"
              ? 520
              : event.key === "ArrowLeft"
                ? width + 16
                : event.key === "ArrowRight"
                  ? width - 16
                  : null;
        if (next !== null) {
          event.preventDefault();
          event.stopPropagation();
          onChange(Math.max(260, Math.min(520, next)));
        }
      }}
    />
  );
}
