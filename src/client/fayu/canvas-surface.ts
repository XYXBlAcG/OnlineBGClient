import { drawHeight, drawWidth, type DrawPoint, type DrawStroke } from "../../domain/drawguess/types";
import { drawingLayers } from "../../domain/drawguess/canvas-document";
import { regionRunStride } from "../../domain/drawguess/canvas-region";
import { moveSelection, selectionBounds } from "../../domain/drawguess/canvas-selection";
import type { Drawing } from "../../domain/drawguess/canvas-history";
import { orderedCanvasLayer } from "../../domain/drawguess/canvas-order";

export const surfaceWidth = drawWidth;
export const surfaceHeight = drawHeight;
const paper = "#fbf6ea";

const inkColors: Record<string, string> = {
  ink: "#2f2a24",
  blue: "#3778c2",
  red: "#c94b45",
  green: "#3f8a5b",
  gold: "#c58a2e",
  erase: paper,
};

export interface SurfaceState extends Drawing {
  draft?: DrawStroke | null;
  lasso?: DrawPoint[];
  moving?: { start: DrawPoint; current: DrawPoint } | null;
  selected?: string[];
}

export function canvasPoint(rect: Pick<DOMRect, "left" | "top" | "width" | "height">, x: number, y: number): DrawPoint {
  const scale = Math.min(rect.width / surfaceWidth, rect.height / surfaceHeight) || 1;
  const left = rect.left + (rect.width - surfaceWidth * scale) / 2;
  const top = rect.top + (rect.height - surfaceHeight * scale) / 2;
  return [(x - left) / scale, (y - top) / scale];
}

function isEraser(stroke: DrawStroke) {
  return stroke.tool === "eraser" || stroke.ink === "erase";
}

function strokeColor(stroke: DrawStroke) {
  return stroke.color ?? inkColors[stroke.ink] ?? inkColors.ink;
}

function baseWidth(stroke: DrawStroke) {
  return stroke.width ?? (isEraser(stroke) ? 18 : 6);
}

function tracePath(context: CanvasRenderingContext2D, points: DrawPoint[]) {
  if (!points.length) return;
  context.beginPath();
  context.moveTo(points[0]![0], points[0]![1]);
  for (let index = 1; index < points.length - 1; index++) {
    const current = points[index]!;
    const next = points[index + 1]!;
    context.quadraticCurveTo(
      current[0],
      current[1],
      (current[0] + next[0]) / 2,
      (current[1] + next[1]) / 2,
    );
  }
  const last = points.at(-1)!;
  context.lineTo(last[0], last[1]);
}

function paintStroke(
  context: CanvasRenderingContext2D,
  stroke: DrawStroke,
  erase = isEraser(stroke),
) {
  const opacity = stroke.opacity ?? 1;
  const width = baseWidth(stroke);
  context.save();
  context.globalCompositeOperation = erase ? "destination-out" : "source-over";
  context.globalAlpha = erase ? 1 : opacity;
  context.strokeStyle = erase ? "#000" : strokeColor(stroke);
  context.fillStyle = erase ? "#000" : strokeColor(stroke);
  context.lineCap = "round";
  context.lineJoin = "round";
  if (stroke.tool === "sticker" && stroke.points[0]) {
    context.font = `${(stroke.width ?? 12) * 4}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(stroke.text ?? "", stroke.points[0][0], stroke.points[0][1]);
    context.restore();
    return;
  }
  if (stroke.tool === "text" && stroke.points[0]) {
    context.font = `${(stroke.width ?? 6) * 4}px system-ui, sans-serif`;
    context.fillText(stroke.text ?? "", stroke.points[0][0], stroke.points[0][1]);
    context.restore();
    return;
  }
  if (stroke.tool === "line" && stroke.points.length >= 2) {
    const [a, b] = [stroke.points[0]!, stroke.points.at(-1)!];
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(a[0], a[1]);
    context.lineTo(b[0], b[1]);
    context.stroke();
    context.restore();
    return;
  }
  if (stroke.tool === "rect" && stroke.points.length >= 2) {
    const [a, b] = [stroke.points[0]!, stroke.points.at(-1)!];
    context.lineWidth = width;
    context.beginPath();
    context.rect(
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.abs(b[0] - a[0]),
      Math.abs(b[1] - a[1]),
    );
    context.stroke();
    context.restore();
    return;
  }
  if (stroke.tool === "ellipse" && stroke.points.length >= 2) {
    const [a, b] = [stroke.points[0]!, stroke.points.at(-1)!];
    context.lineWidth = width;
    context.beginPath();
    context.ellipse(
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
      Math.abs(b[0] - a[0]) / 2,
      Math.abs(b[1] - a[1]) / 2,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
    return;
  }
  if (stroke.points.length <= 1) {
    const point = stroke.points[0];
    if (point) {
      context.beginPath();
      context.arc(point[0], point[1], width / 2, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    return;
  }
  context.lineWidth = width;
  tracePath(context, stroke.points);
  context.stroke();
  context.restore();
}

type LayerEntry = ReturnType<typeof orderedCanvasLayer>[number];
type Layer = { canvas: HTMLCanvasElement; entries: LayerEntry[] };

export class CanvasSurface {
  private layers = new Map<number, Layer>();
  private images = new Map<string, HTMLImageElement>();
  private scratch?: HTMLCanvasElement;
  private observer?: ResizeObserver;
  private frame?: number;
  private state?: SurfaceState;
  private scale = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(canvas);
    }
    const onWindowResize = () => this.resize();
    let dprQuery: MediaQueryList | undefined;
    if (typeof window !== "undefined") {
      window.addEventListener("resize", onWindowResize);
      window.visualViewport?.addEventListener("resize", onWindowResize);
      if (typeof window.matchMedia === "function") {
        dprQuery = window.matchMedia(
          `(resolution: ${globalThis.devicePixelRatio ?? 1}dppx)`,
        );
        dprQuery.addEventListener?.("change", onWindowResize);
      }
      this.removeWindowListener = () => {
        window.removeEventListener("resize", onWindowResize);
        window.visualViewport?.removeEventListener("resize", onWindowResize);
        dprQuery?.removeEventListener?.("change", onWindowResize);
      };
    }
    const retry = () => this.resize();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(retry);
      window.setTimeout(retry, 250);
      window.setTimeout(retry, 900);
    }
  }

  private removeWindowListener?: () => void;

  private expectedScale() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return 1;
    return Math.min(
      2,
      (globalThis.devicePixelRatio ?? 1) *
        Math.min(width / surfaceWidth, height / surfaceHeight),
    );
  }

  private resize() {
    const scale = this.expectedScale();
    const pixels = Math.max(1, Math.round(surfaceWidth * scale));
    const lines = Math.max(1, Math.round(surfaceHeight * scale));
    this.scale = scale;
    if (this.canvas.width === pixels && this.canvas.height === lines) return;
    this.canvas.width = pixels;
    this.canvas.height = lines;
    this.layers.clear();
    this.scratch = undefined;
    if (this.state) this.schedule(this.state);
  }

  private syncScale() {
    if (Math.abs(this.expectedScale() - this.scale) > 0.01) this.resize();
    else if (
      this.canvas.width !== Math.max(1, Math.round(surfaceWidth * this.scale)) ||
      this.canvas.height !== Math.max(1, Math.round(surfaceHeight * this.scale))
    )
      this.resize();
  }

  private buffer() {
    const buffer = document.createElement("canvas");
    buffer.width = this.canvas.width;
    buffer.height = this.canvas.height;
    return buffer;
  }

  private fillImage(data: string) {
    const existing = this.images.get(data);
    if (existing) return existing;
    const image = new Image();
    this.images.set(data, image);
    image.onload = () => {
      for (const [index, layer] of this.layers) {
        if (layer.entries.some((item) => "fill" in item && item.fill.data === data)) this.layers.delete(index);
      }
      if (this.state) this.schedule(this.state);
    };
    image.src = data;
    return image;
  }

  private paintLayer(canvas: HTMLCanvasElement, entries: LayerEntry[], scale = this.scale) {
    const context = canvas.getContext("2d")!;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, surfaceWidth, surfaceHeight);
    for (const entry of entries) {
      if ("stroke" in entry) {
        paintStroke(context, entry.stroke);
        continue;
      }
      if (entry.fill.region) {
        context.save();
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = 1;
        context.fillStyle = entry.fill.region.color;
        context.beginPath();
        for (const run of entry.fill.region.runs) {
          const start = Math.floor(run / regionRunStride);
          context.rect(start % surfaceWidth, Math.floor(start / surfaceWidth), (run % regionRunStride) + 1, 1);
        }
        context.fill();
        context.restore();
        continue;
      }
      const { data } = entry.fill;
      if (!data) continue;
      const image = this.fillImage(data);
      if (image.complete && image.naturalWidth) context.drawImage(image, 0, 0, surfaceWidth, surfaceHeight);
    }
  }

  private redraw(state: SurfaceState) {
    this.syncScale();
    const context = this.canvas.getContext("2d");
    if (!context) return;
    context.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = paper;
    context.fillRect(0, 0, surfaceWidth, surfaceHeight);
    const retained = new Set(state.fills.flatMap(({ data }) => data ? [data] : []));
    for (const [data, image] of this.images) {
      if (retained.has(data)) continue;
      image.onload = null;
      this.images.delete(data);
    }
    const layers = drawingLayers(state);
    for (const index of this.layers.keys()) if (!layers.some(({ id }) => id === index)) this.layers.delete(index);
    const moving = state.moving;
    const selected = state.selected ?? [];
    const displayStrokes = moving && selected.length
      ? moveSelection(state.strokes, selected, moving.current[0] - moving.start[0], moving.current[1] - moving.start[1])
      : state.strokes;
    for (const { id: index, hidden } of layers) {
      if (hidden) continue;
      const entries = orderedCanvasLayer(state.strokes, state.fills, index);
      const draft = state.draft && (state.draft.layer ?? 0) === index ? state.draft : null;
      if (!entries.length && !draft) {
        this.layers.delete(index);
        continue;
      }
      let layer = this.layers.get(index);
      if (!layer || layer.entries.length !== entries.length || entries.some((entry, i) => {
        const before = layer!.entries[i]!;
        return "stroke" in entry ? !("stroke" in before) || before.stroke !== entry.stroke
          : !("fill" in before) || before.fill !== entry.fill;
      })) {
        layer = { canvas: layer?.canvas ?? this.buffer(), entries };
        this.layers.set(index, layer);
        this.paintLayer(layer.canvas, entries);
      }
      const hasMove = moving && entries.some((entry) => "stroke" in entry && selected.includes(entry.stroke.id));
      let displayed = layer.canvas;
      if (draft || hasMove) {
        this.scratch ??= this.buffer();
        displayed = this.scratch;
        const scratch = displayed.getContext("2d")!;
        if (moving && hasMove) {
          this.paintLayer(displayed, orderedCanvasLayer(displayStrokes, state.fills, index));
        } else {
          scratch.setTransform(this.scale, 0, 0, this.scale, 0, 0);
          scratch.clearRect(0, 0, surfaceWidth, surfaceHeight);
          scratch.drawImage(layer.canvas, 0, 0, surfaceWidth, surfaceHeight);
        }
        if (draft) paintStroke(scratch, draft);
      }
      context.drawImage(displayed, 0, 0, surfaceWidth, surfaceHeight);
    }
    const bounds = selectionBounds(displayStrokes, selected);
    if (bounds) {
      context.strokeStyle = "#2f8f7a";
      context.lineWidth = 2;
      context.setLineDash([8, 6]);
      context.strokeRect(bounds.left - 7, bounds.top - 7, bounds.right - bounds.left + 14, bounds.bottom - bounds.top + 14);
    }
    if (state.lasso && state.lasso.length > 1) {
      context.strokeStyle = "#2f8f7a";
      context.lineWidth = 2;
      context.setLineDash([8, 6]);
      context.beginPath();
      context.moveTo(...state.lasso[0]!);
      for (const point of state.lasso.slice(1)) context.lineTo(...point);
      context.stroke();
    }
    context.restore();
  }

  schedule(state: SurfaceState) {
    this.state = state;
    if (this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      if (this.state) this.redraw(this.state);
    });
  }

  setDraft(draft: SurfaceState["draft"]) {
    if (this.state) this.schedule({ ...this.state, draft });
  }

  async pixels(drawing: Drawing) {
    const layers = drawingLayers(drawing).filter(({ hidden }) => !hidden);
    const pending = drawing.fills.flatMap(({ data, layer }) => {
      const image = data && layers.some(({ id }) => id === layer) ? this.fillImage(data) : undefined;
      return image && !image.complete ? [image.decode().catch(() => {})] : [];
    });
    if (pending.length) await Promise.all(pending);
    const canvas = document.createElement("canvas");
    const layer = document.createElement("canvas");
    canvas.width = layer.width = surfaceWidth;
    canvas.height = layer.height = surfaceHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = paper;
    context.fillRect(0, 0, surfaceWidth, surfaceHeight);
    for (const { id } of layers) {
      const entries = orderedCanvasLayer(drawing.strokes, drawing.fills, id);
      if (!entries.length) continue;
      this.paintLayer(layer, entries, 1);
      context.drawImage(layer, 0, 0);
    }
    return context.getImageData(0, 0, surfaceWidth, surfaceHeight);
  }

  toDataURL() {
    if (this.state) this.redraw({ strokes: this.state.strokes, fills: this.state.fills, layers: this.state.layers });
    if (this.state) this.schedule(this.state);
    return this.canvas.toDataURL("image/png");
  }

  dispose() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.removeWindowListener?.();
    for (const image of this.images.values()) image.onload = null;
    this.images.clear();
    this.layers.clear();
    this.scratch = undefined;
    this.state = undefined;
  }
}
