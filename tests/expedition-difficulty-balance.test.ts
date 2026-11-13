import { expect, it } from "vitest";
import { ascensionProfile } from "../src/domain/expedition/ascension";
import { expeditionDifficulties } from "../src/domain/expedition/adventure-types";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";

it("difficulty presets trade enemy scaling for starting compensation", () => {
  expect(expeditionDifficulties.story.compensation).toEqual({
    maxHp: 0,
    gold: 0,
    luck: 0,
    compass: 0,
  });
  expect(expeditionDifficulties.challenge.multiplier).toBeGreaterThan(
    expeditionDifficulties.standard.multiplier,
  );
  expect(expeditionDifficulties.standard.multiplier).toBeGreaterThan(
    expeditionDifficulties.story.multiplier,
  );
  const adventure = new ExpeditionAdventure(() => 0.42);
  const build = (difficulty: "story" | "standard" | "challenge") => {
    let state = adventure.create(1, false, {
      expedition: { difficulty },
    });
    state = adventure.apply(state, 0, {
      type: "expedition-action",
      move: { type: "profession", profession: 0 },
    });
    const hero = state.view.combat.heroes[0];
    return {
      hp: hero.maxHp,
      gold: hero.gold,
      luck: state.view.luck[0],
      compass: state.view.compass,
    };
  };
  const story = build("story"),
    standard = build("standard"),
    challenge = build("challenge");
  expect(challenge.hp - standard.hp).toBe(5);
  expect(standard.hp - story.hp).toBe(3);
  expect(challenge.gold - standard.gold).toBe(24);
  expect(standard.gold - story.gold).toBe(16);
  expect(challenge.luck - story.luck).toBe(2);
  expect(challenge.compass - story.compass).toBe(1);
});

it("ascension tiers add up to a soft but monotonic penalty curve", () => {
  const top = ascensionProfile(10);
  expect(top.enemyHealth).toBeCloseTo(1.1, 5);
  expect(top.enemyAttack).toBeCloseTo(1.04, 5);
  expect(top.bossHealth).toBe(1.08);
  expect(top.startGold).toBe(15);
  expect(top.startMaxHp).toBe(4);
  expect(top.startLuck).toBe(2);
  expect(top.startCompass).toBe(2);
  expect(top.modifierCount).toBe(2);
  expect(top.extraBossMinions).toBe(1);
  expect(top.extraRouteCost).toBe(1);
  expect(top.mechanicStart).toBe(1);
  let previous = ascensionProfile(0);
  for (let level = 1; level <= 10; level += 1) {
    const current = ascensionProfile(level);
    expect(current.enemyHealth).toBeGreaterThanOrEqual(previous.enemyHealth);
    expect(current.enemyAttack).toBeGreaterThanOrEqual(previous.enemyAttack);
    previous = current;
  }
});
