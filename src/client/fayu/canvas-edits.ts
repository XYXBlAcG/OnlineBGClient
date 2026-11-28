import { v4 as randomId } from "uuid";
import { drawEditPayloadSchema, drawEditSchema, type Action, type DrawEdit } from "../../domain/actions";
import type { Drawing, DrawingHistoryStatus } from "../../domain/drawguess/canvas-history";
import { moveSelection } from "../../domain/drawguess/canvas-selection";
import { nextCanvasOrder } from "../../domain/drawguess/canvas-order";

type Snapshot = Drawing & { history?: DrawingHistoryStatus };
type Envelope = Extract<Action, { type: "draw-edit" }>;
type Finish = Extract<DrawEdit, { type: "draw-finish" | "draw-next" }>;
type Queued = { id: string; edit: DrawEdit; revision?: number };

export class CanvasEdits {
  private queue: Queued[];
  private sentAt: number | undefined;
  private stalled = false;

  constructor(initial?: unknown, private readonly save?: (state: Queued[]) => void) {
    this.queue = Array.isArray(initial) ? initial.flatMap((entry) => {
      if (!entry || typeof entry.id !== "string" || !entry.id || entry.id.length > 36) return [];
      const data = drawEditPayloadSchema.safeParse(entry.edit);
      if (!data.success) return [];
      const revision = drawEditSchema.shape.revision.safeParse(entry.revision);
      return [{ id: entry.id, edit: data.data, ...(revision.success ? { revision: revision.data } : {}) }];
    }) : [];
  }

  get busy() { return this.queue.length > 0; }
  get finishing() {
    const type = this.queue.at(-1)?.edit.type;
    return type === "draw-finish" || type === "draw-next";
  }
  get needsRetry() { return this.stalled; }
  get undoQueued() { return this.queue.some(({ edit }) => edit.type !== "draw-history" && edit.type !== "draw-next" && edit.type !== "draw-finish"); }

  add(edit: DrawEdit) {
    if (this.finishing) return;
    this.queue.push({ id: randomId(), edit });
    this.save?.(this.queue);
  }

  finish(edit: Finish) { this.add(edit); }

  restore(direction: "undo" | "redo", round: number) {
    this.add({ type: "draw-history", direction, round });
  }

  retry() {
    this.sentAt = undefined;
  }

  complete() {
    if (!this.busy) return;
    this.queue = [];
    this.save?.(this.queue);
  }

  get changingLayers() { return this.queue.some(({ edit }) => edit.type === "draw-layer"); }

  preview(strokes: Drawing["strokes"], fills: Drawing["fills"] = [], lastEdit?: string): Drawing["strokes"] {
    const known = new Set(strokes.map(({ id }) => id));
    let order = nextCanvasOrder(strokes, fills);
    let result = strokes;
    for (const { id, edit } of this.queue) {
      if (id === lastEdit) continue;
      if (edit.type === "draw-move-selection") {
        result = moveSelection(result, edit.ids, edit.dx, edit.dy);
      }
      if (edit.type !== "draw-stroke" || known.has(edit.id)) continue;
      const { type: _type, round: _round, part: _part, ...stroke } = edit;
      result = [...result, { ...stroke, nextPart: 1, order: order++ }];
      known.add(edit.id);
    }
    return result;
  }

  step(snapshot: Snapshot, canSend: boolean, now: number): { action?: Envelope; failed?: boolean } | undefined {
    let changed = false;
    if (this.queue[0]?.id === snapshot.history?.lastEdit && this.queue.length) {
      this.queue.shift();
      this.save?.(this.queue);
      this.sentAt = undefined;
      this.stalled = false;
      changed = true;
    }
    if (!canSend) return changed ? {} : undefined;
    while (this.queue.length) {
      const next = this.queue[0]!;
      if (next.revision === undefined && next.edit.type === "draw-history" && !snapshot.history?.[next.edit.direction]) {
        this.queue.shift();
        this.save?.(this.queue);
        changed = true;
        continue;
      }
      if (this.sentAt !== undefined) {
        if (now - this.sentAt < 8_000) return changed ? {} : undefined;
        this.stalled = true;
      }
      next.revision ??= snapshot.history?.revision ?? 0;
      this.sentAt = now;
      this.save?.(this.queue);
      return {
        action: { type: "draw-edit", id: next.id, revision: next.revision, edit: next.edit },
        ...(this.stalled ? { failed: true } : {}),
      };
    }
    return changed ? {} : undefined;
  }
}

export function openCanvasDraft(key: string, game: string) {
  const storageKey = `onlinebg.drawing.draft:${key}`;
  let edits: unknown;
  try {
    const value = sessionStorage.getItem(storageKey);
    const draft = value ? JSON.parse(value) : null;
    if (draft?.game === game) edits = draft.edits;
  } catch {}
  return new CanvasEdits(edits, (next) => {
    try {
      if (next.length) sessionStorage.setItem(storageKey, JSON.stringify({ game, edits: next }));
      else sessionStorage.removeItem(storageKey);
    } catch {}
  });
}
