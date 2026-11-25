import { nextCanvasOrder } from "../../domain/drawguess/canvas-order";
import type { Action } from "../../domain/types";
import { drawBatchSize, type DrawStroke } from "../../domain/drawguess/types";
import type { FayuFill } from "../../domain/fayu/types";
import type { DrawingHistoryStatus } from "../../domain/drawguess/canvas-history";

type Canvas = { strokes: DrawStroke[]; fills: FayuFill[]; history?: DrawingHistoryStatus };
type StrokeAction = Extract<Action, { type: "draw-stroke" }>;
type EditAction = Extract<Action, {
  type: "draw-stroke" | "draw-clear" | "draw-delete" | "draw-fill" | "draw-history" | "draw-transform";
}>;
type Finish = Extract<Action, { type: "draw-next" | "draw-finish" }>;
type History = "undo" | "redo";
type Edit = { actions: EditAction[] };

export function strokePackets(round: number, stroke: Omit<DrawStroke, "nextPart">): StrokeAction[] {
  return Array.from({ length: Math.ceil(stroke.points.length / drawBatchSize) }, (_, part) => ({
    ...stroke,
    type: "draw-stroke",
    round,
    part,
    points: stroke.points.slice(part * drawBatchSize, (part + 1) * drawBatchSize),
  }));
}

export class CanvasEdits {
  private queue: Edit[] = [];
  private inflight?: { action: EditAction; sentAt: number; revision: number };
  private completion?: Finish;
  private completionSentAt?: number;

  get busy() { return this.queue.length > 0; }
  get finishing() { return !!this.completion || this.completionSentAt !== undefined; }

  add(actions: EditAction[]) {
    if (actions.length && !this.finishing) this.queue.push({ actions: [...actions] });
  }

  finish(action: Finish) {
    if (!this.finishing) this.completion = action;
  }

  restore(direction: History, round: number) {
    this.add([{ type: "draw-history", direction, round }]);
  }

  preview(current: DrawStroke[], fills: FayuFill[] = []): DrawStroke[] {
    let order = nextCanvasOrder(current, fills);
    const staged = new Map<string, DrawStroke>();
    for (const edit of this.queue) {
      const actions = [
        ...(edit === this.queue[0] && this.inflight ? [this.inflight.action] : []),
        ...edit.actions,
      ];
      for (const action of actions) {
        if (action.type !== "draw-stroke") continue;
        const stroke = staged.get(action.id) ?? current.find(({ id }) => id === action.id);
        if (stroke && stroke.nextPart > action.part) continue;
        staged.set(action.id, {
          ...action,
          points: [...(stroke?.points ?? []), ...action.points],
          nextPart: action.part + 1,
          order: stroke?.order ?? order++,
        });
      }
    }
    return [...current.filter(({ id }) => !staged.has(id)), ...staged.values()];
  }

  step(current: Canvas, canSend: boolean, now: number): { action?: Action; failed?: boolean } | undefined {
    if (this.completionSentAt !== undefined && canSend && now - this.completionSentAt >= 8_000) {
      this.completionSentAt = undefined;
      return { failed: true };
    }
    const edit = this.queue[0];
    let updated = false;
    if (edit && this.inflight) {
      const { action, sentAt, revision } = this.inflight;
      const confirmed = action.type === "draw-stroke"
        ? current.strokes.some(({ id, nextPart }) => id === action.id && nextPart > action.part)
        : (current.history?.revision ?? 0) > revision;
      if (!confirmed) {
        if (!canSend || now - sentAt < 8_000) return;
        this.inflight = undefined;
        this.queue = [];
        this.completion = undefined;
        return { failed: true };
      }
      this.inflight = undefined;
      updated = true;
      if (!edit.actions.length) this.queue.shift();
    }
    if (canSend) {
      while (this.queue.length) {
        const next = this.queue[0]!;
        const action = next.actions.shift();
        if (!action || (action.type === "draw-history" && !current.history?.[action.direction])) {
          if (!next.actions.length) this.queue.shift();
          updated = true;
          continue;
        }
        this.inflight = { action, sentAt: now, revision: current.history?.revision ?? 0 };
        return { action };
      }
      if (this.completion) {
        const action = this.completion;
        this.completion = undefined;
        this.completionSentAt = now;
        return { action };
      }
    }
    return updated ? {} : undefined;
  }
}
