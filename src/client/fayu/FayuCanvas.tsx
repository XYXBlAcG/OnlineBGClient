import type { DrawingHistoryStatus } from "../../domain/drawguess/canvas-history";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { v4 as randomId } from "uuid";
import type { Action } from "../../domain/types";
import { drawFillLimit, drawPointLimit, drawStrokeLimit, type DrawLayer, type DrawPoint, type DrawStroke } from "../../domain/drawguess/types";
import { nextCanvasOrder } from "../../domain/drawguess/canvas-order";
import { Button, Slider } from "../ui/Controls";
import { openCanvasDraft } from "./canvas-edits";
import { CanvasSurface, canvasPoint, surfaceHeight, surfaceWidth } from "./canvas-surface";
import type { FayuFill } from "../../domain/fayu/types";
import { drawingLayers } from "../../domain/drawguess/canvas-document";
import { lassoHits, selectionBounds, selectionDelta } from "../../domain/drawguess/canvas-selection";
import { DrawingLayersControl } from "./DrawingLayersControl";

const colors = ["#2f2a24", "#3778c2", "#c94b45", "#3f8a5b", "#c58a2e", "#7a5bb5", "#e67e22", "#fbf6ea"];
type Finish = Extract<Action, { type: "draw-finish" | "draw-next" }>;
type Tool = "brush" | "eraser" | "line" | "rect" | "ellipse" | "sticker" | "select" | "fill";
const toolNames: Record<Tool, string> = { brush: "画笔", eraser: "橡皮", line: "直线", rect: "矩形", ellipse: "椭圆", sticker: "贴纸", select: "套索", fill: "油漆桶" };
const toolIcons: Record<Tool, string> = { brush: "✎", eraser: "✧", line: "╱", rect: "▭", ellipse: "◯", sticker: "⭐", select: "◌", fill: "▨" };

export function FayuCanvas({
  strokes,
  fills = [],
  layers: savedLayers,
  enabled,
  showTools = true,
  pending,
  round,
  act,
  finish,
  draftKey,
  draftGame,
  completed = false,
  history,
  limits = { maxFills: drawFillLimit, maxPoints: drawPointLimit, maxStrokes: drawStrokeLimit },
}: {
  strokes: DrawStroke[];
  fills?: FayuFill[];
  layers?: DrawLayer[];
  enabled: boolean;
  showTools?: boolean;
  pending: boolean;
  round: number;
  act: (action: Action) => void;
  finish?: { action: Finish; label: string };
  draftKey: string;
  draftGame: string;
  completed?: boolean;
  history?: DrawingHistoryStatus;
  limits?: { maxFills: number; maxPoints: number; maxStrokes: number };
}) {
  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState(colors[0]!);
  const [width, setWidth] = useState(6);
  const [opacity, setOpacity] = useState(1);
  const [selectedLayer, setLayer] = useState(0);
  const layers = drawingLayers({ strokes, fills, layers: savedLayers });
  const activeLayer = layers.find(({ id }) => id === selectedLayer) ?? layers.at(-1)!;
  const layer = activeLayer.id;
  const [edits] = useState(() => openCanvasDraft(draftKey, draftGame));
  const [, refresh] = useState(0);
  const [rasterizing, setRasterizing] = useState(false);
  const [warning, setWarning] = useState("");
  const [sticker, setSticker] = useState("⭐");
  const [drawing, setDrawing] = useState(false);
  const draftRef = useRef<DrawStroke | null>(null);
  const [lasso, setLasso] = useState<DrawPoint[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [moving, setMoving] = useState<{ start: DrawPoint; current: DrawPoint } | null>(null);
  const [localStrokes, setLocalStrokes] = useState<DrawStroke[]>([]);
  const active = useRef<number>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const surface = useRef<CanvasSurface>();
  const fillJob = useRef<{ worker?: Worker }>();
  const latest = useRef({ strokes, fills, layers: savedLayers, history, pending, enabled, act });
  latest.current = { strokes, fills, layers: savedLayers, history, pending, enabled, act };
  const synchronizing = !completed && edits.busy;
  useEffect(() => {
    if (completed) edits.complete();
  }, [completed, edits]);
  useEffect(() => {
    if (!synchronizing) return;
    const timer = window.setInterval(() => {
      const snapshot = latest.current;
      const update = edits.step(snapshot, snapshot.enabled && !snapshot.pending, performance.now());
      if (!update) return;
      if (update.failed) setWarning("墨迹已保留，正在重试同步。");
      else setWarning((message) => message === "墨迹已保留，正在重试同步。" ? "" : message);
      if (update.action) snapshot.act(update.action);
      refresh((value) => value + 1);
    }, 35);
    return () => window.clearInterval(timer);
  }, [edits, synchronizing]);
  const sync = () => {
    setWarning("");
    refresh((value) => value + 1);
  };
  const editingBlocked = !enabled || pending || edits.busy || edits.finishing || rasterizing || drawing;
  const serverIds = new Set(strokes.map(({ id }) => id));
  const staged = edits.preview(strokes, fills, history?.lastEdit);
  const stagedIds = new Set(staged.map(({ id }) => id));
  const keptLocal = localStrokes.filter(({ id }) => !serverIds.has(id) && !stagedIds.has(id));
  const preview = keptLocal.length ? [...staged, ...keptLocal] : staged;
  useEffect(() => {
    setLocalStrokes((current) => {
      const live = current.filter(({ id }) => !serverIds.has(id));
      return live.length === current.length ? current : live;
    });
  }, [strokes]);
  useEffect(() => {
    if (!canvas.current) return;
    const painter = new CanvasSurface(canvas.current);
    surface.current = painter;
    return () => {
      fillJob.current?.worker?.terminate();
      fillJob.current = undefined;
      painter.dispose();
      surface.current = undefined;
    };
  }, []);
  useEffect(() => {
    surface.current?.schedule({
      strokes: preview,
      fills,
      layers: savedLayers,
      draft: draftRef.current,
      lasso,
      moving,
      selected,
    });
  }, [preview, fills, savedLayers, lasso, moving, selected, drawing]);

  const localPoint = (event: PointerEvent<HTMLCanvasElement>) =>
    canvasPoint(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
  const point = (event: PointerEvent<HTMLCanvasElement>): DrawPoint => {
    const [x, y] = localPoint(event);
    return [
      Math.min(surfaceWidth, Math.max(0, Math.round(x))),
      Math.min(surfaceHeight, Math.max(0, Math.round(y))),
    ];
  };

  const commitDraft = (end?: DrawPoint) => {
    const current = draftRef.current;
    draftRef.current = null;
    surface.current?.setDraft(null);
    setDrawing(false);
    if (!current) return;
    const freehand = current.tool === "brush" || current.tool === "eraser";
    const last = current.points.at(-1)!;
    const points = end
      ? freehand
        ? last[0] === end[0] && last[1] === end[1]
          ? current.points
          : [...current.points, end]
        : [current.points[0]!, end]
      : current.points;
    const rounded = points.map(([x, y]) => [Math.round(x), Math.round(y)] as DrawPoint);
    setLocalStrokes((items) => [...items, { ...current, points: rounded }]);
    enqueue({ ...current, points: rounded });
  };

  const cancelPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (active.current !== event.pointerId) return;
    active.current = undefined;
    if (draftRef.current) {
      commitDraft();
      return;
    }
    surface.current?.setDraft(null);
    setDrawing(false);
    setMoving(null);
    setLasso([]);
  };

  const floodFill = async (start: DrawPoint) => {
    const painter = surface.current;
    if (!painter) return;
    const snapshot = latest.current;
    const job: { worker?: Worker } = {};
    fillJob.current = job;
    setRasterizing(true);
    const end = (warning?: string) => {
      if (fillJob.current !== job) return;
      job.worker?.terminate();
      fillJob.current = undefined;
      setRasterizing(false);
      if (warning) setWarning(warning);
    };
    try {
      const frame = await painter.pixels(snapshot);
      if (fillJob.current !== job) return;
      if (!frame) return end("无法读取画布，请重试。");
      const worker = new Worker(new URL("./canvas-fill-worker.ts", import.meta.url), { type: "module" });
      job.worker = worker;
      worker.onmessage = ({ data }: MessageEvent<number[] | null>) => {
        if (fillJob.current !== job) return;
        const current = latest.current;
        if (!current.enabled || current.history?.revision !== snapshot.history?.revision) {
          return end("画布已变化，请重新填充。");
        }
        if (!data) return end("填充区域过于复杂，请缩小范围后重试。");
        if (data.length) {
          edits.add({ type: "draw-region", round, layer, region: { color, runs: data } });
          sync();
        }
        end();
      };
      worker.onerror = () => end("填充失败，请重试。");
      worker.postMessage({
        rgba: frame.data,
        width: frame.width,
        height: frame.height,
        start: [Math.min(frame.width - 1, start[0]), Math.min(frame.height - 1, start[1])],
      }, [frame.data.buffer]);
    } catch {
      end("填充失败，请重试。");
    }
  };

  const enqueue = (stroke: Omit<DrawStroke, "nextPart">) => {
    const staged = edits.preview(latest.current.strokes, latest.current.fills, latest.current.history?.lastEdit);
    const remaining = limits.maxPoints - staged.reduce((sum, item) => sum + item.points.length, 0);
    if (staged.length >= limits.maxStrokes || remaining <= 0) {
      setWarning("画布已满，可以撤销或清空一层。");
      return;
    }
    const points = stroke.points.length > remaining
      ? Array.from({ length: remaining }, (_, index) => stroke.points[Math.round(index * (stroke.points.length - 1) / Math.max(1, remaining - 1))]!)
      : stroke.points;
    edits.add({ ...stroke, type: "draw-stroke", round, part: 0, points });
    sync();
    if (stroke.points.length > remaining) setWarning("画布已满，最后一笔已压缩采样。");
  };

  const canUndo = enabled && !rasterizing && !drawing && !edits.finishing && (!!history?.undo || edits.undoQueued);
  const canRedo = !editingBlocked && !!history?.redo;

  return (
    <div className="fayu-canvas-wrap" onKeyDown={(event) => {
      if (event.target instanceof HTMLInputElement || (!event.metaKey && !event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      const redo = key === "y" || (key === "z" && event.shiftKey);
      if ((key === "z" || redo) && (redo ? canRedo : canUndo)) {
        event.preventDefault();
        event.stopPropagation();
        edits.restore(redo ? "redo" : "undo", round);
        sync();
      }
    }}>
      <canvas
        ref={canvas}
        className="fayu-canvas"
        width={surfaceWidth}
        height={surfaceHeight}
        role="img"
        tabIndex={enabled ? 0 : undefined}
        aria-label="绘画画布"
        data-draw-active={enabled}
        onPointerDown={(event) => {
          if (!enabled || edits.finishing || fillJob.current || edits.changingLayers || active.current !== undefined || event.button !== 0)
            return;
          if (activeLayer.hidden) {
            setWarning("请先显示当前图层。");
            return;
          }
          const [x, y] = localPoint(event);
          if (x < 0 || x > surfaceWidth || y < 0 || y > surfaceHeight) return;
          const start = point(event);
          event.currentTarget.focus({ preventScroll: true });
          if (tool === "select") {
            if (editingBlocked) return;
            active.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            const bounds = selectionBounds(preview, selected);
            if (bounds && x >= bounds.left - 9 && x <= bounds.right + 9 && y >= bounds.top - 9 && y <= bounds.bottom + 9) {
              setMoving({ start, current: start });
            } else {
              setLasso([start]);
              setSelected([]);
            }
            return;
          }
          if (tool === "fill") {
            if (editingBlocked) return;
            if (fills.length >= limits.maxFills) {
              setWarning("填充已达本轮上限。");
              return;
            }
            floodFill(start);
            return;
          }
          if (tool === "sticker") {
            enqueue({
              id: randomId(),
              ink: "ink",
              points: [start],
              tool: "sticker",
              text: sticker,
              width: 12,
              opacity: 1,
              layer,
              color,
            });
            return;
          }
          active.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          draftRef.current = { id: randomId(), nextPart: 1, order: nextCanvasOrder(preview, fills), ink: tool === "eraser" ? "erase" : "ink", points: [start], tool, color, width, opacity, layer };
          surface.current?.setDraft(draftRef.current);
          setDrawing(true);
        }}
        onPointerMove={(event) => {
          if (active.current !== event.pointerId) return;
          if (tool === "select") {
            if (moving) setMoving({ ...moving, current: point(event) });
            else {
              const target = point(event);
              setLasso((path) => {
                const last = path.at(-1);
                return last && Math.hypot(target[0] - last[0], target[1] - last[1]) >= 3 ? [...path, target] : path;
              });
            }
            return;
          }
          const current = draftRef.current;
          if (!current) return;
          if (current.tool === "brush" || current.tool === "eraser") {
            const raw = event.nativeEvent.getCoalescedEvents?.() ?? [];
            const samples = raw.length ? raw : [event.nativeEvent];
            const rect = event.currentTarget.getBoundingClientRect();
            for (const sample of samples) {
              const [x, y] = canvasPoint(rect, sample.clientX, sample.clientY);
              const target: DrawPoint = [
                Math.min(surfaceWidth, Math.max(0, x)),
                Math.min(surfaceHeight, Math.max(0, y)),
              ];
              const last = current.points.at(-1)!;
              if (Math.hypot(target[0] - last[0], target[1] - last[1]) >= 1.2 &&
                  current.points.length < limits.maxPoints) current.points.push(target);
            }
          } else current.points = [current.points[0]!, point(event)];
          surface.current?.setDraft(current);
        }}
        onPointerUp={(event) => {
          if (active.current !== event.pointerId) return;
          active.current = undefined;
          if (tool === "select") {
            if (moving) {
              const [x, y] = point(event);
              const [dx, dy] = selectionDelta(preview, selected, x - moving.start[0], y - moving.start[1]);
              if (dx || dy) {
                edits.add({ type: "draw-move-selection", round, ids: selected, dx, dy });
                sync();
              }
              setMoving(null);
              return;
            }
            const polygon = [...lasso, point(event)];
            setSelected(polygon.length >= 3 ? preview
              .filter((stroke) => (stroke.layer ?? 0) === layer && lassoHits(stroke, polygon))
              .map((stroke) => stroke.id) : []);
            setLasso([]);
            return;
          }
          commitDraft(point(event));
        }}
        onPointerCancel={cancelPointer}
        onLostPointerCapture={cancelPointer}
      />
      {showTools && (
        <div className="fayu-tools" aria-label="画板工具">
          <div className="fayu-tool-group" data-label="工具">
            {(["brush", "eraser"] as const).map((item) => (
              <button key={item} type="button" className="fayu-tool" data-active={tool === item} aria-pressed={tool === item} aria-label={toolNames[item]} title={toolNames[item]} onClick={() => { setTool(item); setLasso([]); setSelected([]); }}>
                <span aria-hidden="true">{toolIcons[item]}</span>
              </button>
            ))}
          </div>
          <div className="fayu-tool-group" data-label="操作">
            <button type="button" disabled={!canUndo} onClick={() => { edits.restore("undo", round); sync(); }}>撤销</button>
            <button type="button" disabled={!canRedo} onClick={() => { edits.restore("redo", round); sync(); }}>重做</button>
          </div>
          <div className="fayu-tool-group fayu-colors" data-label="颜色">
            {colors.map((item, index) => (
              <button key={item} type="button" className="fayu-color" style={{ backgroundColor: item }} aria-label={`颜色 ${index + 1}`} data-active={color === item} aria-pressed={color === item} onClick={() => { setColor(item); if (tool === "eraser") setTool("brush"); }} />
            ))}
            <input aria-label="自定义颜色" type="color" value={color} onChange={(event) => { setColor(event.target.value); if (tool === "eraser") setTool("brush"); }} />
          </div>
          <div className="fayu-tool-group" data-label="笔刷">
            <div className="fayu-range">
              <span>粗细 <output>{width}</output></span>
              <Slider aria-label="笔宽" min={2} max={40} step={1} value={width} onValueChange={setWidth} />
            </div>
            <div className="fayu-range">
              <span>透明度 <output>{Math.round(opacity * 100)}%</output></span>
              <Slider aria-label="透明度" min={0.15} max={1} step={0.05} value={opacity} onValueChange={setOpacity} />
            </div>
            <svg className="fayu-brush-preview" width="48" height="44" aria-label="笔刷预览">
              <line x1="10" x2="38" y1="22" y2="22" stroke={tool === "eraser" ? "#a19a8a" : color} strokeWidth={width} strokeOpacity={tool === "eraser" ? 1 : opacity} strokeLinecap="round" />
            </svg>
          </div>
          <details className="fayu-advanced">
            <summary>{tool === "brush" || tool === "eraser" ? "更多工具" : `更多工具 · ${toolNames[tool]}`}</summary>
            <div className="fayu-advanced-controls">
              <div className="fayu-tool-group" data-label="工具">
                {(["line", "rect", "ellipse", "sticker", "select", "fill"] as const).map((item) => (
                  <button key={item} type="button" className="fayu-tool" data-active={tool === item} aria-pressed={tool === item} aria-label={toolNames[item]} title={toolNames[item]} onClick={() => { setTool(item); setLasso([]); setSelected([]); }}>
                    <span aria-hidden="true">{toolIcons[item]}</span>
                  </button>
                ))}
              </div>
          {tool === "sticker" && (
            <div className="fayu-tool-group" data-label="贴纸">
              {["⭐", "❤️", "😂", "🔥", "🌈", "🍀", "💩", "🐱", "🍕", "🎈"].map((item) => (
                <button key={item} type="button" className="fayu-sticker" data-active={sticker === item} aria-pressed={sticker === item} aria-label={`贴纸 ${item}`} onClick={() => setSticker(item)}>{item}</button>
              ))}
            </div>
          )}
          <DrawingLayersControl
            layers={layers}
            active={activeLayer}
            select={(id) => { setLayer(id); setSelected([]); setLasso([]); }}
            change={(move) => { edits.add({ type: "draw-layer", round, move }); setSelected([]); sync(); }}
            clear={() => { edits.add({ type: "draw-clear", round, layer }); setSelected([]); sync(); }}
            disabled={editingBlocked}
            canClear={strokes.some((stroke) => (stroke.layer ?? 0) === layer) || fills.some((fill) => fill.layer === layer)}
          />
          <div className="fayu-tool-group" data-label="操作">
            {selected.length > 0 && (
              <button type="button" disabled={editingBlocked} onClick={() => { edits.add({ type: "draw-delete", round, ids: selected }); setSelected([]); setLasso([]); sync(); }}>删除所选</button>
            )}
            <button type="button" disabled={editingBlocked} onClick={() => downloadDrawing(surface.current)}>导出</button>
          </div>
            </div>
          </details>
        </div>
      )}
      {warning && <small role="status">{warning}</small>}
      {edits.needsRetry && enabled && <Button type="button" onClick={() => { edits.retry(); sync(); }}>重试同步</Button>}
      {finish && (
        <div className="fayu-actions">
          <Button
            type="button"
            disabled={!enabled || (pending && !edits.busy) || edits.finishing || rasterizing || drawing || active.current !== undefined}
            onClick={() => { edits.finish(finish.action); sync(); }}
          >{edits.finishing ? "正在同步墨迹…" : finish.label}</Button>
        </div>
      )}
    </div>
  );
}

function downloadDrawing(surface: CanvasSurface | undefined) {
  if (!surface) return;
  const anchor = document.createElement("a");
  anchor.download = "drawing.png";
  anchor.href = surface.toDataURL();
  anchor.click();
}
