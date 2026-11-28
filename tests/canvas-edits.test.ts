import { expect, it } from "vitest";
import { CanvasEdits } from "../src/client/fayu/canvas-edits";
import { GameEngine } from "../src/domain/engine";
import { actionSchema } from "../src/domain/protocol";
import { drawBatchSize, type DrawPoint } from "../src/domain/drawguess/types";

it("retries a timed-out edit without dropping a later stroke or sending completion early", () => {
  const edits = new CanvasEdits();
  const stroke = (id: string) => ({ type: "draw-stroke" as const, round: 0, part: 0 as const, id, ink: "ink" as const, points: [[12, 24]] as DrawPoint[] });
  edits.add(stroke("first"));
  edits.add(stroke("last"));
  edits.finish({ type: "draw-finish", round: 0 });
  const empty = { strokes: [], fills: [] };
  const first = edits.step(empty, true, 0)?.action;
  expect(first?.edit.type).toBe("draw-stroke");
  expect(edits.step(empty, true, 9_000)).toEqual({ action: first, failed: true });
  expect(edits.preview([]).map(({ id }) => id)).toEqual(["first", "last"]);
  const last = edits.step({ ...empty, history: { revision: 1, undo: 1, redo: 0, lastEdit: first?.id } }, true, 10_000)?.action;
  expect(last?.edit).toEqual(stroke("last"));
  expect(edits.step({ ...empty, history: { revision: 4, undo: 2, redo: 0, lastEdit: "other-edit" } }, true, 11_000)).toBeUndefined();
  expect(edits.step({ ...empty, history: { revision: 2, undo: 2, redo: 0, lastEdit: last?.id } }, true, 12_000)?.action?.edit.type).toBe("draw-finish");
});

it("restores large classic canvases and clears one of five layers without consuming the point budget", () => {
  const engine = new GameEngine();
  let game = engine.create("drawguess", 3, "clear", false);
  if (game.kind !== "drawguess" || game.mode !== "classic") throw new Error("wrong game");
  const actor = game.view.artist;
  const points = Array.from({ length: 2_000 }, (): DrawPoint => [1, 1]);
  const stroke = { id: "pen", ink: "ink" as const, points };
  const apply = (action: unknown) => {
    game = engine.apply(game, actor, actionSchema.parse(action), "clear");
    if (game.kind !== "drawguess" || game.mode !== "classic") throw new Error("wrong game");
    return game.view;
  };
  expect(apply({
    type: "draw-restore",
    round: 0,
    strokes: [{ ...stroke, layer: 3 }, { ...stroke, id: "top", layer: 4 }],
    fills: [],
  }).pointsUsed).toBe(4_000);
  const cleared = apply({ type: "draw-clear", round: 0, layer: 4 });
  expect(cleared.pointsUsed).toBe(2_000);
  expect(cleared.strokes.map(({ id }) => id)).toEqual(["pen"]);
});

it("orders a quick undo after the just-drawn stroke is confirmed", () => {
  const edits = new CanvasEdits();
  edits.add({ type: "draw-stroke", round: 0, part: 0, id: "last", ink: "ink", points: [[4, 5]] });
  const empty = { strokes: [], fills: [] };
  const first = edits.step(empty, true, 0)?.action;
  edits.restore("undo", 0);
  expect(edits.step(empty, true, 1)).toBeUndefined();
  expect(edits.step({ ...empty, history: { revision: 1, undo: 1, redo: 0, lastEdit: first?.id } }, true, 2)?.action)
    .toMatchObject({ type: "draw-edit", revision: 1, edit: { type: "draw-history", direction: "undo" } });
});

it("restores an acknowledged stroke after reconnect and preserves another layer", () => {
  const engine = new GameEngine();
  const seed = "reconnect";
  let game = engine.create("drawguess", 3, seed, false);
  if (game.kind !== "drawguess" || game.mode !== "classic") throw new Error("wrong game");
  const actor = game.view.artist;
  const send = (action: unknown) => {
    game = engine.apply(game, actor, actionSchema.parse(action), seed);
    if (game.kind !== "drawguess" || game.mode !== "classic") throw new Error("wrong game");
    return game.view;
  };
  for (const [id, layer] of [["bottom", 0], ["upper", 4]] as const) {
    const points = Array.from({ length: 70 }, (): DrawPoint => [10, 10]);
    for (let start = 0; start < points.length; start += drawBatchSize)
      send({ type: "draw-stroke", round: 0, id, layer, ink: "ink", part: start / drawBatchSize, points: points.slice(start, start + drawBatchSize) });
  }
  send({ type: "draw-clear", round: 0, layer: 4 });
  game = JSON.parse(JSON.stringify(game));
  const undo = { type: "draw-history", round: 0, direction: "undo" };
  expect(send(undo).strokes.map(({ id }) => id)).toEqual(["bottom", "upper"]);
  expect(send(undo).strokes.map(({ id }) => id)).toEqual(["bottom"]);
  expect(send({ ...undo, direction: "redo" }).strokes[1]?.points).toHaveLength(70);
});
