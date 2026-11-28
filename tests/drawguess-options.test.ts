import { describe, expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { drawRevealMs } from "../src/domain/drawguess/types";

const engine = new GameEngine();
const custom = [
  { word: "自定义猫", aliases: [], category: "动物" },
  { word: "自定义锅", aliases: ["自定义平底锅"], category: "物件" },
  { word: "自定义树", aliases: [], category: "植物" },
];

describe("drawguess options", () => {
  it("uses the configured drawing time for the drawing phase", () => {
    let state = engine.create("drawguess", 3, "timing", false, {
      drawguess: { drawingSeconds: 40 },
    });
    if (state.kind !== "drawguess" || state.mode !== "classic")
      throw new Error("wrong game");
    expect(state.drawingMs).toBe(40_000);
    expect(engine.resolutionDelay(state)).toBe(40_000);
    state = engine.resolve(state, "reveal");
    if (state.kind !== "drawguess" || state.mode !== "classic")
      throw new Error("wrong game");
    expect(engine.resolutionDelay(state)).toBe(drawRevealMs);
    expect(state.drawingMs).toBe(40_000);
  });

  it("clamps drawing time to a safe range", () => {
    const fast = engine.create("drawguess", 3, "fast", false, {
      drawguess: { drawingSeconds: 1 },
    });
    const slow = engine.create("drawguess", 3, "slow", false, {
      drawguess: { drawingSeconds: 9999 },
    });
    expect(
      fast.kind === "drawguess" && fast.mode === "classic" && fast.drawingMs,
    ).toBe(15_000);
    expect(
      slow.kind === "drawguess" && slow.mode === "classic" && slow.drawingMs,
    ).toBe(300_000);
  });

  it("can build the bank from custom words only", () => {
    const state = engine.create("drawguess", 3, "custom-only", false, {
      drawguess: { words: custom, wordSource: "custom" },
    });
    if (state.kind !== "drawguess" || state.mode !== "classic")
      throw new Error("wrong game");
    expect(state.bank?.map((word) => word.word).sort()).toEqual(
      ["自定义猫", "自定义锅", "自定义树"].sort(),
    );
    expect(state.bank?.some((word) => word.word === "长颈鹿")).toBe(false);
  });

  it("rejects a custom-only bank with fewer words than players", () => {
    expect(() =>
      engine.create("drawguess", 4, "custom-only-fail", false, {
        drawguess: { words: custom, wordSource: "custom" },
      }),
    ).toThrow(/自定义词库不足/);
  });

  it("keeps system words when wordSource is all", () => {
    const state = engine.create("drawguess", 3, "custom-all", false, {
      drawguess: { words: custom, wordSource: "all" },
    });
    if (state.kind !== "drawguess" || state.mode !== "classic")
      throw new Error("wrong game");
    expect(state.bank?.some((word) => word.word === "自定义猫")).toBe(true);
    expect((state.bank?.length ?? 0)).toBeGreaterThan(custom.length);
  });
});

describe("drawguess room options", () => {
  it("starts a custom-only room with only host words and the configured timer", async () => {
    const { Room } = await import("../src/domain/room");
    const room = new Room(
      "draw-options-room",
      {
        kind: "drawguess",
        drawguess: { mode: "classic", drawingSeconds: 45, wordSource: "custom" },
        humans: 3,
        ai: [],
        team: false,
        training: false,
      } as never,
      "draw-options-room",
    );
    const tokens = [room.claim("A"), room.claim("B"), room.claim("C")];
    room.seats.forEach((seat) => {
      seat.ready = true;
    });
    room.start(tokens[0], custom);
    const state = room.state;
    if (state?.kind !== "drawguess" || state.mode !== "classic")
      throw new Error("wrong game");
    expect(state.drawingMs).toBe(45_000);
    expect(state.bank?.map((word) => word.word).sort()).toEqual(
      custom.map((word) => word.word).sort(),
    );
    expect(room.snapshot(tokens[0]).turnDeadline).toBeGreaterThan(Date.now() + 40_000);
  });
});
