import type { GameState } from "../domain/types";
export type GameMotionEvent =
  | { type: "celebrate"; target: string; label: string }
  | { type: "collect"; count: number; source: string; target: string }
  | {
      type: "draw";
      actor: number;
      card?: number;
      reveal: boolean;
      back?: string;
      source: string;
      target: string;
    }
  | { type: "card"; card: number; source: string; target: string }
  | {
      type: "piece";
      source: string;
      target: string;
      route: number[];
      cells: string;
    }
  | { type: "build"; target: string }
  | { type: "beam"; source: string; target: string };
const avatar = (actor: number) => `[data-game-avatar="${actor}"]`;
const key = (value: string) => `[data-motion-key="${value}"]`;
const added = (before: number[], after: number[]) => {
  const known = new Set(before);
  return after.filter((id) => id >= 0 && !known.has(id));
};
export function gameMotionEvents(
  previous: GameState,
  next: GameState,
  actor: number,
): GameMotionEvent[] {
  if (previous.kind !== next.kind) return [];
  const events: GameMotionEvent[] = [];
  switch (next.kind) {
    case "scmj":
      if (previous.kind === "scmj") {
        const view = next.view,
          before = previous.view;
        if (view.sequence === before.sequence) break;
        for (const tile of added(
          before.hands[actor] || [],
          view.hands[actor] || [],
        )) {
          const exchange = view.events.find(
            (e) => e.type === "exchange" && e.from === actor,
          );
          if (
            view.events.some((e) => e.type === "draw" && e.actor === actor) ||
            exchange
          )
            events.push({
              type: "draw",
              actor,
              card: tile,
              reveal: true,
              source: exchange
                ? avatar(exchange.actor)
                : '[data-motion-zone="scmj.wall"]',
              target: `.scmj-hand ${key(`scmj-tile-${tile}`)}`,
              back: ".scmj-wall",
            });
        }
        for (const event of view.events) {
          if (event.type === "draw" && event.actor !== actor)
            events.push({
              type: "draw",
              actor: event.actor,
              reveal: false,
              source: '[data-motion-zone="scmj.wall"]',
              target: avatar(event.actor),
              back: ".scmj-wall",
            });
          if (event.type === "exchange" && event.from !== actor)
            events.push({
              type: "draw",
              actor: event.from!,
              reveal: false,
              source: avatar(event.actor),
              target: avatar(event.from!),
              back: ".scmj-wall",
            });
          if (event.type === "discard")
            for (const tile of event.tiles)
              if (tile >= 0)
                events.push({
                  type: "card",
                  card: tile,
                  source:
                    event.actor === actor
                      ? `.scmj-hand ${key(`scmj-tile-${tile}`)}`
                      : avatar(event.actor),
                  target: `.scmj-river ${key(`scmj-tile-${tile}`)}`,
                });
          if (event.type === "pong" || event.type === "kong")
            for (const tile of view.melds[event.actor]
              .flatMap((m) => m.tiles)
              .filter(
                (t) =>
                  t >= 0 &&
                  !before.melds[event.actor].some((m) => m.tiles.includes(t)),
              )) {
              const river = before.rivers.flat().includes(tile);
              events.push({
                type: "card",
                card: tile,
                source: river
                  ? `.scmj-river ${key(`scmj-tile-${tile}`)}`
                  : event.actor === actor
                    ? `.scmj-hand ${key(`scmj-tile-${tile}`)}`
                    : avatar(event.actor),
                target: `.scmj-melds ${key(`scmj-tile-${tile}`)}`,
              });
            }
          if (event.type === "win") {
            const win = view.wins.find((w) => w.player === event.actor)!;
            events.push({
              type: "celebrate",
              target: avatar(event.actor),
              label: `胡 · ${win.labels.join("、")}`,
            });
          }
        }
      }
      break;
    case "uno":
      if (previous.kind === "uno") {
        next.view.playerCards.forEach((cards, player) => {
          if (player === actor)
            for (const card of added(
              previous.view.playerCards[player],
              cards,
            ).slice(0, 4))
              events.push({
                type: "draw",
                actor,
                card,
                reveal: true,
                source: '[data-motion-zone="uno.deck"]',
                target: `.uno-list ${key(`uno-card-${card}`)}`,
              });
          else if (cards.length > previous.view.playerCards[player].length)
            events.push({
              type: "draw",
              actor: player,
              reveal: false,
              source: '[data-motion-zone="uno.deck"]',
              target: avatar(player),
            });
        });
        if (
          previous.view.topCard !== next.view.topCard &&
          next.view.isStart &&
          previous.view.isStart
        ) {
          const player = next.view.lastOpInfo.playerId;
          events.push({
            type: "card",
            card: next.view.topCard,
            source:
              player === actor
                ? `.uno-list ${key(`uno-card-${next.view.topCard}`)}`
                : avatar(player),
            target: `[data-motion-zone="uno.discard"] ${key(`uno-card-${next.view.topCard}`)}`,
          });
        }
      }
      break;
    case "tq":
      if (previous.kind === "tq") {
        const { playerId, route } = next.view.lastOp;
        if (route.length > 1) {
          const index =
            previous.view.playerPieces[playerId]?.indexOf(route[0]) ?? -1;
          if (
            index >= 0 &&
            next.view.playerPieces[playerId]?.[index] === route.at(-1)
          ) {
            const selector = key(`tq-piece-${playerId}-${index}`);
            events.push({
              type: "piece",
              source: selector,
              target: selector,
              route,
              cells: "tq.cell",
            });
          }
        }
      }
      break;
    case "fxq":
      if (previous.kind === "fxq")
        next.view.planePositionList.forEach((position, index) => {
          if (position === previous.view.planePositionList[index]) return;
          const route =
            next.view.lastAirline[0] === index
              ? [
                  previous.view.planePositionList[index],
                  ...next.view.lastAirline.slice(1),
                  position,
                ]
              : [previous.view.planePositionList[index], position];
          const selector = key(`fxq-plane-${index}`);
          events.push({
            type: "piece",
            source: selector,
            target: selector,
            route,
            cells: `fxq.route-${index}`,
          });
        });
      break;
    case "ktd":
      if (previous.kind === "ktd")
        next.view.playerData.forEach((player, index) => {
          for (const house of player.houses)
            if (!previous.view.playerData[index].houses.includes(house))
              events.push({
                type: "build",
                target: key(`ktd-house-${index}-${house >> 1}`),
              });
          for (const road of added(
            previous.view.playerData[index].roads,
            player.roads,
          ))
            events.push({
              type: "build",
              target: key(`ktd-road-${index}-${road}`),
            });
        });
      break;
    case "ccbs":
      if (previous.kind === "ccbs")
        next.view.playerCard.forEach((cards, player) => {
          for (const card of added(previous.view.playerCard[player], cards))
            events.push({
              type: "card",
              card,
              source: `[data-guide-small="false"]${key(`ccbs-card-${card}`)}`,
              target: `[data-guide-small="true"]${key(`ccbs-card-${card}`)}`,
            });
          for (const card of added(
            previous.view.playerNoble[player],
            next.view.playerNoble[player],
          ))
            events.push({
              type: "card",
              card,
              source: `[data-guide-small="false"]${key(`ccbs-noble-${card}`)}`,
              target: `[data-guide-small="true"]${key(`ccbs-noble-${card}`)}`,
            });
        });
      break;
    case "sgs":
      if (previous.kind === "sgs") {
        for (const card of added(
          previous.view.playerHandCard[actor] || [],
          next.view.playerHandCard[actor] || [],
        ).slice(0, 4))
          events.push({
            type: "draw",
            actor,
            card,
            reveal: false,
            source: avatar(actor),
            target: `.sgs-card-list ${key(`sgs-card-${card}`)}`,
          });
        const old = new Set(previous.view.showCards.map((c) => c.cardId));
        for (const shown of next.view.showCards) {
          if (old.has(shown.cardId) || shown.isBack) continue;
          const player =
            shown.fromPlayerPos === undefined ? actor : shown.fromPlayerPos - 1;
          events.push({
            type: "card",
            card: shown.cardId,
            source:
              player === actor
                ? `.sgs-card-list ${key(`sgs-card-${shown.cardId}`)}`
                : avatar(player),
            target: `[data-motion-zone="sgs.public-card"] ${key(`sgs-card-${shown.cardId}`)}`,
          });
        }
        const line = next.view.showLine;
        if (
          JSON.stringify(line) !== JSON.stringify(previous.view.showLine) &&
          line.fromPlayerPos !== undefined
        )
          for (const target of line.toPlayerIds || [])
            events.push({
              type: "beam",
              source: avatar(line.fromPlayerPos - 1),
              target: avatar(target),
            });
      }
      break;
    case "dy":
      if (previous.kind === "dy") {
        const last = next.view.lastOp,
          player = last.playerId - 1;
        if (
          last.putCard !== undefined &&
          player >= 0 &&
          previous.view.players[player]?.length >
            next.view.players[player]?.length
        ) {
          const pot = next.view.pots.findIndex((cards) =>
            cards.includes(last.putCard!),
          );
          if (pot < 0) break;
          const zone = `[data-guide-target="dy.pot"][data-guide-id="${pot}"]`;
          events.push({
            type: "card",
            card: last.putCard,
            source:
              player === actor
                ? `[data-guide-target="dy.hand"] ${key(`dy-card-${last.putCard}`)}`
                : avatar(player),
            target: `${zone} ${key(`dy-card-${last.putCard}`)}`,
          });
          if (last.eatCardList.length)
            events.push({
              type: "collect",
              count: last.eatCardList.length,
              source: zone,
              target: avatar(player),
            });
        }
      }
      break;
    case "ddz":
      if (previous.kind === "ddz") {
        for (const card of next.view.lastCards)
          if (
            !previous.view.playedCardList.includes(card) &&
            next.view.playedCardList.includes(card)
          ) {
            const owner = previous.view.state - 1;
            events.push({
              type: "card",
              card,
              source:
                owner === actor
                  ? `.ddz-poker-list ${key(`ddz-card-${card}`)}`
                  : avatar(owner),
              target: `[data-motion-zone="ddz.public"] ${key(`ddz-card-${card}`)}`,
            });
          }
      }
      break;
  }
  return events.slice(0, 12);
}
