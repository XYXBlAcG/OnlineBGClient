import { describe, expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { Room } from "../src/domain/room";
import { commandSchema } from "../src/domain/protocol";
import { drawguessBuiltinWords } from "../src/domain/drawguess/words";
import { parseDrawWords, mergeDrawWords } from "../src/client/drawguess/library";
import { Replay } from "../src/domain/replay";

const custom = [
  { word: "测试西瓜", aliases: ["测试瓜"], category: "食物" },
  { word: "测试企鹅", aliases: [], category: "动物" },
  { word: "测试灯塔", aliases: [], category: "建筑" },
];

describe("drawguess custom word bank", () => {
  it("merges host words into the engine bank and strips them from projections", () => {
    const engine = new GameEngine();
    const state = engine.create("drawguess", 3, "draw:words", false, {
      drawguess: { words: custom },
    });
    if (state.kind !== "drawguess") throw new Error("wrong game");
    expect(state.mode === "classic" && state.bank?.some((word) => word.word === "测试西瓜")).toBe(true);
    expect(drawguessBuiltinWords.length).toBeGreaterThan(100);
    const projected = engine.project(state, 0);
    expect(projected.kind).toBe("drawguess");
    if (projected.kind === "drawguess") {
      expect("bank" in projected).toBe(false);
      expect("words" in projected).toBe(false);
    }
  });

  it("imports two-column text without losing the category", () => {
    const parsed = parseDrawWords("苹果,水果\n企鹅,企鹅宝宝,动物");
    expect(parsed.words[0]).toMatchObject({ word: "苹果", category: "水果", aliases: [] });
    expect(parsed.words[1]).toMatchObject({
      word: "企鹅",
      category: "动物",
      aliases: ["企鹅宝宝"],
    });
    expect(mergeDrawWords(parsed.words)).toHaveLength(2);
  });

  it("expands the built-in bank beyond the old fixed list", () => {
    expect(drawguessBuiltinWords.length).toBeGreaterThan(300);
  });

  it("accepts host words in the start command and keeps them private in snapshots", () => {
    const command = commandSchema.parse({
      type: "start",
      token: "host",
      drawWords: custom,
    });
    expect(command.type).toBe("start");
    const room = new Room("draw-words", {
      kind: "drawguess",
      humans: 3,
      ai: [],
      team: false,
      training: false,
    });
    const tokens = [room.claim("画手A"), room.claim("画手B"), room.claim("画手C")];
    room.seats.forEach((seat) => { seat.ready = true; });
    room.start(tokens[0], custom);
    const snapshot = room.snapshot(tokens[0]);
    const text = JSON.stringify(snapshot);
    expect(text).not.toContain("测试西瓜");
    expect(snapshot.state?.kind).toBe("drawguess");
    const archive = room.export();
    const replay = new Replay(archive.replay);
    const frame = replay.frame(0);
    if (frame.kind !== "drawguess") throw new Error("wrong replay game");
    expect(frame.mode === "classic" && frame.bank?.some((word) => word.word === "测试西瓜")).toBe(true);
  });
});
