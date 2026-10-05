import {
  cloneElement,
  useRef,
  useState,
  type ReactElement,
  type HTMLAttributes,
} from "react";

export function MapViewport({
  children,
}: {
  children: ReactElement<HTMLAttributes<HTMLDivElement>>;
}) {
  const [zoom, setZoom] = useState(1);
  const [moving, setMoving] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number }>();
  return (
    <div className="map-viewport">
      <div className="map-tools" aria-label="地图视图">
        <button
          aria-label="缩小地图"
          disabled={zoom === 0.25}
          onClick={() => setZoom(Math.max(0.25, zoom - 0.5))}
        >
          −
        </button>
        <output aria-label="地图缩放">{Math.round(zoom * 100)}%</output>
        <button
          aria-label="放大地图"
          disabled={zoom === 4}
          onClick={() => setZoom(Math.min(4, zoom + 0.5))}
        >
          ＋
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setMoving(false);
            viewport.current?.scrollTo(0, 0);
          }}
        >
          适配窗口
        </button>
        <button aria-pressed={moving} onClick={() => setMoving(!moving)}>
          移动地图
        </button>
      </div>
      <div
        ref={viewport}
        onLostPointerCapture={() => {
          drag.current = undefined;
        }}
        className={`map-scroll ${moving ? "map-moving" : ""}`}
        onPointerDown={(event) => {
          if (!moving) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            top: event.currentTarget.scrollTop,
          };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          event.currentTarget.scrollLeft =
            drag.current.left + drag.current.x - event.clientX;
          event.currentTarget.scrollTop =
            drag.current.top + drag.current.y - event.clientY;
        }}
        onPointerUp={() => {
          drag.current = undefined;
        }}
        onPointerCancel={() => {
          drag.current = undefined;
        }}
        onClickCapture={(event) => {
          if (moving) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <div
          className="map-canvas"
          style={{
            width: `${Math.max(1, zoom) * 100}%`,
            height: `${Math.max(1, zoom) * 100}%`,
          }}
        >
          {cloneElement(children, {
            className: `${children.props.className || ""} fitted-map`,
            style: {
              ...children.props.style,
              width: `${Math.min(1, zoom) * 100}%`,
              height: `${Math.min(1, zoom) * 100}%`,
            },
          })}
        </div>
      </div>
    </div>
  );
}
