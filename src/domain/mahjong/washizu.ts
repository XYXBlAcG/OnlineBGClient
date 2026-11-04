import type { GameOptions } from "../game-options";
import type { Rules } from "../plugin";
import type { Action, Candidate } from "../types";
import { riichiDistance, riichiWaits, riichiWin } from "./riichi-hand";
import {
  isTransparent,
  mahjongMoveSchema,
  mahjongOptionsSchema,
  tileName,
  tileType,
  type MahjongMove,
  type MahjongState,
  type MahjongView,
  type RiichiCall,
} from "./types";

const seats = [0, 1, 2, 3];
const nextSeat = (actor: number) => (actor + 1) % 4;

function finishDraw(view: MahjongView) {
  const round = view.riichi!;
  const ready = seats.filter((actor) => riichiWaits(view, actor).length > 0);
  if (ready.length && ready.length < 4) {
    for (const from of seats.filter((actor) => !ready.includes(actor))) {
      for (const to of ready) {
        const amount = 3000 / ready.length / (4 - ready.length);
        view.scores[from] -= amount;
        view.scores[to] += amount;
        view.payments.push({
          from,
          to,
          amount,
          reason: "流局听牌",
          kind: "penalty",
        });
      }
    }
  }
  for (const to of seats.filter((actor) => round.ready[actor])) {
    view.scores[to] += 1000;
    view.payments.push({
      from: to,
      to,
      amount: 1000,
      reason: "单局流局退还立直棒",
      kind: "refund",
    });
  }
  round.sticks = 0;
  view.phase = "finished";
  view.finishedReason = "流局";
}

function draw(view: MahjongView, actor: number, kong = false) {
  const round = view.riichi!;
  if (!view.wall.length) {
    finishDraw(view);
    return;
  }
  const tile = kong ? round.deadWall[round.kongCount] : view.wall.shift()!;
  if (kong) {
    round.deadWall[round.kongCount] = view.wall.pop()!;
    round.kongCount++;
    round.dora.push(round.deadWall[4 + round.kongCount * 2]);
  }
  if (!round.ready[actor]) round.furiten[actor] = false;
  view.hands[actor].push(tile);
  view.turn = actor;
  view.phase = "play";
  view.lastDraw = { actor, tile, kong };
  round.forbidden = [];
  view.events.push({ type: "draw", actor, tiles: [tile] });
}

function settle(view: MahjongView, winners: number[], self: boolean) {
  const round = view.riichi!;
  const tile = self ? view.lastDraw!.tile : view.pending!.tile;
  const from = self ? winners[0] : view.pending!.actor;
  winners.forEach((actor, index) => {
    const score = riichiWin(view, actor, self, index === 0 ? round.sticks : 0)!;
    const { payments, ...details } = score;
    view.wins.push({ ...details, player: actor, from, tile });
    for (const seat of seats) {
      view.scores[seat] += payments[seat];
      if (payments[seat] < 0)
        view.payments.push({
          from: seat,
          to: actor,
          amount: -payments[seat],
          reason: self ? "自摸" : "荣和",
          kind: "win",
        });
    }
    view.events.push({ type: "win", actor, from, tiles: [tile] });
  });
  const first = winners[0];
  if (round.sticks)
    view.payments.push({
      from: first,
      to: first,
      amount: round.sticks * 1000,
      reason: "收取立直棒",
      kind: "win",
    });
  if (winners.some((actor) => round.ready[actor]))
    round.ura = round.dora.map((_, index) => round.deadWall[5 + index * 2]);
  round.sticks = 0;
  view.phase = "finished";
  view.finishedReason = self ? "自摸" : "荣和";
  view.pending = null;
}

function callsFor(view: MahjongView, actor: number): RiichiCall[] {
  const pending = view.pending!;
  const round = view.riichi!;
  if (pending.rob || round.ready[actor] || !view.wall.length) return [];
  const result: RiichiCall[] = [];
  const hand = view.hands[actor].slice().sort((a, b) => a - b);
  const type = tileType(pending.tile);
  for (const [index, a] of hand.entries()) {
    for (const b of hand.slice(index + 1)) {
      const types = [type, tileType(a), tileType(b)].sort((x, y) => x - y);
      if (types.every((t) => t === type))
        result.push({ type: "call", choice: "pong", tiles: [a, b] });
      else if (
        actor === nextSeat(pending.actor) &&
        types[2] < 27 &&
        Math.floor(types[0] / 9) === Math.floor(types[2] / 9) &&
        types[1] === types[0] + 1 &&
        types[2] === types[1] + 1
      ) {
        const forbidden = afterCallForbidden("chi", type, [a, b]);
        if (
          hand.some(
            (tile) =>
              tile !== a && tile !== b && !forbidden.includes(tileType(tile)),
          )
        )
          result.push({ type: "call", choice: "chi", tiles: [a, b] });
      }
    }
  }
  const copies = hand.filter((tile) => tileType(tile) === type);
  if (copies.length === 3 && round.kongCount < 4)
    result.push({ type: "call", choice: "kong", tiles: copies });
  const distinct = new Map<string, RiichiCall>();
  for (const call of result) {
    const pattern = call.tiles
      .map((tile) => `${tileType(tile)}:${isTransparent(tile)}`)
      .sort();
    const key = `${call.choice}:${pattern.join(",")}`;
    if (!distinct.has(key)) distinct.set(key, call);
  }
  return [...distinct.values()];
}

function afterCallForbidden(
  choice: RiichiCall["choice"],
  type: number,
  tiles: number[],
) {
  if (choice !== "chi") return [type];
  const adjacent = tiles.map(tileType).sort((a, b) => a - b);
  if (type < adjacent[0] && type % 9 <= 5) return [type, type + 3];
  if (type > adjacent[1] && type % 9 >= 3) return [type, type - 3];
  return [type];
}

function responseMoves(view: MahjongView, actor: number): MahjongMove[] {
  return [
    { type: "respond", choice: "pass" },
    ...(riichiWin(view, actor, false)
      ? [{ type: "respond", choice: "win" } as const]
      : []),
    ...callsFor(view, actor),
  ];
}

function resolveResponses(view: MahjongView) {
  const round = view.riichi!;
  const pending = view.pending!;
  const order = seats.slice(1).map((i) => (pending.actor + i) % 4);
  const winners = order.filter((actor) => view.responses[actor] === "win");
  if (winners.length) {
    settle(view, winners, false);
    return;
  }
  if (pending.declaration) {
    round.ready[pending.actor] = true;
    round.ippatsu[pending.actor] = true;
    view.scores[pending.actor] -= 1000;
    round.sticks++;
  }
  view.pending = null;
  if (pending.rob) {
    const meld = view.melds[pending.actor].find(
      (item) =>
        item.type === "pong" &&
        tileType(item.tiles[0]) === tileType(pending.tile),
    )!;
    meld.type = "added";
    meld.tiles.push(pending.tile);
    view.hands[pending.actor] = view.hands[pending.actor].filter(
      (tile) => tile !== pending.tile,
    );
    round.ippatsu.fill(false);
    view.events.push({
      type: "kong",
      actor: pending.actor,
      tiles: [pending.tile],
    });
    draw(view, pending.actor, true);
    return;
  }
  const caller =
    order.find(
      (actor) =>
        round.calls[actor]?.choice === "kong" ||
        round.calls[actor]?.choice === "pong",
    ) ?? order.find((actor) => round.calls[actor]?.choice === "chi");
  if (caller === undefined) {
    draw(view, nextSeat(pending.actor));
    return;
  }
  const call = round.calls[caller]!;
  round.ippatsu.fill(false);
  view.hands[caller] = view.hands[caller].filter(
    (tile) => !call.tiles.includes(tile),
  );
  view.rivers[pending.actor].pop();
  view.melds[caller].push({
    type: call.choice === "kong" ? "open" : call.choice,
    tiles: [pending.tile, ...call.tiles],
    from: pending.actor,
  });
  view.events.push({
    type: call.choice,
    actor: caller,
    from: pending.actor,
    tiles: [pending.tile, ...call.tiles],
  });
  if (call.choice === "kong") draw(view, caller, true);
  else {
    round.forbidden = afterCallForbidden(
      call.choice,
      tileType(pending.tile),
      call.tiles,
    );
    view.turn = caller;
    view.phase = "play";
    view.lastDraw = null;
  }
}

function openResponses(
  view: MahjongView,
  pending: NonNullable<MahjongView["pending"]>,
) {
  view.pending = pending;
  view.riichi!.calls = seats.map(() => null);
  view.responses = seats.map((actor) =>
    actor === pending.actor || responseMoves(view, actor).length === 1
      ? "pass"
      : null,
  );
  view.phase = "response";
  if (view.responses.every(Boolean)) resolveResponses(view);
}

export class WashizuRules implements Rules<"scmj"> {
  constructor(private readonly random: () => number) {}

  create(players: number, _team: boolean, options?: GameOptions): MahjongState {
    if (players !== 4) throw new Error("透明麻将需要四人");
    const wall = Array.from({ length: 136 }, (_, index) => index);
    for (let i = wall.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [wall[i], wall[j]] = [wall[j], wall[i]];
    }
    const deadWall = wall.splice(-14);
    const hands = seats.map(() => wall.splice(0, 13).sort((a, b) => a - b));
    const view: MahjongView = {
      sequence: 0,
      options: mahjongOptionsSchema.parse({
        ...options?.mahjong,
        mode: "washizu",
      }),
      phase: "play",
      dealer: 0,
      turn: 0,
      direction: 1,
      hands,
      wall,
      melds: seats.map(() => []),
      rivers: seats.map(() => []),
      lacks: seats.map(() => -1),
      exchange: seats.map(() => null),
      exchangeReady: seats.map(() => true),
      lackReady: seats.map(() => true),
      responses: seats.map(() => "pass"),
      passedFan: seats.map(() => -1),
      pending: null,
      wins: [],
      scores: seats.map(() => 25000),
      payments: [],
      events: [],
      lastDraw: null,
      finishedReason: "",
      riichi: {
        deadWall,
        dora: [deadWall[4]],
        ura: [],
        kongCount: 0,
        ready: seats.map(() => false),
        ippatsu: seats.map(() => false),
        furiten: seats.map(() => false),
        calls: seats.map(() => null),
        sticks: 0,
        forbidden: [],
        discardedTypes: seats.map(() => []),
      },
    };
    draw(view, 0);
    return { kind: "scmj", view };
  }

  finished({ view }: MahjongState) {
    return view.phase === "finished";
  }

  actors({ view }: MahjongState) {
    return view.phase === "response"
      ? seats.filter((actor) => view.responses[actor] === null)
      : view.phase === "play"
        ? [view.turn]
        : [];
  }

  candidates(state: MahjongState, actor: number): Candidate[] {
    if (!this.actors(state).includes(actor)) return [];
    const { view } = state;
    const round = view.riichi!;
    const hand = view.hands[actor];
    const moves: { move: MahjongMove; label: string }[] = [];
    if (view.phase === "response") {
      for (const move of responseMoves(view, actor)) {
        moves.push({
          move,
          label:
            move.type === "call"
              ? `${{ chi: "吃", pong: "碰", kong: "杠" }[move.choice]} ${move.tiles
                  .map(
                    (tile) =>
                      tileName(tile) + (isTransparent(tile) ? "·透" : "·暗"),
                  )
                  .join("、")}`
              : move.type === "respond" && move.choice === "win"
                ? "荣和"
                : "过",
        });
      }
    } else {
      if (riichiWin(view, actor, true))
        moves.push({ move: { type: "win" }, label: "自摸" });
      const drawn = view.lastDraw?.actor === actor ? view.lastDraw.tile : -1;
      for (const tile of hand) {
        if (
          (round.ready[actor] && tile !== drawn) ||
          round.forbidden.includes(tileType(tile))
        )
          continue;
        moves.push({
          move: { type: "discard", tile },
          label: `出 ${tileName(tile)}`,
        });
        if (
          !round.ready[actor] &&
          view.wall.length >= 4 &&
          view.scores[actor] >= 1000 &&
          view.melds[actor].every((meld) => meld.type === "closed") &&
          riichiDistance(
            view,
            actor,
            hand.filter((other) => other !== tile),
          ) === 0
        )
          moves.push({
            move: { type: "riichi", tile },
            label: `立直 · 出 ${tileName(tile)}`,
          });
      }
      if (drawn >= 0 && round.kongCount < 4 && view.wall.length) {
        const representatives = new Map(
          hand.map((tile) => [tileType(tile), tile]),
        );
        for (const [type, tile] of representatives) {
          const copies = hand.filter((other) => tileType(other) === type);
          if (round.ready[actor]) {
            if (copies.length !== 4 || tileType(drawn) !== type) continue;
            const prior = riichiWaits(
              view,
              actor,
              hand.filter((other) => other !== drawn),
            );
            const afterKong = {
              ...view,
              melds: view.melds.map((melds, seat) =>
                seat === actor
                  ? [
                      ...melds,
                      { type: "closed" as const, tiles: copies, from: actor },
                    ]
                  : melds,
              ),
            };
            const after = riichiWaits(
              afterKong,
              actor,
              hand.filter((other) => tileType(other) !== type),
            );
            if (!prior.length || prior.join() !== after.join()) continue;
          } else if (
            copies.length !== 4 &&
            !view.melds[actor].some(
              (meld) =>
                meld.type === "pong" && tileType(meld.tiles[0]) === type,
            )
          )
            continue;
          moves.push({
            move: { type: "kong", tile },
            label: `杠 ${tileName(tile)}`,
          });
        }
      }
    }
    return moves.map(({ move, label }) => ({
      action: { type: "scmj-action", move },
      label,
    }));
  }

  apply(state: MahjongState, actor: number, action: Action): MahjongState {
    if (action.type !== "scmj-action") throw new Error("不是麻将动作");
    const move = mahjongMoveSchema.parse(action.move);
    const next = structuredClone(state);
    const { view } = next;
    const round = view.riichi!;
    if (
      !this.candidates(state, actor).some(
        ({ action: candidate }) =>
          candidate.type === "scmj-action" &&
          JSON.stringify(candidate.move) === JSON.stringify(move),
      )
    )
      throw new Error("不是合法的透明麻将动作");
    view.sequence++;
    view.events = [];
    if (move.type === "win") settle(view, [actor], true);
    else if (move.type === "respond" || move.type === "call") {
      const win = move.type === "respond" && move.choice === "win";
      if (!win && riichiWin(view, actor, false)) round.furiten[actor] = true;
      round.calls[actor] = move.type === "call" ? move : null;
      view.responses[actor] = win ? "win" : "pass";
      if (view.responses.every(Boolean)) resolveResponses(view);
    } else if (move.type === "discard" || move.type === "riichi") {
      round.ippatsu[actor] = false;
      view.hands[actor] = view.hands[actor].filter(
        (tile) => tile !== move.tile,
      );
      view.rivers[actor].push(move.tile);
      const type = tileType(move.tile);
      if (!round.discardedTypes[actor].includes(type))
        round.discardedTypes[actor].push(type);
      view.events.push({ type: "discard", actor, tiles: [move.tile] });
      openResponses(view, {
        actor,
        tile: move.tile,
        rob: false,
        afterKong: !!view.lastDraw?.kong,
        declaration: move.type === "riichi",
      });
    } else if (move.type === "kong") {
      const type = tileType(move.tile);
      if (
        view.melds[actor].some(
          (meld) => meld.type === "pong" && tileType(meld.tiles[0]) === type,
        )
      )
        openResponses(view, {
          actor,
          tile: move.tile,
          rob: true,
          afterKong: false,
        });
      else {
        const tiles = view.hands[actor].filter(
          (tile) => tileType(tile) === type,
        );
        view.hands[actor] = view.hands[actor].filter(
          (tile) => tileType(tile) !== type,
        );
        view.melds[actor].push({ type: "closed", tiles, from: actor });
        round.ippatsu.fill(false);
        view.events.push({ type: "kong", actor, tiles });
        draw(view, actor, true);
      }
    }
    return next;
  }

  project(state: MahjongState, actor: number): MahjongState {
    const next = structuredClone(state);
    const { view } = next;
    const round = view.riichi!;
    const mask = (tiles: number[]) => [
      ...tiles.filter(isTransparent).sort((a, b) => a - b),
      ...tiles.filter((tile) => !isTransparent(tile)).map(() => -1),
    ];
    view.wall = view.wall.map(() => -1);
    view.hands = view.hands.map((tiles, seat) =>
      seat === actor || view.wins.some((win) => win.player === seat)
        ? tiles
        : mask(tiles),
    );
    round.deadWall = [];
    round.calls = round.calls.map((call, seat) =>
      seat === actor ? call : null,
    );
    round.furiten = round.furiten.map((value, seat) => seat === actor && value);
    view.responses = view.responses.map((response, seat) =>
      seat === actor ? response : null,
    );
    if (
      view.lastDraw &&
      view.lastDraw.actor !== actor &&
      !isTransparent(view.lastDraw.tile)
    )
      view.lastDraw.tile = -1;
    view.events = view.events.map((event) =>
      event.actor !== actor && event.type === "draw"
        ? { ...event, tiles: mask(event.tiles) }
        : event,
    );
    return next;
  }
}
