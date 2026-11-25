import type { DrawingHistoryStatus } from "../../domain/drawguess/canvas-history";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { v4 as randomId } from "uuid";
import type { Action } from "../../domain/types";
import { drawFillLimit, drawLayerLimit, drawPointLimit, drawStrokeLimit, type DrawPoint, type DrawStroke } from "../../domain/drawguess/types";
import { nextCanvasOrder } from "../../domain/drawguess/canvas-order";
import { Button, Slider } from "../ui/Controls";
import { CanvasEdits, strokePackets } from "./canvas-edits";
import { FayuLayers } from "./FayuDrawing";
import type { FayuFill } from "../../domain/fayu/types";

const colors = ["#2f2a24", "#3778c2", "#c94b45", "#3f8a5b", "#c58a2e", "#7a5bb5", "#e67e22", "#fbf6ea"];
type Finish = Extract<Action, { type: "draw-finish" | "draw-next" }>;
type Tool = "brush" | "eraser" | "line" | "rect" | "ellipse" | "text" | "sticker" | "select" | "fill";
const toolNames: Record<Tool, string> = { brush: "画笔", eraser: "橡皮", line: "直线", rect: "矩形", ellipse: "椭圆", text: "文字", sticker: "贴纸", select: "套索", fill: "油漆桶" };
const toolIcons: Record<Tool, string> = { brush: "✎", eraser: "✧", line: "╱", rect: "▭", ellipse: "◯", text: "T", sticker: "⭐", select: "◌", fill: "▨" };

export function FayuCanvas({
  strokes,
  fills = [],
  enabled,
  showTools = true,
  pending,
  round,
  act,
  finish,
  edits: providedEdits,
  history,
  limits = { maxFills: drawFillLimit, maxPoints: drawPointLimit, maxStrokes: drawStrokeLimit },
}: {
  strokes: DrawStroke[];
  fills?: FayuFill[];
  enabled: boolean;
  showTools?: boolean;
  pending: boolean;
  round: number;
  act: (action: Action) => void;
  finish?: { action: Finish; label: string };
  edits?: CanvasEdits;
  history?: DrawingHistoryStatus;
  limits?: { maxFills: number; maxPoints: number; maxStrokes: number };
}) {
  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState(colors[0]!);
  const [width, setWidth] = useState(6);
  const [opacity, setOpacity] = useState(1);
  const [layer, setLayer] = useState(0);
  const [visibleLayers, setLayerCount] = useState(3);
  const layerCount = Math.max(visibleLayers, ...strokes.map(({ layer }) => (layer ?? 0) + 1), ...fills.map(({ layer }) => layer + 1));
  const [layerNames, setLayerNames] = useState(["底层", "中层", "顶层"]);
  const [edits] = useState(() => providedEdits ?? new CanvasEdits());
  const [, refresh] = useState(0);
  const [rasterizing, setRasterizing] = useState(false);
  const [warning, setWarning] = useState("");
  const [sticker, setSticker] = useState("⭐");
  const [draft, setDraft] = useState<{ points: DrawPoint[]; tool: Tool; color: string; width: number; opacity: number; layer: number } | null>(null);
  const draftRef = useRef<typeof draft>(null);
  const [lasso, setLasso] = useState<DrawPoint[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [moving, setMoving] = useState<{ start: DrawPoint; current: DrawPoint } | null>(null);
  const active = useRef<number>();
  const svg = useRef<SVGSVGElement>(null);
  const latest = useRef({ strokes, fills, history, pending, enabled, act });
  latest.current = { strokes, fills, history, pending, enabled, act };
  const synchronizing = enabled && (edits.busy || edits.finishing);
  useEffect(() => {
    if (!synchronizing) return;
    const timer = window.setInterval(() => {
      const snapshot = latest.current;
      const update = edits.step(snapshot, snapshot.enabled && !snapshot.pending, performance.now());
      if (!update) return;
      if (update.failed) setWarning("画板同步失败，请检查最后几笔后再提交。");
      if (update.action) snapshot.act(update.action);
      refresh((value) => value + 1);
    }, 35);
    return () => window.clearInterval(timer);
  }, [edits, synchronizing]);
  const sync = () => {
    setWarning("");
    refresh((value) => value + 1);
  };
  const editingBlocked = !enabled || pending || edits.busy || edits.finishing || rasterizing || !!draft;
  const preview = edits.preview(strokes, fills);

  const point = (event: PointerEvent<SVGSVGElement>): DrawPoint => {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return [0, 0];
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    return [
      Math.min(1000, Math.max(0, Math.round(local.x))),
      Math.min(625, Math.max(0, Math.round(local.y))),
    ];
  };

  const insidePaper = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return false;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return local.x >= 0 && local.x <= 1000 && local.y >= 0 && local.y <= 625;
  };

  const floodFill = (start: DrawPoint) => {
    const source = svg.current;
    if (!source) return;
    const clone = source.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const data = new XMLSerializer().serializeToString(clone);
    const image = new Image();
    setRasterizing(true);
    image.onerror = () => {
      setRasterizing(false);
      setWarning("填充失败，请重试。");
    };
    image.onload = () => {
      setRasterizing(false);
      const canvas = document.createElement("canvas");
      canvas.width = 500;
      canvas.height = 312;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, 500, 312);
      const frame = context.getImageData(0, 0, 500, 312);
      const pixels = frame.data;
      const { width, height } = canvas;
      const sx = Math.min(width - 1, Math.floor((start[0] * width) / 1000));
      const sy = Math.min(height - 1, Math.floor((start[1] * height) / 625));
      const index = (sy * width + sx) * 4;
      const base = [pixels[index]!, pixels[index + 1]!, pixels[index + 2]!, pixels[index + 3]!];
      if (base[3] === 0) return;
      const replacement = [...parseColor(color), 255];
      const filled = context.createImageData(width, height);
      const tolerance = 28;
      const stack = [[sx, sy] as [number, number]];
      const visited = new Uint8Array(width * height);
      while (stack.length) {
        const [x, y] = stack.pop()!;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const at = y * width + x;
        if (visited[at]) continue;
        visited[at] = 1;
        const offset = at * 4;
        if (
          Math.abs(pixels[offset]! - base[0]!) > tolerance ||
          Math.abs(pixels[offset + 1]! - base[1]!) > tolerance ||
          Math.abs(pixels[offset + 2]! - base[2]!) > tolerance
        )
          continue;
        filled.data.set(replacement, offset);
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      context.putImageData(filled, 0, 0);
      edits.add([{
        type: "draw-fill",
        round,
        layer,
        data: canvas.toDataURL("image/png"),
      }]);
      sync();
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;
  };

  const enqueue = (stroke: Omit<DrawStroke, "nextPart">) => {
    const staged = edits.preview(latest.current.strokes, latest.current.fills);
    const remaining = limits.maxPoints - staged.reduce((sum, item) => sum + item.points.length, 0);
    if (staged.length >= limits.maxStrokes || remaining <= 0) {
      setWarning("画布已满，可以撤销或清空一层。");
      return;
    }
    edits.add(strokePackets(round, { ...stroke, points: stroke.points.slice(0, remaining) }));
    sync();
    if (stroke.points.length > remaining) setWarning("画布已满，最后一笔已达到可保存长度。");
  };

  return (
    <div className="fayu-canvas-wrap">
      <svg
        ref={svg}
        className="fayu-canvas"
        viewBox="0 0 1000 625"
        role="img"
        aria-label="绘画画布"
        data-draw-active={enabled}
        onPointerDown={(event) => {
          if (!enabled || edits.finishing || rasterizing || active.current !== undefined || event.button !== 0)
            return;
          if (!insidePaper(event)) return;
          const start = point(event);
          if (tool === "select") {
            if (editingBlocked) return;
            if (selected.length && lasso.length >= 3 && insidePolygon(start, lasso)) {
              active.current = event.pointerId;
              setMoving({ start, current: start });
              event.currentTarget.setPointerCapture(event.pointerId);
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
          if (tool === "text") {
            const text = window.prompt("输入文字");
            if (text?.trim()) {
              enqueue({
                id: randomId(),
                ink: "ink",
                points: [start],
                tool: "text",
                text: text.trim().slice(0, 40),
                color,
                width,
                opacity,
                layer,
              });
            }
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
          draftRef.current = { points: [start], tool, color, width, opacity, layer };
          setDraft(draftRef.current);
        }}
        onPointerMove={(event) => {
          if (tool === "select") {
            if (moving) setMoving({ ...moving, current: point(event) });
            else if (lasso.length) setLasso([...lasso, point(event)]);
            return;
          }
          const current = draftRef.current;
          if (active.current !== event.pointerId || !current) return;
          const raw = event.nativeEvent.getCoalescedEvents?.() ?? [];
          const samples = raw.length ? raw : [event.nativeEvent];
          if (current.tool === "brush" || current.tool === "eraser") {
            const points = [...current.points];
            for (const sample of samples) {
              const matrix = event.currentTarget.getScreenCTM();
              if (!matrix) break;
              const local = new DOMPoint(sample.clientX, sample.clientY).matrixTransform(matrix.inverse());
              const target: DrawPoint = [
                Math.min(1000, Math.max(0, local.x)),
                Math.min(625, Math.max(0, local.y)),
              ];
              const last = points.at(-1)!;
              const smoothed: DrawPoint = [
                last[0] + (target[0] - last[0]) * 0.62,
                last[1] + (target[1] - last[1]) * 0.62,
              ];
              if (Math.hypot(smoothed[0] - last[0], smoothed[1] - last[1]) < 1.2) continue;
              if (points.length >= limits.maxPoints) break;
              points.push(smoothed);
            }
            if (points.length === current.points.length) return;
            draftRef.current = { ...current, points };
          } else {
            draftRef.current = { ...current, points: [current.points[0]!, point(event)] };
          }
          setDraft(draftRef.current);
        }}
        onPointerUp={(event) => {
          if (tool === "select") {
            if (moving) {
              active.current = undefined;
              const [x, y] = point(event);
              const dx = x - moving.start[0];
              const dy = y - moving.start[1];
              if (strokes.some((stroke) => selected.includes(stroke.id) && stroke.points.some(([px, py]) =>
                Math.min(1000, Math.max(0, px + dx)) !== px || Math.min(625, Math.max(0, py + dy)) !== py
              ))) {
                edits.add([{ type: "draw-transform", round, ids: selected, dx, dy }]);
                sync();
              }
              setMoving(null);
              return;
            }
            if (lasso.length >= 3) {
              const hit = strokes
                .filter((stroke) => stroke.points.some((sample) => insidePolygon(sample, lasso)))
                .map((stroke) => stroke.id);
              setSelected(hit);
            } else setLasso([]);
            return;
          }
          if (active.current !== event.pointerId) return;
          active.current = undefined;
          const current = draftRef.current;
          draftRef.current = null;
          setDraft(null);
          if (!current) return;
          const end = point(event);
          const freehand = current.tool === "brush" || current.tool === "eraser";
          const last = current.points.at(-1)!;
          const points = freehand
            ? last[0] === end[0] && last[1] === end[1]
              ? current.points
              : [...current.points, end]
            : [current.points[0]!, end];
          enqueue({
            ...current,
            id: randomId(),
            ink: current.tool === "eraser" ? "erase" : "ink",
            points: points.map(([x, y]) => [
              Math.round(x),
              Math.round(y),
            ]),
          });
        }}
        onLostPointerCapture={(event) => {
          if (active.current !== event.pointerId) return;
          active.current = undefined;
          draftRef.current = null;
          setDraft(null);
          setMoving(null);
        }}
      >
        <rect width="1000" height="625" fill="#fbf6ea" />
        <FayuLayers
          fills={fills}
          strokes={[
            ...(moving ? preview.map((stroke) => selected.includes(stroke.id)
              ? { ...stroke, points: stroke.points.map(([x, y]) => [
                x + moving.current[0] - moving.start[0],
                y + moving.current[1] - moving.start[1],
              ] as DrawPoint) }
              : stroke) : preview),
            ...(draft ? [{
              ...draft,
              id: "draft",
              ink: (draft.tool === "eraser" ? "erase" : "ink") as "erase" | "ink",
              nextPart: 1,
              order: nextCanvasOrder(preview, fills),
            }] : []),
          ]}
        />
        {lasso.length > 1 && (
          <polyline
            points={lasso.map((sample) => sample.join(",")).join(" ")}
            fill="rgb(255 255 255 / 0.08)"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeDasharray="8 6"
            pointerEvents="none"
          />
        )}
      </svg>
      {showTools && (
        <div className="fayu-tools" aria-label="画板工具">
          <div className="fayu-tool-group" data-label="工具">
            {(["brush", "eraser", "line", "rect", "ellipse", "text", "sticker", "select", "fill"] as Tool[]).map((item) => (
              <button key={item} type="button" className="fayu-tool" data-active={tool === item} aria-pressed={tool === item} aria-label={toolNames[item]} title={toolNames[item]} onClick={() => { setTool(item); setLasso([]); setSelected([]); }}>
                <span aria-hidden="true">{toolIcons[item]}</span>
              </button>
            ))}
          </div>
          <div className="fayu-tool-group" data-label="颜色">
            {colors.map((item, index) => (
              <button key={item} type="button" className="fayu-color" style={{ backgroundColor: item }} aria-label={`颜色 ${index + 1}`} data-active={color === item} aria-pressed={color === item} onClick={() => { setColor(item); if (tool === "eraser") setTool("brush"); }} />
            ))}
            <input aria-label="自定义颜色" type="color" value={color} onChange={(event) => { setColor(event.target.value); if (tool === "eraser") setTool("brush"); }} />
          </div>
          <div className="fayu-tool-group" data-label="笔刷">
            <div className="fayu-range">
              <span>笔宽 <output>{width}</output></span>
              <Slider aria-label="笔宽" min={2} max={40} step={1} value={width} onValueChange={setWidth} />
            </div>
            <div className="fayu-range">
              <span>透明度 <output>{Math.round(opacity * 100)}%</output></span>
              <Slider aria-label="透明度" min={0.15} max={1} step={0.05} value={opacity} onValueChange={setOpacity} />
            </div>
            <svg className="fayu-brush-preview" width="48" height="44" aria-label="笔刷预览">
              <line x1="10" x2="38" y1="22" y2="22" stroke={tool === "eraser" ? "#a19a8a" : color} strokeWidth={width * 0.66} strokeOpacity={opacity} strokeLinecap="round" />
            </svg>
          </div>
          {tool === "sticker" && (
            <div className="fayu-tool-group" data-label="贴纸">
              {["⭐", "❤️", "😂", "🔥", "🌈", "🍀", "💩", "🐱", "🍕", "🎈"].map((item) => (
                <button key={item} type="button" className="fayu-sticker" data-active={sticker === item} aria-pressed={sticker === item} aria-label={`贴纸 ${item}`} onClick={() => setSticker(item)}>{item}</button>
              ))}
            </div>
          )}
          <div className="fayu-tool-group" data-label="图层">
            {Array.from({ length: layerCount }, (_, item) => item).map((item) => (
              <button key={item} type="button" className="fayu-layer" data-active={layer === item} aria-pressed={layer === item} aria-label={`图层 ${(layerNames[item] ?? `图层 ${item + 1}`)}`} title={`${(layerNames[item] ?? `图层 ${item + 1}`)}（双击重命名）`} onClick={() => setLayer(item)} onDoubleClick={() => { const name = window.prompt("图层名称", (layerNames[item] ?? `图层 ${item + 1}`)); if (name?.trim()) { const next = [...layerNames]; next[item] = name.trim().slice(0, 8); setLayerNames(next); } }}>{item + 1}</button>
            ))}
            <button type="button" aria-label="新增图层" disabled={layerCount >= drawLayerLimit} onClick={() => { setLayerCount(layerCount + 1); setLayer(layerCount); }}>+</button>
            <button type="button" aria-label="删除图层" disabled={editingBlocked || layerCount <= 1 || layer !== layerCount - 1 || strokes.some((stroke) => (stroke.layer ?? 0) === layer) || fills.some((fill) => fill.layer === layer)} onClick={() => { const next = layerNames.filter((_, index) => index !== layer); setLayerCount(layerCount - 1); setLayerNames(next.length ? next : ["底层"]); setLayer(Math.max(0, layer - 1)); }}>−</button>
          </div>
          <div className="fayu-tool-group" data-label="操作">
            <button type="button" disabled={!enabled || rasterizing || !!draft || edits.finishing || (!history?.undo && !edits.busy)} onClick={() => { edits.restore("undo", round); sync(); }}>撤销</button>
            <button type="button" disabled={editingBlocked || !history?.redo} onClick={() => { edits.restore("redo", round); sync(); }}>重做</button>
            <button type="button" disabled={editingBlocked || (!strokes.some((stroke) => (stroke.layer ?? 0) === layer) && !fills.some((fill) => fill.layer === layer))} onClick={() => { if (window.confirm("清空当前层？")) { edits.add([{ type: "draw-clear", round, layer }]); setSelected([]); setLasso([]); sync(); } }}>清空层</button>
            {selected.length > 0 && (
              <button type="button" disabled={editingBlocked} onClick={() => { edits.add([{ type: "draw-delete", round, ids: selected }]); setSelected([]); setLasso([]); sync(); }}>删除所选</button>
            )}
            <button type="button" disabled={editingBlocked} onClick={() => downloadDrawing(strokes, svg.current)}>导出</button>
          </div>
        </div>
      )}
      {warning && <small role="status">{warning}</small>}
      {finish && (
        <div className="fayu-actions">
          <Button
            type="button"
            disabled={!enabled || (pending && !edits.busy) || edits.finishing || rasterizing || !!draft}
            onClick={() => { edits.finish(finish.action); sync(); }}
          >{edits.finishing ? "正在同步墨迹…" : finish.label}</Button>
        </div>
      )}
    </div>
  );
}

function parseColor(value: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return [47, 42, 36];
  const number = parseInt(match[1]!, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function insidePolygon(point: DrawPoint, polygon: DrawPoint[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, yi] = polygon[index]!;
    const [xj, yj] = polygon[previous]!;
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function downloadDrawing(strokes: DrawStroke[], svg: SVGSVGElement | null) {
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll(".fayu-tools").forEach((node) => node.remove());
  const data = new XMLSerializer().serializeToString(clone);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 625;
    canvas.getContext("2d")!.drawImage(image, 0, 0);
    const anchor = document.createElement("a");
    anchor.download = "fayu-drawing.png";
    anchor.href = canvas.toDataURL("image/png");
    anchor.click();
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;
  void strokes;
}
