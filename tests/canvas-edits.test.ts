import { expect, it } from "vitest";
import { CanvasEdits, strokePackets } from "../src/client/fayu/canvas-edits";
import { GameEngine } from "../src/domain/engine";
import { actionSchema } from "../src/domain/protocol";
import type { DrawPoint } from "../src/domain/drawguess/types";

it("waits for the final chunk before finishing and records one logical undo", () => {
  const engine = new GameEngine();
  let game = engine.create("drawguess", 3, "canvas", false);
  if (game.kind !== "drawguess") throw new Error("wrong game");
  const edits = new CanvasEdits();
  const points = Array.from({ length: 130 }, (_, index): DrawPoint => [index, index]);
  const packets = strokePackets(0, { id: "pen", ink: "ink", points });
  expect(packets.map(({ id, part }) => [id, part])).toEqual([["pen", 0], ["pen", 1], ["pen", 2]]);
  const send = () => {
    if (game.kind !== "drawguess" || game.mode !== "classic") throw new Error("wrong game");
    const projected = engine.project(game, game.view.artist);
    if (projected.kind !== "drawguess" || projected.mode !== "classic") throw new Error("wrong game");
    const action = edits.step({ strokes: projected.view.strokes, fills: projected.view.fills ?? [], history: projected.view.history }, true, 0)?.action;
    if (action) game = engine.apply(game, game.view.artist, action, "canvas");
    return action;
  };
  edits.add(packets);
  expect(send()?.type).toBe("draw-stroke");
  expect(edits.step({ strokes: [], fills: [] }, true, 1)).toBeUndefined();
  expect(send()?.type).toBe("draw-stroke");
  expect(send()?.type).toBe("draw-stroke");
  expect(send()).toBeUndefined();
  edits.restore("undo", 0);
  expect(send()?.type).toBe("draw-history");
  expect(send()).toBeUndefined();
  edits.restore("redo", 0);
  edits.finish({ type: "draw-next", round: 0 });
  expect(send()?.type).toBe("draw-history");
  expect(send()?.type).toBe("draw-next");
  expect(game.kind === "drawguess" && game.mode === "classic" && game.view.strokes.map((stroke) => stroke.points)).toEqual([points]);
});

it("does not submit a drawing after a packet times out", () => {
  const edits = new CanvasEdits();
  edits.add(strokePackets(0, { id: "last", ink: "ink", points: [[0, 0]] }));
  edits.finish({ type: "draw-finish", round: 0 });
  const empty = { strokes: [], fills: [] };
  expect(edits.step(empty, true, 0)?.action?.type).toBe("draw-stroke");
  expect(edits.step(empty, true, 9_000)).toMatchObject({ failed: true });
  expect(edits.step(empty, true, 10_000)).toBeUndefined();
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

it("keeps drawing and completion in order while snapshots catch up", () => {
  const edits = new CanvasEdits();
  const points = Array.from({ length: 65 }, (_, index): DrawPoint => [index, 1]);
  edits.add(strokePackets(0, { id: "first", ink: "ink", points }));
  edits.add(strokePackets(0, { id: "last", ink: "blue", points: [[4, 5]] }));
  edits.finish({ type: "draw-finish", round: 0 });

  const strokes: ReturnType<CanvasEdits["preview"]> = [];
  const step = (now: number) => edits.step({ strokes, fills: [] }, true, now);
  expect(step(0)?.action).toMatchObject({ id: "first", part: 0 });
  strokes.push({ id: "first", ink: "ink", nextPart: 1, points: points.slice(0, 64) });
  expect(step(1)?.action).toMatchObject({ id: "first", part: 1 });
  expect(step(2)).toBeUndefined();
  strokes[0] = { ...strokes[0], nextPart: 2, points };
  expect(step(3)?.action).toMatchObject({ id: "last", part: 0 });
  expect(step(4)).toBeUndefined();
  expect(edits.preview(strokes).at(-1)?.points).toEqual([[4, 5]]);
  strokes.push({ id: "last", ink: "blue", nextPart: 1, points: [[4, 5]] });
  expect(step(5)?.action).toMatchObject({ type: "draw-finish" });
  expect(edits.finishing).toBe(true);
  expect(step(6)).toBeUndefined();
});

it("queues an undo while the last stroke is still being confirmed", () => {
  const edits = new CanvasEdits();
  edits.add(strokePackets(0, { id: "late", ink: "ink", points: [[4, 5]] }));
  const empty = { strokes: [], fills: [] };
  expect(edits.step(empty, true, 0)?.action?.type).toBe("draw-stroke");
  edits.restore("undo", 0);
  const drawn = { strokes: [{ id: "late", ink: "ink" as const, nextPart: 1, points: [[4, 5]] as DrawPoint[] }], fills: [] };
  expect(edits.step({ ...drawn, history: { revision: 1, undo: 1, redo: 0 } }, true, 1)?.action).toMatchObject({ type: "draw-history", direction: "undo" });
  edits.step(empty, true, 2);
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
  for (const [id, layer] of [["bottom", 0], ["upper", 4]] as const)
    for (const packet of strokePackets(0, { id, layer, ink: "ink", points: Array.from({ length: 70 }, (): DrawPoint => [10, 10]) }))
      send(packet);
  send({ type: "draw-clear", round: 0, layer: 4 });
  game = JSON.parse(JSON.stringify(game));
  const undo = { type: "draw-history", round: 0, direction: "undo" };
  expect(send(undo).strokes.map(({ id }) => id)).toEqual(["bottom", "upper"]);
  expect(send(undo).strokes.map(({ id }) => id)).toEqual(["bottom"]);
  expect(send({ ...undo, direction: "redo" }).strokes[1]?.points).toHaveLength(70);
});
