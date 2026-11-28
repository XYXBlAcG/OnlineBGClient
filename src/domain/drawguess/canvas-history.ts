import type { Action } from "../actions";
import type { DrawFill, DrawLayer, DrawStroke } from "./types";

export interface Drawing {
  strokes: DrawStroke[];
  fills: DrawFill[];
  layers?: DrawLayer[];
}

export interface DrawingHistoryStatus {
  revision: number;
  undo: number;
  redo: number;
  lastEdit?: string;
}

export interface DrawingHistory {
  round: number;
  revision: number;
  lastEdit?: string;
  undo: Drawing[];
  redo: Drawing[];
}

export function drawingHistoryStatus(history: DrawingHistory | undefined, round: number): DrawingHistoryStatus {
  return history?.round === round
    ? { revision: history.revision, undo: history.undo.length, redo: history.redo.length, ...(history.lastEdit ? { lastEdit: history.lastEdit } : {}) }
    : { revision: 0, undo: 0, redo: 0 };
}

export function editDrawingHistory(
  previous: DrawingHistory | undefined,
  round: number,
  action: Action,
  before: Drawing,
  apply: () => Drawing,
): { history: DrawingHistory; drawing: Drawing } | undefined {
  if (action.type !== "draw-history" && action.type !== "draw-stroke" &&
      action.type !== "draw-clear" && action.type !== "draw-delete" &&
      action.type !== "draw-transform" && action.type !== "draw-fill" &&
      action.type !== "draw-restore" && action.type !== "draw-undo" &&
      action.type !== "draw-layer" && action.type !== "draw-region" && action.type !== "draw-move-selection") return;
  const history = previous?.round === round ? previous : { round, revision: 0, undo: [], redo: [] };
  const revision = history.revision + 1;
  if (action.type === "draw-history") {
    const { direction } = action;
    const drawing = history[direction].at(-1);
    if (!drawing) throw new Error(direction === "undo" ? "没有可撤销的操作" : "没有可重做的操作");
    const opposite = direction === "undo" ? "redo" : "undo";
    return {
      drawing,
      history: { ...history, revision, [direction]: history[direction].slice(0, -1), [opposite]: [...history[opposite], before] },
    };
  }
  const drawing = apply();
  const changed = drawing.layers !== before.layers || drawing.strokes.length !== before.strokes.length || drawing.fills.length !== before.fills.length ||
    drawing.strokes.some((stroke, i) => {
      const old = before.strokes[i]!;
      return stroke !== old && (action.type !== "draw-transform" ||
        stroke.points.some(([x, y], point) => x !== old.points[point]?.[0] || y !== old.points[point]?.[1]));
    });
  const save = changed && (action.type !== "draw-stroke" || action.part === 0);
  return { drawing, history: save
    ? { round, revision, undo: [...history.undo.slice(-29), before], redo: [] }
    : { ...history, revision } };
}
