import { createUseGesture, dragAction, pinchAction } from "@use-gesture/react";
import {
  mapZoom,
  readingMapZoom,
  mapDisplayScale,
  fitMapZoom,
  zoomScroll,
  resizeScroll,
  type MapViewBounds,
  type MapAnchor,
} from "./map-view";
import {
  cloneElement,
  useRef,
  useLayoutEffect,
  useState,
  type ReactElement,
  type ReactNode,
  type HTMLAttributes,
  type CSSProperties,
  type SyntheticEvent,
} from "react";

const readBounds = (box: HTMLElement): MapViewBounds => ({
  left: box.scrollLeft,
  top: box.scrollTop,
  width: box.clientWidth,
  height: box.clientHeight,
  scrollWidth: box.scrollWidth,
  scrollHeight: box.scrollHeight,
});

const useMapGesture = createUseGesture([dragAction, pinchAction]);

export function MapViewport({
  children,
  focusTarget,
  compact = false,
  naturalSize,
  initialZoom,
  fitWidthOnMount = false,
  fitContainOnMount = false,
  focusLabel = "当前士兵",
  overlay,
  onMoveModeChange,
  readingSize,
}: {
  children: ReactElement<HTMLAttributes<HTMLDivElement>>;
  readingSize?: { width: number; height: number };
  overlay?: ReactNode;
  focusTarget?: string;
  compact?: boolean;
  naturalSize?: { width: number; height: number };
  initialZoom?: number;
  fitWidthOnMount?: boolean;
  fitContainOnMount?: boolean;
  focusLabel?: string;
  onMoveModeChange?: (moving: boolean) => void;
}) {
  const [zoom, setZoom] = useState(initialZoom ?? (focusTarget ? 1.6 : 1));
  const [moving, setMoving] = useState(false);
  const [focusRequest, setFocusRequest] = useState(focusTarget ? 1 : 0);
  const [following, setFollowing] = useState(true);
  const [overview, setOverview] = useState(false);
  const previousView = useRef<{ zoom: number; left: number; top: number }>();
  const restoreView = useRef(false);
  const lastFocusRequest = useRef(0);
  const dragOrigin = useRef<{ x: number; y: number }>();
  const blockedUntil = useRef(0);
  const guardClick = (event: SyntheticEvent) => {
    if (moving || performance.now() < blockedUntil.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const viewport = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    onMoveModeChange?.(moving);
  }, [moving, onMoveModeChange]);
  const anchor = useRef<MapAnchor>();
  const bounds = useRef<MapViewBounds>();
  useLayoutEffect(() => {
    const box = viewport.current;
    if (!box) return;
    if (readingSize)
      setZoom(
        readingMapZoom(
          { width: box.clientWidth, height: box.clientHeight },
          readingSize,
        ),
      );
    else if (fitContainOnMount && naturalSize)
      setZoom(
        fitMapZoom(
          { width: box.clientWidth, height: box.clientHeight },
          naturalSize,
        ),
      );
    else if (fitWidthOnMount && naturalSize)
      setZoom(
        mapZoom(
          Math.min(initialZoom ?? 1, box.clientWidth / naturalSize.width),
        ),
      );
    bounds.current = readBounds(box);
    const observer = new ResizeObserver(() => {
      const next = readBounds(box),
        previous = bounds.current;
      if (
        previous &&
        (previous.width !== next.width || previous.height !== next.height)
      ) {
        const position = resizeScroll(previous, next);
        box.scrollLeft = position.left;
        box.scrollTop = position.top;
      }
      bounds.current = readBounds(box);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  useMapGesture(
    {
      onDrag: ({ event, pinching, cancel, tap, movement: [x, y], memo }) => {
        const box = viewport.current;
        if (pinching) {
          cancel();
          return;
        }
        if (
          !box ||
          tap ||
          (!moving &&
            !("touches" in event) &&
            !("pointerType" in event && event.pointerType === "touch"))
        )
          return memo;
        const start = memo || [box.scrollLeft, box.scrollTop];
        const scale = mapDisplayScale(
          box.getBoundingClientRect().width,
          box.offsetWidth,
        );
        box.scrollLeft = start[0] - x / scale;
        box.scrollTop = start[1] - y / scale;
        return start;
      },
      onPinch: ({ event, offset: [scale], origin: [x, y], memo }) => {
        event.preventDefault();
        const box = viewport.current;
        if (!box) return memo;
        const bounds = box.getBoundingClientRect();
        const scaleRatio = mapDisplayScale(bounds.width, box.offsetWidth);
        const start = memo || {
          left: box.scrollLeft,
          top: box.scrollTop,
          x: (x - bounds.left) / scaleRatio,
          y: (y - bounds.top) / scaleRatio,
          zoom,
        };
        anchor.current = start;
        setZoom(mapZoom(scale));
        return start;
      },
    },
    {
      target: viewport,
      eventOptions: { passive: false },
      drag: { filterTaps: true, threshold: 8, pointer: { touch: true } },
      pinch: {
        scaleBounds: { min: 0.25, max: 4 },
        rubberband: false,
        from: () => [zoom, 0],
      },
    },
  );
  useLayoutEffect(() => {
    if (anchor.current && viewport.current) {
      const position = zoomScroll(
        anchor.current,
        zoom,
        naturalSize ? "intrinsic" : "fitted",
      );
      viewport.current.scrollLeft = position.left;
      viewport.current.scrollTop = position.top;
      anchor.current = undefined;
    }
    if (viewport.current) bounds.current = readBounds(viewport.current);
  }, [zoom]);
  useLayoutEffect(() => {
    if (!focusTarget || !focusRequest || !viewport.current) return;
    if (
      readingSize &&
      (!following || overview) &&
      lastFocusRequest.current === focusRequest
    )
      return;
    lastFocusRequest.current = focusRequest;
    const box = viewport.current;
    const frame = requestAnimationFrame(() => {
      const target = box.querySelector(focusTarget)?.getBoundingClientRect(),
        bounds = box.getBoundingClientRect();
      const scale = mapDisplayScale(bounds.width, box.offsetWidth);
      if (target)
        box.scrollTo({
          left:
            box.scrollLeft +
            (target.left + target.width / 2 - bounds.left) / scale -
            box.clientWidth / 2,
          top:
            box.scrollTop +
            (target.top + target.height / 2 - bounds.top) / scale -
            box.clientHeight / 2,
        });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusRequest, focusTarget, following, overview]);
  useLayoutEffect(() => {
    if (restoreView.current && previousView.current && viewport.current) {
      viewport.current.scrollTo(
        previousView.current.left,
        previousView.current.top,
      );
      restoreView.current = false;
    }
  }, [zoom, overview]);
  const tools = (
    <div className="map-tools" aria-label="地图视图">
      <button
        aria-label="缩小地图"
        disabled={zoom <= 0.25}
        onClick={() => setZoom(mapZoom(zoom - 0.5))}
      >
        −
      </button>
      <output aria-label="地图缩放">{Math.round(zoom * 100)}%</output>
      <button
        aria-label="放大地图"
        disabled={zoom === 4}
        onClick={() => setZoom(mapZoom(zoom + 0.5))}
      >
        ＋
      </button>
      {focusTarget && (
        <button
          onClick={() => {
            setFollowing(true);
            setOverview(false);
            if (readingSize && viewport.current)
              setZoom(
                readingMapZoom(
                  {
                    width: viewport.current.clientWidth,
                    height: viewport.current.clientHeight,
                  },
                  readingSize,
                ),
              );
            else if (naturalSize && viewport.current)
              setZoom(
                mapZoom(
                  Math.min(
                    initialZoom ?? 1,
                    viewport.current.clientWidth / naturalSize.width,
                  ),
                ),
              );
            setFocusRequest((value) => value + 1);
          }}
        >
          {focusLabel}
        </button>
      )}
      {readingSize && (
        <button
          aria-pressed={overview}
          onClick={() => {
            const box = viewport.current;
            if (!box || !naturalSize) return;
            if (!overview) {
              previousView.current = {
                zoom,
                left: box.scrollLeft,
                top: box.scrollTop,
              };
              setFollowing(false);
              setOverview(true);
              setZoom(
                fitMapZoom(
                  { width: box.clientWidth, height: box.clientHeight },
                  naturalSize,
                  0.05,
                ),
              );
              box.scrollTo(0, 0);
            } else {
              setOverview(false);
              if (previousView.current) {
                restoreView.current = true;
                setZoom(previousView.current.zoom);
              }
            }
          }}
        >
          {overview ? "返回局部" : "全图总览"}
        </button>
      )}
      {!readingSize && (
        <button
          onClick={() => {
            setZoom(
              naturalSize && viewport.current
                ? fitMapZoom(
                    {
                      width: viewport.current.clientWidth,
                      height: viewport.current.clientHeight,
                    },
                    naturalSize,
                  )
                : 1,
            );
            setMoving(false);
            viewport.current?.scrollTo(0, 0);
          }}
        >
          适配窗口
        </button>
      )}
      <button aria-pressed={moving} onClick={() => setMoving(!moving)}>
        移动地图
      </button>
    </div>
  );
  return (
    <div className="map-viewport">
      {compact ? (
        <details className="map-view-menu">
          <summary>视图 · {Math.round(zoom * 100)}%</summary>
          {tools}
        </details>
      ) : (
        tools
      )}
      <div
        ref={viewport}
        tabIndex={0}
        role="region"
        aria-label="地图可滚动区域"
        onScroll={(event) => {
          const next = readBounds(event.currentTarget);
          if (
            !bounds.current ||
            (bounds.current.width === next.width &&
              bounds.current.height === next.height)
          )
            bounds.current = next;
        }}
        onWheelCapture={() => {
          if (readingSize) setFollowing(false);
        }}
        onPointerDownCapture={(event) => {
          dragOrigin.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerMoveCapture={(event) => {
          const origin = dragOrigin.current;
          if (
            origin &&
            Math.hypot(event.clientX - origin.x, event.clientY - origin.y) >= 8
          ) {
            blockedUntil.current = performance.now() + 400;
            if (readingSize) setFollowing(false);
          }
        }}
        onPointerUpCapture={() => {
          dragOrigin.current = undefined;
        }}
        onPointerCancel={() => {
          dragOrigin.current = undefined;
        }}
        onDoubleClickCapture={guardClick}
        className={`map-scroll ${moving ? "map-moving" : ""}`}
        onClickCapture={guardClick}
      >
        <div
          className="map-canvas"
          style={{
            ...(naturalSize
              ? { minWidth: 0, minHeight: 0, marginInline: "auto" }
              : {}),
            width: naturalSize
              ? `${naturalSize.width * zoom}px`
              : `${Math.max(1, zoom) * 100}%`,
            height: naturalSize
              ? `${naturalSize.height * zoom}px`
              : `${Math.max(1, zoom) * 100}%`,
          }}
        >
          {cloneElement(children, {
            className: `${children.props.className || ""} fitted-map`,
            style: {
              ...children.props.style,
              "--map-zoom": zoom,
              width: naturalSize ? "100%" : `${Math.min(1, zoom) * 100}%`,
              height: naturalSize ? "100%" : `${Math.min(1, zoom) * 100}%`,
            } as CSSProperties,
          })}
          {overlay}
        </div>
      </div>
    </div>
  );
}
