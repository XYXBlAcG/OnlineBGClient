import { expect, it } from "vitest";
import { CanvasEdits } from "../src/client/fayu/canvas-edits";
import { actionSchema } from "../src/domain/protocol";
import { Replay } from "../src/domain/replay";
import { Room } from "../src/domain/room";
import type { DrawPoint } from "../src/domain/drawguess/types";

it("commits a long stroke once and guards completion against a missing edit", () => {
  const room = new Room("draw-atomic", { kind: "drawguess", humans: 3, ai: [], team: false, training: false });
  const [artist, ...guessers] = ["画手", "甲", "乙"].map((name) => room.claim(name));
  for (const player of guessers) room.setReady(player, true);
  room.start(artist);
  const points = Array.from({ length: 130 }, (_, i): DrawPoint => [i, 20]);
  const envelope = (id: string, revision: number, edit: unknown) => actionSchema.parse({ type: "draw-edit", id, revision, edit });
  const add = envelope("stroke", 0, { type: "draw-stroke", round: 0, id: "long", part: 0, ink: "ink", points });
  const finish = envelope("finish", 2, { type: "draw-next", round: 0 });
  const apply = (action: ReturnType<typeof envelope>) => room.act(artist, action.type === "draw-edit" ? action.id : "action", room.version, action);
  expect(() => apply(finish)).toThrow();
  apply(add);
  apply(add);
  expect(room.snapshot(artist).state?.view).toMatchObject({ history: { revision: 1, undo: 1, lastEdit: "stroke" }, strokes: [{ points }] });
  apply(envelope("undo", 1, { type: "draw-history", round: 0, direction: "undo" }));
  expect(room.snapshot(artist).state?.view).toMatchObject({ strokes: [], history: { redo: 1 } });
  apply(envelope("redo", 2, { type: "draw-history", round: 0, direction: "redo" }));
  apply(envelope("done", 3, { type: "draw-next", round: 0 }));
  const record = room.export().replay!;
  expect(new Replay(record).frame(record.events.length).view).toMatchObject({ phase: "reveal", strokes: [{ points }] });
});

it("retries with the same ID after reconnect and waits for the final stroke before handing in", () => {
  let persisted: unknown;
  const save = (state: unknown) => { persisted = JSON.parse(JSON.stringify(state)); };
  let edits = new CanvasEdits(undefined, save);
  const pen = { type: "draw-stroke", round: 0, id: "line", part: 0, ink: "ink", points: [[12, 12], [14, 15]] } as const;
  edits.add({ ...pen, points: pen.points.map(([x, y]): DrawPoint => [x, y]) });
  edits.finish({ type: "draw-next", round: 0 });
  const first = edits.step({ strokes: [], fills: [] }, true, 0)?.action;
  edits = new CanvasEdits(persisted, save);
  expect(edits.preview([]).map(({ id }) => id)).toEqual(["line"]);
  expect(edits.step({ strokes: [], fills: [] }, false, 12000)).toBeUndefined();
  expect(edits.step({ strokes: [], fills: [] }, true, 12001)?.action).toEqual(first);
  if (first?.type !== "draw-edit") throw new Error("缺少编辑标识");
  const confirmed = { strokes: [{ ...pen, points: [[12, 12], [14, 15]] as DrawPoint[], nextPart: 1, order: 1 }], fills: [], history: { revision: 1, undo: 1, redo: 0, lastEdit: first.id } };
  expect(edits.step(confirmed, true, 13000)?.action).toMatchObject({ type: "draw-edit", revision: 1, edit: { type: "draw-next" } });
});
