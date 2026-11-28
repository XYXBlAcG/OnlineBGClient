import { expect, it, vi } from "vitest";
import { makeWordRows, filterWordRows, setSystemWords } from "../src/client/drawguess/word-library-model";
import { loadDrawWordLibrary, parseDrawWords, saveDrawWordLibrary, subscribeDrawWordLibrary } from "../src/client/drawguess/library";
import { drawWordBank, normalizeDrawWord, drawguessBuiltinWords } from "../src/domain/drawguess/words";
import { canvasRegion, regionRunStride } from "../src/domain/drawguess/canvas-region";
import { lassoHits, moveSelection } from "../src/domain/drawguess/canvas-selection";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
import { actionSchema } from "../src/domain/protocol";
import type { DrawView, DrawStroke } from "../src/domain/drawguess/types";

it("finds the original name and alternate spellings and only changes explicitly selected system rows", () => {
  const original = drawguessBuiltinWords[0]!;
  const key = normalizeDrawWord(original.word);
  const builtin = { [key]: { word: { ...original, word: "新名字", aliases: ["旧别名"] } } };
  const rows = makeWordRows([], drawguessBuiltinWords, builtin, normalizeDrawWord);
  expect(filterWordRows(rows, original.word, "system", "modified", "", "")[0]?.word.word).toBe("新名字");
  expect(filterWordRows(rows, "旧别名", "system", "all", "", "")[0]?.original).toBe(original);
  const disabled = setSystemWords(builtin, rows.slice(0, 1), "disable");
  expect(drawWordBank([], disabled).some((word) => word.word === "新名字")).toBe(false);
  expect(drawWordBank([], setSystemWords(disabled, rows.slice(0, 1), "reset"))).toContainEqual(original);
});

it("fills one connected region as bounded sorted scanlines", () => {
  const width = 5, height = 3;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) rgba.set([255, 255, 255, 255], (y * width + 2) * 4);
  expect(canvasRegion(rgba, width, height, [0, 1])).toEqual([1, 5 * regionRunStride + 1, 10 * regionRunStride + 1]);
});

it("selects crossing lines and moves multiple strokes without compressing them at the edge", () => {
  const stroke: DrawStroke = { id: "line", tool: "line", nextPart: 1, ink: "ink", points: [[10, 20], [40, 20]] };
  expect(lassoHits(stroke, [[20, 15], [30, 15], [30, 30], [20, 30]])).toBe(true);
  const moved = moveSelection([stroke], ["line"], -20, 5);
  expect(moved[0]?.points).toEqual([[0, 25], [30, 25]]);
});

it("persists layer order, compact fill and undo across the replay boundary", () => {
  const room = new Room("layer-test", { kind: "drawguess", humans: 3, ai: [], team: false, training: false });
  const host = room.claim("甲");
  for (const name of ["乙", "丙"]) room.setReady(room.claim(name), true);
  room.start(host);
  const send = (edit: object) => {
    const view = room.snapshot(host).state?.view as DrawView | undefined;
    const revision = view?.history?.revision ?? 0;
    const id = String(room.version);
    room.act(host, id, room.version, actionSchema.parse({ type: "draw-edit", id, revision, edit: { round: 0, ...edit } }));
  };
  send({ type: "draw-layer", move: { type: "rename", layer: 1, name: "线稿" } });
  send({ type: "draw-layer", move: { type: "move", layer: 1, by: -1 } });
  send({ type: "draw-region", layer: 1, region: { color: "#ff0000", runs: [2] } });
  send({ type: "draw-layer", move: { type: "remove", layer: 1 } });
  send({ type: "draw-history", direction: "undo" });
  const latest = room.snapshot(host).state?.view;
  expect(latest).toMatchObject({ layers: [{ id: 1, name: "线稿" }, { id: 0 }, { id: 2 }], fills: [{ layer: 1, region: { runs: [2] } }] });
  const replay = new Replay(room.export().replay!);
  expect(replay.frame(replay.record.events.length)).toEqual(room.state);
});

it("keeps classic custom words and valid system settings when importing older and partially invalid backups", () => {
  const custom = { word: "闹钟", aliases: ["叫醒钟"], category: "物件" };
  const original = drawguessBuiltinWords[0]!;
  const key = normalizeDrawWord(original.word);
  expect(parseDrawWords(JSON.stringify({ version: 1, words: [custom] })).words).toEqual([custom]);
  const backup = parseDrawWords(JSON.stringify({ version: 1, words: [custom], builtin: {
    [key]: { disabled: true },
    [normalizeDrawWord(drawguessBuiltinWords[1]!.word)]: { disabled: "yes" },
    "unknown": { disabled: true },
  } }));
  expect(backup.words).toEqual([custom]);
  expect(backup.builtin).toEqual({ [key]: { disabled: true } });
});

it("replays the effective classic word pool used at the table", () => {
  const room = new Room("pool-test", { kind: "drawguess", humans: 3, ai: [], team: false, training: false });
  const host = room.claim("甲");
  for (const name of ["乙", "丙"]) room.setReady(room.claim(name), true);
  const words = ["甲词", "乙词", "丙词"].map((word) => ({ word, aliases: [], category: "测试" }));
  expect(() => room.start(host, undefined, words.slice(0, 2))).toThrow();
  room.start(host, undefined, words);
  const replay = new Replay(room.export().replay!);
  expect(replay.record.drawWordPool).toEqual(words);
  expect(replay.frame(0)).toEqual(room.state);
});

it("refreshes the classic preview after settings save and stops listening when it closes", () => {
  let stored: string | null = null;
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } });
  const change = vi.fn(() => loadDrawWordLibrary());
  const stop = subscribeDrawWordLibrary(change);
  try {
    const words = [{ word: "月球车", aliases: [], category: "交通" }];
    saveDrawWordLibrary({ version: 1, words });
    expect(change).toHaveReturnedWith(expect.objectContaining({ words }));
    stop();
    saveDrawWordLibrary({ version: 1, words: [] });
    expect(change).toHaveBeenCalledTimes(1);
  } finally {
    stop();
    vi.unstubAllGlobals();
  }
});
