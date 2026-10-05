import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Preferences } from "./preferences";
type SurfaceSize = Preferences["surfaceSizes"][string];
const SurfaceSizes = createContext<{
  sizes: Record<string, SurfaceSize>;
  change: (key: string, size: SurfaceSize) => void;
}>({ sizes: {}, change: () => {} });
export function SurfaceResize({
  id,
  axis = "both",
  reverseHeight = false,
}: {
  id: string;
  axis?: "both" | "height";
  reverseHeight?: boolean;
}) {
  const { sizes, change } = useContext(SurfaceSizes);
  const handle = useRef<HTMLButtonElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>();
  useLayoutEffect(() => {
    const target = handle.current?.parentElement;
    if (!target) return;
    target.classList.add("resizable-surface");
    const size = sizes[id];
    target.style.width =
      axis === "both" && size?.width ? `${size.width}px` : "";
    target.style.height = size?.height ? `${size.height}px` : "";
    target.dataset.resized = String(Boolean(size?.width || size?.height));
  }, [id, sizes, axis]);
  const resize = (width: number, height: number) => {
    const target = handle.current!.parentElement!;
    const dialog = target.classList.contains("ui-panel"),
      drawer = target.classList.contains("room-sidebar");
    const bounds = target.parentElement!.getBoundingClientRect();
    change(id, {
      ...(axis === "both"
        ? {
            width: Math.round(
              Math.max(
                180,
                Math.min(
                  width,
                  dialog || drawer ? window.innerWidth - 24 : bounds.width,
                ),
              ),
            ),
          }
        : {}),
      height: Math.round(
        Math.max(
          80,
          Math.min(
            height,
            dialog || drawer ? window.innerHeight - 80 : bounds.height * 0.6,
          ),
        ),
      ),
    });
  };
  return (
    <button
      ref={handle}
      className={`surface-resize-handle ${reverseHeight ? "resize-top" : ""}`}
      aria-label={`调整${id}尺寸`}
      title="拖动调整尺寸；双击恢复"
      onDoubleClick={() => change(id, {})}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const rect = event.currentTarget.parentElement!.getBoundingClientRect();
        drag.current = {
          x: event.clientX,
          y: event.clientY,
          width: rect.width,
          height: rect.height,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerMove={(event) => {
        if (drag.current)
          resize(
            drag.current.width + event.clientX - drag.current.x,
            drag.current.height +
              (reverseHeight ? -1 : 1) * (event.clientY - drag.current.y),
          );
      }}
      onPointerUp={() => {
        drag.current = undefined;
      }}
      onPointerCancel={() => {
        drag.current = undefined;
      }}
      onLostPointerCapture={() => {
        drag.current = undefined;
      }}
      onKeyDown={(event) => {
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Home") {
          change(id, {});
          return;
        }
        const rect = event.currentTarget.parentElement!.getBoundingClientRect();
        resize(
          rect.width +
            (event.key === "ArrowRight"
              ? 16
              : event.key === "ArrowLeft"
                ? -16
                : 0),
          rect.height +
            (event.key === "ArrowDown"
              ? 16
              : event.key === "ArrowUp"
                ? -16
                : 0),
        );
      }}
    >
      ↔↕
    </button>
  );
}
export function GameSurfaceSizes({ kind }: { kind: string }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  useLayoutEffect(() => {
    const root = anchor.current!.parentElement!;
    const refresh = () => {
      const found = [
        ...root.querySelectorAll<HTMLElement>(
          ".catan-actions,.catan-hand-panel,.sgs-hand-panel,.table-actions,.table-collection,[data-game=dy] > .mt-auto,[data-game=ddz] > .mt-4,[data-game=uno] > div:not([class]),[data-game=uno] > div.resizable-surface,.sgs-public-panel",
        ),
      ];
      setTargets((previous) =>
        previous.length === found.length &&
        previous.every((node, i) => node === found[i])
          ? previous
          : found,
      );
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [kind]);
  return (
    <>
      <span ref={anchor} hidden />
      {targets.map((target, i) =>
        createPortal(
          <SurfaceResize id={`${kind}面板${i + 1}`} reverseHeight />,
          target,
          `${kind}:${i}`,
        ),
      )}
    </>
  );
}
export function SurfaceSizeProvider({
  sizes,
  change,
  children,
}: {
  sizes: Record<string, SurfaceSize>;
  change: (key: string, size: SurfaceSize) => void;
  children: ReactNode;
}) {
  return (
    <SurfaceSizes.Provider value={{ sizes, change }}>
      {children}
    </SurfaceSizes.Provider>
  );
}
