import type { ExpeditionGameState } from "../../domain/expedition/adventure-types";
import { nodeNames } from "../../domain/expedition/map";
import type { GameMotionEvent } from "../game-motion-events";
const target = (side: string, index: number) =>
  `[data-exp-target="${side}-${index}"]`;
export function expeditionMotionEvents(
  previous: ExpeditionGameState,
  next: ExpeditionGameState,
  actor: number,
): GameMotionEvent[] {
  const before = previous.view,
    after = next.view,
    events: GameMotionEvent[] = [];
  if (
    before.sequence === after.sequence &&
    before.combat.sequence === after.combat.sequence
  )
    return [];
  if (before.combat.battleSerial !== after.combat.battleSerial) {
    const node = after.map.flat().find((n) => n.id === after.current);
    return [
      {
        type: "celebrate",
        target: '[data-guide-target="expedition.status"]',
        label:
          node?.kind === "boss" ? after.combat.enemies[0].name : "遭遇开始",
      },
    ];
  }
  if (before.combat.sequence !== after.combat.sequence) {
    const groups = new Map<
        string,
        Extract<GameMotionEvent, { type: "effect" }>
      >(),
      used = new Set<number>();
    for (const event of after.combat.visuals) {
      if (event.amount <= 0) continue;
      const origin =
        event.origin ??
        (event.source !== undefined
          ? { side: "hero", index: event.source }
          : event.target);
      const source = target(origin.side, origin.index),
        destination = target(event.target.side, event.target.index),
        key = `${source}:${destination}:${event.kind}`;
      const existing = groups.get(key);
      if (existing) {
        existing.amount += event.amount;
        continue;
      }
      const sourceActor = event.source,
        oldHero =
          sourceActor !== undefined
            ? before.combat.heroes[sourceActor]
            : undefined,
        newHero =
          sourceActor !== undefined
            ? after.combat.heroes[sourceActor]
            : undefined;
      const card =
        sourceActor !== undefined &&
        !used.has(sourceActor) &&
        oldHero &&
        newHero
          ? oldHero.hand.find(
              (card) =>
                !newHero.hand.some((c) => c.id === card.id) &&
                [...newHero.played, ...newHero.exhaust].some(
                  (c) => c.id === card.id,
                ),
            )
          : undefined;
      groups.set(key, {
        type: "effect",
        kind: event.kind,
        amount: event.amount,
        source: card
          ? `[data-motion-key="expedition-card-${card.id}"]`
          : source,
        target: destination,
        ...(card ? { card: true } : {}),
      });
      if (card) used.add(event.source!);
    }
    events.push(...groups.values());
    before.combat.heroes.forEach((hero, index) => {
      if (used.has(index)) return;
      const now = after.combat.heroes[index],
        card = hero.hand.find(
          (card) =>
            !now.hand.some((c) => c.id === card.id) &&
            [...now.played, ...now.exhaust].some((c) => c.id === card.id),
        );
      if (card)
        events.push({
          type: "effect",
          kind: "status",
          amount: 0,
          source: `[data-motion-key="expedition-card-${card.id}"]`,
          target: target("hero", index),
          card: true,
        });
    });
    const ownBefore = before.combat.heroes[actor],
      ownAfter = after.combat.heroes[actor];
    if (ownBefore && ownAfter) {
      const known = new Set(ownBefore.hand.map((c) => c.id)),
        count = ownAfter.hand.filter((c) => !known.has(c.id)).length;
      if (count)
        events.push({
          type: "collect",
          count,
          source: `[data-motion-zone="expedition.deck-${actor}"]`,
          target: '[data-guide-target="expedition.hand"]',
        });
    }
  }
  if (before.phase !== after.phase) {
    if (after.phase === "won")
      events.push({
        type: "celebrate",
        target: '[data-guide-target="expedition.status"]',
        label: "远征胜利",
      });
    else if (after.phase === "reward")
      events.push({
        type: "celebrate",
        target: '[data-guide-target="expedition.status"]',
        label: "战斗胜利 · 选择战利品",
      });
    else if (after.current !== before.current) {
      const node = after.map.flat().find((node) => node.id === after.current);
      if (node)
        events.push({
          type: "celebrate",
          target: '[data-guide-target="expedition.status"]',
          label: nodeNames[node.kind],
        });
    }
  }
  return events.slice(0, 10);
}
