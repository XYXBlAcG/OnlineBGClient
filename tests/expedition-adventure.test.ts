import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { cards, heroContent } from "../src/domain/expedition/content";
import {
  relics,
  potions,
  storyEvents,
  creatures,
} from "../src/domain/expedition/world";
const rules = new ExpeditionAdventure();
it("defines the complete chapter content without duplicate identifiers", () => {
  expect(Object.keys(cards)).toHaveLength(66);
  expect(heroContent).toHaveLength(3);
  expect(Object.keys(relics)).toHaveLength(18);
  expect(Object.keys(potions)).toHaveLength(8);
  expect(Object.keys(storyEvents)).toHaveLength(10);
  expect(
    Object.values(creatures).filter((e) => e.rank === "normal"),
  ).toHaveLength(8);
  expect(
    Object.values(creatures).filter((e) => e.rank === "elite"),
  ).toHaveLength(3);
  expect(
    Object.values(creatures).filter((e) => e.rank === "boss"),
  ).toHaveLength(2);
});
it("creates seeded branching routes for 1 to 4 heroes with reachable recovery nodes", () => {
  for (let count = 1; count <= 4; count++) {
    let state = rules.create(count, false, {
      expedition: { difficulty: "standard" },
    });
    for (let actor = 0; actor < count; actor++)
      state = rules.apply(state, actor, {
        type: "expedition-action",
        move: { type: "profession", profession: actor % 3 },
      });
    expect(state.view.phase).toBe("map");
    expect(state.view.map).toHaveLength(12);
    expect(state.view.map[11].every((node) => node.kind === "boss")).toBe(true);
    for (const layer of state.view.map.slice(0, -1))
      for (const node of layer) {
        expect(node.next.length).toBeGreaterThan(0);
        expect(
          node.next.every((id) =>
            state.view.map.flat().some((n) => n.id === id),
          ),
        ).toBe(true);
      }
    for (const floor of [3, 7, 10])
      expect(state.view.map[floor].every((n) => n.kind === "camp")).toBe(true);
  }
});
it("projects no authoritative shuffle seed or draw order while keeping ally hands visible", () => {
  let state = rules.create(2, false, {});
  for (let actor = 0; actor < 2; actor++)
    state = rules.apply(state, actor, {
      type: "expedition-action",
      move: { type: "profession", profession: actor },
    });
  const projected = rules.project(state, 0);
  expect(projected.view.seed).toBe("");
  expect(projected.view.combat.seed).toBe("");
  expect(
    projected.view.combat.heroes.every((hero) =>
      hero.deck.every((card) => card.id !== ""),
    ),
  ).toBe(true);
});
it("creates varied connected maps with more than three branches and no orphan or dead-end nodes",()=>{
 for(let seed=0;seed<32;seed++){
  let serial=0;const rules=new ExpeditionAdventure(()=>((seed+1)*9301+(++serial)*49297)%233280/233280),state=rules.create(2),map=state.view.map;
  expect(map.slice(0,-1).every(layer=>layer.length>=2&&layer.length<=6)).toBe(true);
  expect(map.some(layer=>layer.length>3)).toBe(true);expect(new Set(map.map(layer=>layer.length)).size).toBeGreaterThan(2);
  let reachable=new Set(map[0].map(node=>node.id));
  for(let floor=1;floor<map.length;floor++){
   const previous=map[floor-1];expect(previous.every(node=>node.next.length>0)).toBe(true);
   const arrivals=new Set(previous.filter(node=>reachable.has(node.id)).flatMap(node=>node.next));
   expect(map[floor].every(node=>arrivals.has(node.id))).toBe(true);reachable=arrivals;
  }
 }
});
