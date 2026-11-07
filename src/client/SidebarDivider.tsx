import { useEffect, useRef } from "react";
import { sidebarBounds } from "./sidebar-layout";

interface Drag {
  x: number;
  width: number;
  next: number;
  layout: HTMLElement | null;
  frame: number | null;
}

export function SidebarDivider({
  width,
  onChange,
  placement = "edge",
}: {
  width: number;
  placement?: "edge" | "track";
  onChange: (width: number) => void;
}) {
  const drag = useRef<Drag | null>(null);
  const bounds = sidebarBounds(innerWidth);
  const clamp = (value: number) =>
    Math.round(Math.max(bounds.min, Math.min(bounds.max, value)));
  const preview = (
    layout: HTMLElement | null,
    element: HTMLElement | null,
    value: number,
  ) => {
    layout?.style.setProperty("--chat-width", `${value}px`);
    element?.setAttribute("aria-valuenow", String(value));
  };
  const stop = (restore?: HTMLElement) => {
    const current = drag.current;
    if (!current) return;
    if (current.frame !== null) cancelAnimationFrame(current.frame);
    if (restore) {
      preview(current.layout, restore, current.width);
      if (current.layout) delete current.layout.dataset.resizing;
    }
    drag.current = null;
  };
  useEffect(
    () => () => {
      const current = drag.current;
      if (current?.frame !== null && current?.frame !== undefined)
        cancelAnimationFrame(current.frame);
      if (current?.layout) delete current.layout.dataset.resizing;
      drag.current = null;
    },
    [],
  );
  const commit = (value: number) => onChange(clamp(value));
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
      data-placement={placement}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.focus();
        const layout = event.currentTarget.closest<HTMLElement>(".room-layout");
        drag.current = {
          x: event.clientX,
          width,
          next: width,
          layout,
          frame: null,
        };
        if (layout) layout.dataset.resizing = "true";
        preview(layout, event.currentTarget, width);
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        const current = drag.current,
          element = event.currentTarget;
        if (!current) return;
        current.next = clamp(current.width + current.x - event.clientX);
        if (current.frame !== null) return;
        current.frame = requestAnimationFrame(() => {
          const active = drag.current;
          if (!active) return;
          active.frame = null;
          preview(active.layout, element, active.next);
        });
      }}
      onPointerUp={(event) => {
        const current = drag.current;
        if (!current) return;
        if (current.frame !== null) cancelAnimationFrame(current.frame);
        preview(current.layout, event.currentTarget, current.next);
        if (current.layout) delete current.layout.dataset.resizing;
        drag.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        commit(current.next);
      }}
      onPointerCancel={(event) => {
        stop(event.currentTarget);
      }}
      onLostPointerCapture={(event) => {
        stop(event.currentTarget);
      }}
      onDoubleClick={() => commit(320)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && drag.current) {
          stop(event.currentTarget);
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
          commit(value);
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    />
  );
}
