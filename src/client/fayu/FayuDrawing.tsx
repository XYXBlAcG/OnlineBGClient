import { memo, useEffect, useRef } from "react";
import type { Drawing } from "../../domain/drawguess/canvas-history";
import { CanvasSurface, surfaceHeight, surfaceWidth } from "./canvas-surface";

const emptyFills: Drawing["fills"] = [];

export const FayuDrawing = memo(function FayuDrawing({
  strokes,
  fills = emptyFills,
  layers,
}: { strokes: Drawing["strokes"]; fills?: Drawing["fills"]; layers?: Drawing["layers"] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const surface = useRef<CanvasSurface>();
  useEffect(() => {
    if (!canvas.current) return;
    const painter = new CanvasSurface(canvas.current);
    surface.current = painter;
    return () => {
      painter.dispose();
      surface.current = undefined;
    };
  }, []);
  useEffect(() => surface.current?.schedule({ strokes, fills, layers }), [strokes, fills, layers]);
  return <canvas ref={canvas} className="fayu-art" width={surfaceWidth} height={surfaceHeight} role="img" aria-label="画作" />;
});
