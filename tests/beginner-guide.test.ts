import { expect, it } from "vitest";
import { beginnerGuides } from "../src/client/beginner-guides";
import { preferencesSchema } from "../src/client/preferences";
import { gameCatalogue } from "../src/domain/catalogue";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { BeginnerGuide } from "../src/client/BeginnerGuide";
import { guidePosition } from "../src/client/guide-position";
import { Room } from "../src/domain/room";

it("registers concise guides for the five requested games", () => {
  expect(Object.keys(beginnerGuides).sort()).toEqual([
    "ccbs",
    "dy",
    "ktd",
    "sgs",
    "tq",
  ]);
  for (const [kind, guide] of Object.entries(beginnerGuides)) {
    expect(gameCatalogue[kind as keyof typeof gameCatalogue]).toBeDefined();
    const game = kind as keyof typeof gameCatalogue;
    const closed = renderToString(
      createElement(BeginnerGuide, {
        kind: game,
        enabled: false,
        onChange: () => {},
      }),
    );
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).not.toContain(guide.goal);
    const opened = renderToString(
      createElement(BeginnerGuide, {
        kind: game,
        enabled: true,
        onChange: () => {},
      }),
    );
    expect(opened).toContain(guide.goal);
    expect(opened).toContain(guide.steps[0].title);
    expect(opened).not.toContain(guide.steps[1].text);
    expect(guide.goal.length).toBeGreaterThan(10);
    expect(guide.steps.length).toBeGreaterThanOrEqual(4);
    expect(new Set(guide.steps.map((step) => step.title)).size).toBe(
      guide.steps.length,
    );
    for (const step of guide.steps) {
      expect(step.text.length).toBeGreaterThan(10);
      expect(step.tip.length).toBeGreaterThan(10);
      expect(step.details.length).toBeGreaterThanOrEqual(3);
      expect(step.focus.caption.length).toBeGreaterThan(5);
      expect(step.focus.target).toBeTruthy();
    }
  }
});

it("keeps games without a registered guide free of guide controls", () => {
  expect(
    renderToString(
      createElement(BeginnerGuide, {
        kind: "uno",
        enabled: true,
        onChange: () => {},
      }),
    ),
  ).toBe("");
});

it("opts in separately by game and preserves the selection through storage", () => {
  const initial = preferencesSchema.parse({});
  expect(initial.beginnerGuides).toEqual({});
  const restored = preferencesSchema.parse(
    JSON.parse(
      JSON.stringify({ ...initial, beginnerGuides: { ccbs: true, dy: false } }),
    ),
  );
  expect(restored.beginnerGuides.ccbs).toBe(true);
  expect(restored.beginnerGuides.dy).toBe(false);
  expect(restored.beginnerGuides.ktd).toBeUndefined();
  expect(
    preferencesSchema.safeParse({ beginnerGuides: { unknown: true } }).success,
  ).toBe(false);
});

it("uses the real projected game position and authoritative moves in teaching", () => {
  for (const kind of ["ccbs", "dy", "ktd", "sgs", "tq"] as const) {
    const room = new Room(
      "teaching",
      { kind, humans: 2, ai: [], team: false, training: false },
      "teaching",
    );
    const owner = room.claim("甲");
    room.claim("乙");
    room.seats.forEach((seat) => (seat.ready = true));
    room.start(owner);
    const snapshot = room.snapshot(owner);
    expect(guidePosition(snapshot).length).toBeGreaterThan(0);
    const html = renderToString(
      createElement(BeginnerGuide, {
        kind,
        enabled: true,
        onChange: () => {},
        snapshot,
      }),
    );
    expect(html).toContain("看实际牌桌");
    for (const candidate of snapshot.candidates.slice(0, 3))
      expect(html).toContain(candidate.label);
    expect(guidePosition({ ...snapshot, actor: -1 })).toEqual([]);
  }
});
