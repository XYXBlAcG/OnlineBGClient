import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { ExpeditionMap } from "../src/client/expedition/ExpeditionMap";
import { GameIcon } from "../src/client/GameIcon";
import { effectMotion } from "../src/client/effect-motion";

it("places every route node outside SVG foreignObject with a shared scaled coordinate layer", () => {
  const run = new ExpeditionAdventure().create(2).view;
  const html = renderToStaticMarkup(
    <ExpeditionMap
      run={run}
      available={run.map[0].map((n) => n.id)}
      names={["甲", "乙"]}
      onVote={() => {}}
    />,
  );
  expect(html).not.toContain("foreignObject");
  expect(html).toContain('class="exp-route-nodes"');
  expect(html.match(/data-route-node=/g)).toHaveLength(run.map.flat().length);
  expect(html).toContain("left:");
});
it("renders explicit vector icons for expedition and Dominion", () => {
  for (const game of ["expedition", "dominion"] as const) {
    const html = renderToStaticMarkup(<GameIcon kind={game} />);
    expect(html).toContain("<svg");
    expect(html).toContain(`data-game-icon="${game}"`);
  }
});
it("derives flight and fragment timing from one impact clock", () => {
  const near = effectMotion("impact", 80, 20, 12, 1, true);
  const far = effectMotion("impact", 900, 200, 12, 1, true);
  expect(far.duration).toBeGreaterThan(near.duration);
  expect(far.impactAt).toBeGreaterThan(0);
  expect(far.impactAt).toBeLessThan(far.duration);
  expect(far.body.length).toBeGreaterThan(12);
  expect(far.fragments).toHaveLength(12);
  expect(far.body.at(-1)?.opacity).toBe(0);
});

it("keeps dense seeded maps and vote-sized nodes inside their canvas without overlapping peers", async () => {
  const { routeLayout } = await import("../src/client/expedition/map-layout");
  const { generateMap } = await import("../src/domain/expedition/map");
  for (let seed = 1; seed <= 32; seed++) {
    const run = { map: generateMap(String(seed)) };
    const layout = routeLayout(run.map);
    for (const floor of run.map) {
      const points = floor.map((node) => layout.points.get(node.id)!);
      for (const p of points) {
        expect(p.x - layout.nodeWidth / 2).toBeGreaterThan(0);
        expect(p.x + layout.nodeWidth / 2).toBeLessThan(layout.width);
        expect(p.y - layout.nodeHeight / 2).toBeGreaterThan(0);
        expect(p.y + layout.nodeHeight / 2).toBeLessThan(layout.height);
      }
      for (let i = 1; i < points.length; i++) {
        expect(points[i].x - points[i - 1].x).toBeGreaterThan(layout.nodeWidth);
      }
    }
  }
});
it("keeps every effect phase ordered and all particles within the body lifetime", async () => {
  const { interactionCatalogue } = await import("../src/domain/social");
  for (const { style } of Object.values(interactionCatalogue)) {
    for (const [x, y] of [
      [0, 0],
      [-900, 600],
      [1800, -900],
    ]) {
      const plan = effectMotion(style, x, y, 16, 1.8, true);
      const offsets = plan.body.map((frame) => Number(frame.offset));
      expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
      expect(
        plan.impactAt + 3 * 24 + plan.fragmentDuration,
      ).toBeLessThanOrEqual(plan.duration);
      expect(plan.fragments.length).toBeLessThanOrEqual(16);
      expect(
        plan.body.every((frame) => !String(frame.transform).includes("NaN")),
      ).toBe(true);
    }
  }
});

it("retargets moving avatars without changing the impact clock", () => {
  const initial = effectMotion("splat", 200, 0, 10, 1, true);
  const moved = effectMotion("splat", 1000, 500, 10, 1, true, initial);
  expect(moved.impactAt).toBe(initial.impactAt);
  expect(moved.duration).toBe(initial.duration);
  expect(moved.body.map((frame) => frame.offset)).toEqual(
    initial.body.map((frame) => frame.offset),
  );
});
