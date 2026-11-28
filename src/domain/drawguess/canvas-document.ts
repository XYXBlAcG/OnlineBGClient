import { z } from "zod";
import type { Action } from "../actions";
import type { Drawing } from "./canvas-history";
import { moveSelection } from "./canvas-selection";
import { nextCanvasOrder } from "./canvas-order";
import { drawRegionSchema } from "./canvas-region";
import { drawHeight, drawWidth, drawStrokeLimit, drawLayerLimit, type DrawLayer } from "./types";

const round = z.number().int().min(0).max(999);
const layerId = z.number().int().min(0).max(drawLayerLimit - 1);
export const drawLayerSchema = z.object({
  type: z.literal("draw-layer"),
  round,
  move: z.discriminatedUnion("type", [
    z.object({ type: z.literal("add"), layer: layerId }),
    z.object({ type: z.literal("rename"), layer: layerId, name: z.string().trim().min(1).max(12) }),
    z.object({ type: z.literal("move"), layer: layerId, by: z.union([z.literal(-1), z.literal(1)]) }),
    z.object({ type: z.literal("visibility"), layer: layerId, hidden: z.boolean() }),
    z.object({ type: z.literal("remove"), layer: layerId }),
  ]),
});

export const drawMoveSelectionSchema = z.object({
  type: z.literal("draw-move-selection"),
  round,
  ids: z.array(z.string().min(1).max(36)).min(1).max(drawStrokeLimit),
  dx: z.number().int().min(-drawWidth).max(drawWidth),
  dy: z.number().int().min(-drawHeight).max(drawHeight),
});

export const drawRegionActionSchema = z.object({ type: z.literal("draw-region"), round, layer: layerId, region: drawRegionSchema });

const layerNames = ["底层", "中层", "顶层"];

export function drawingLayers({ layers, strokes, fills }: Drawing): DrawLayer[] {
  if (layers) return layers;
  const count = Math.min(drawLayerLimit, Math.max(3, ...strokes.map(({ layer }) => (layer ?? 0) + 1), ...fills.map(({ layer }) => layer + 1)));
  return Array.from({ length: count }, (_, id) => ({ id, name: layerNames[id] ?? `图层 ${id + 1}` }));
}

export function applyDrawingDocument(drawing: Drawing, action: Action, maxFills: number, fillId: () => string): Drawing | undefined {
  if (action.type === "draw-move-selection") {
    if (action.ids.some((id) => !drawing.strokes.some((stroke) => stroke.id === id))) throw new Error("选中的笔画不存在");
    return { ...drawing, strokes: moveSelection(drawing.strokes, action.ids, action.dx, action.dy) };
  }
  if (action.type !== "draw-layer" && action.type !== "draw-region") return;
  const layers = drawingLayers(drawing);
  if (action.type === "draw-region") {
    if (!layers.some(({ id, hidden }) => id === action.layer && !hidden)) throw new Error("请选择可见图层");
    if (drawing.fills.length >= maxFills) throw new Error("填充次数已用完");
    return { ...drawing, fills: [...drawing.fills, { id: fillId(), layer: action.layer, order: nextCanvasOrder(drawing.strokes, drawing.fills), region: action.region }] };
  }
  const { move } = action;
  const index = layers.findIndex(({ id }) => id === move.layer);
  if (move.type === "add") {
    if (index >= 0 || layers.length >= drawLayerLimit) throw new Error("图层已存在或已达到上限");
    return { ...drawing, layers: [...layers, { id: move.layer, name: `图层 ${move.layer + 1}` }] };
  }
  const layer = layers[index];
  if (!layer) throw new Error("图层不存在");
  if (move.type === "remove") {
    if (layers.length === 1) throw new Error("请保留至少一个图层");
    return {
      layers: layers.filter(({ id }) => id !== layer.id),
      strokes: drawing.strokes.filter(({ layer: id }) => (id ?? 0) !== layer.id),
      fills: drawing.fills.filter(({ layer: id }) => id !== layer.id),
    };
  }
  const next = [...layers];
  if (move.type === "move") {
    const target = index + move.by;
    if (target < 0 || target >= layers.length) return drawing;
    [next[index], next[target]] = [next[target]!, next[index]!];
  } else if (move.type === "rename") {
    if (move.name === layer.name) return drawing;
    next[index] = { ...layer, name: move.name };
  } else {
    if (!!layer.hidden === move.hidden) return drawing;
    next[index] = { ...layer, hidden: move.hidden };
  }
  return { ...drawing, layers: next };
}
