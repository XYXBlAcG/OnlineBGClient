import type { Rules } from "../plugin";
import type { Action, Candidate } from "../types";
import { analyzeHand } from "./hand";
import { activePlayers, pay, settleDraw, winPayment } from "./settlement";
import {
  mahjongMoveSchema,
  mahjongOptionsSchema,
  tileName,
  tileSuit,
  tileType,
  type MahjongState,
  type MahjongView,
  type MahjongMove,
} from "./types";
export function winScore(view: MahjongView, actor: number, self = false) {
  if (self && view.lastDraw?.actor !== actor) return null;
  const pending = view.pending,
    tiles = self
      ? view.hands[actor]
      : pending
        ? [...view.hands[actor], pending.tile]
        : [];
  return analyzeHand(
    tiles,
    view.melds[actor],
    view.lacks[actor],
    view.options,
    {
      self,
      kongDraw: self && !!view.lastDraw?.kong,
      kongDiscard: !self && !!pending?.afterKong,
      rob: !self && !!pending?.rob,
      last: !view.wall.length,
    },
  );
}
export function responseChoices(
  view: MahjongView,
  actor: number,
): ("pass" | "pong" | "kong" | "win")[] {
  const pending = view.pending;
  if (
    !pending ||
    actor === pending.actor ||
    view.wins.some((w) => w.player === actor)
  )
    return ["pass"];
  const choices: ("pass" | "pong" | "kong" | "win")[] = ["pass"];
  const score = winScore(view, actor);
  if (score && score.fan > view.passedFan[actor]) choices.push("win");
  const copies = view.hands[actor].filter(
    (t) => tileType(t) === tileType(pending.tile),
  );
  if (!pending.rob && tileSuit(pending.tile) !== view.lacks[actor]) {
    if (copies.length >= 2) choices.push("pong");
    if (copies.length >= 3 && view.wall.length) choices.push("kong");
  }
  return choices;
}
export function kongTiles(view: MahjongView, actor: number): number[] {
  if (!view.wall.length) return [];
  const hand = view.hands[actor];
  return hand.filter(
    (tile, i) =>
      hand.findIndex((t) => tileType(t) === tileType(tile)) === i &&
      tileSuit(tile) !== view.lacks[actor] &&
      (hand.filter((t) => tileType(t) === tileType(tile)).length === 4 ||
        view.melds[actor].some(
          (m) => m.type === "pong" && tileType(m.tiles[0]) === tileType(tile),
        )),
  );
}
function nextPlayer(view: MahjongView, actor: number): number {
  for (let i = 1; i <= 4; i++) {
    const next = (actor + i) % 4;
    if (!view.wins.some((w) => w.player === next)) return next;
  }
  throw new Error("没有待行动玩家");
}
function draw(view: MahjongView, actor: number, kong = false) {
  view.pending = null;
  view.turn = actor;
  view.passedFan[actor] = -1;
  if (activePlayers(view).length <= 1) {
    view.phase = "finished";
    view.finishedReason = "三家已胡，血战结束";
    return;
  }
  if (!view.wall.length) {
    settleDraw(view);
    return;
  }
  const tile = (kong ? view.wall.pop() : view.wall.shift())!;
  view.hands[actor].push(tile);
  view.hands[actor].sort((a, b) => a - b);
  view.lastDraw = { actor, tile, kong };
  view.phase = "play";
  view.events.push({ type: "draw", actor, tiles: [tile] });
}
function finishKong(
  view: MahjongView,
  actor: number,
  tile: number,
  kind: "closed" | "added" | "open",
  from = actor,
) {
  const hand = view.hands[actor],
    count = kind === "open" ? 3 : kind === "added" ? 1 : 4,
    copies = hand.filter((t) => tileType(t) === tileType(tile)).slice(0, count);
  view.hands[actor] = hand.filter((t) => !copies.includes(t));
  if (kind === "added") {
    const meld = view.melds[actor].find(
      (m) => m.type === "pong" && tileType(m.tiles[0]) === tileType(tile),
    )!;
    meld.type = "added";
    meld.tiles.push(...copies);
  } else
    view.melds[actor].push({
      type: kind,
      tiles: kind === "open" ? [...copies, tile] : copies,
      from,
    });
  const payers =
    kind === "open" ? [from] : activePlayers(view).filter((id) => id !== actor);
  for (const payer of payers)
    pay(
      view,
      payer,
      actor,
      kind === "added" ? 1 : 2,
      kind === "closed" ? "暗杠" : kind === "added" ? "补杠" : "点杠",
      "kong",
    );
  view.events.push({ type: "kong", actor, tiles: [tile], from });
  draw(view, actor, true);
}
function resolveResponses(view: MahjongView) {
  if (view.responses.some((r) => r === null)) return;
  const pending = view.pending!;
  const winners = activePlayers(view)
    .filter((id) => view.responses[id] === "win")
    .sort(
      (a, b) => ((a - pending.actor + 4) % 4) - ((b - pending.actor + 4) % 4),
    );
  if (winners.length) {
    for (const player of winners)
      winPayment(
        view,
        player,
        pending.actor,
        pending.tile,
        winScore(view, player)!,
      );
    if (pending.rob) {
      view.hands[pending.actor] = view.hands[pending.actor].filter(
        (t) => t !== pending.tile,
      );
      view.rivers[pending.actor].push(pending.tile);
    }
    draw(view, nextPlayer(view, pending.actor));
    return;
  }
  if (pending.rob) {
    finishKong(view, pending.actor, pending.tile, "added");
    return;
  }
  const claim = activePlayers(view)
    .filter((id) => ["pong", "kong"].includes(view.responses[id] || ""))
    .sort(
      (a, b) => ((a - pending.actor + 4) % 4) - ((b - pending.actor + 4) % 4),
    )[0];
  if (claim !== undefined) {
    view.rivers[pending.actor].pop();
    if (view.responses[claim] === "kong") {
      finishKong(view, claim, pending.tile, "open", pending.actor);
      return;
    }
    const copies = view.hands[claim]
      .filter((t) => tileType(t) === tileType(pending.tile))
      .slice(0, 2);
    view.hands[claim] = view.hands[claim].filter((t) => !copies.includes(t));
    view.melds[claim].push({
      type: "pong",
      tiles: [...copies, pending.tile],
      from: pending.actor,
    });
    view.pending = null;
    view.phase = "play";
    view.turn = claim;
    view.lastDraw = null;
    view.passedFan[claim] = -1;
    view.events.push({
      type: "pong",
      actor: claim,
      tiles: [pending.tile],
      from: pending.actor,
    });
    return;
  }
  draw(view, nextPlayer(view, pending.actor));
}
function openResponse(
  view: MahjongView,
  actor: number,
  tile: number,
  rob = false,
) {
  view.pending = { actor, tile, rob, afterKong: !!view.lastDraw?.kong };
  view.phase = "response";
  view.responses = [0, 1, 2, 3].map((id) =>
    responseChoices(view, id).length > 1 ? null : "pass",
  );
  resolveResponses(view);
}
export class SichuanRules implements Rules<"scmj"> {
  constructor(private random: () => number) {}
  create(players: number): MahjongState {
    if (players !== 4) throw new Error("四川麻将需要四个席位");
    const wall = Array.from({ length: 108 }, (_, i) => i);
    for (let i = 107; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [wall[i], wall[j]] = [wall[j], wall[i]];
    }
    const hands = Array.from({ length: 4 }, (_, i) =>
      wall.splice(0, i ? 13 : 14).sort((a, b) => a - b),
    );
    return {
      kind: "scmj",
      view: {
        sequence: 0,
        options: mahjongOptionsSchema.parse({}),
        phase: "exchange",
        dealer: 0,
        turn: 0,
        direction: 1 + Math.floor(this.random() * 3),
        hands,
        wall,
        melds: [[], [], [], []],
        rivers: [[], [], [], []],
        lacks: [-1, -1, -1, -1],
        exchange: [null, null, null, null],
        exchangeReady: [false, false, false, false],
        lackReady: [false, false, false, false],
        responses: ["pass", "pass", "pass", "pass"],
        passedFan: [-1, -1, -1, -1],
        pending: null,
        wins: [],
        scores: [0, 0, 0, 0],
        payments: [],
        events: [],
        lastDraw: { actor: 0, tile: hands[0].at(-1)!, kong: false },
        finishedReason: "",
      },
    };
  }
  finished(state: MahjongState) {
    return state.view.phase === "finished";
  }
  actors({ view }: MahjongState): number[] {
    if (view.phase === "exchange")
      return [0, 1, 2, 3].filter((id) => !view.exchangeReady[id]);
    if (view.phase === "lack")
      return [0, 1, 2, 3].filter((id) => !view.lackReady[id]);
    if (view.phase === "response")
      return [0, 1, 2, 3].filter((id) => view.responses[id] === null);
    return view.phase === "play" ? [view.turn] : [];
  }
  candidates(state: MahjongState, actor: number): Candidate[] {
    const view = state.view;
    if (!this.actors(state).includes(actor)) return [];
    const moves: { move: MahjongMove; label: string }[] = [];
    if (view.phase === "exchange") {
      const hand = view.hands[actor],
        seen = new Set<string>();
      for (let a = 0; a < hand.length; a++)
        for (let b = a + 1; b < hand.length; b++)
          for (let c = b + 1; c < hand.length; c++) {
            const tiles = [hand[a], hand[b], hand[c]];
            if (new Set(tiles.map(tileSuit)).size !== 1) continue;
            const key = tiles.map(tileType).join(",");
            if (seen.has(key)) continue;
            seen.add(key);
            moves.push({
              move: { type: "exchange", tiles },
              label: `换出 ${tiles.map(tileName).join("、")}`,
            });
          }
    } else if (view.phase === "lack")
      for (let suit = 0; suit < 3; suit++)
        moves.push({
          move: { type: "lack", suit },
          label: `定缺${["万", "筒", "条"][suit]}`,
        });
    else if (view.phase === "response")
      for (const choice of responseChoices(view, actor))
        moves.push({
          move: { type: "respond", choice },
          label: { pass: "过", pong: "碰", kong: "杠", win: "胡" }[choice],
        });
    else if (view.phase === "play") {
      if (winScore(view, actor, true))
        moves.push({ move: { type: "win" }, label: "自摸胡牌" });
      for (const tile of kongTiles(view, actor))
        moves.push({
          move: { type: "kong", tile },
          label: `杠 ${tileName(tile)}`,
        });
      const hand = view.hands[actor],
        hasLack = hand.some((t) => tileSuit(t) === view.lacks[actor]);
      for (const tile of hand.filter(
        (t, i) =>
          hand.findIndex((v) => tileType(v) === tileType(t)) === i &&
          (!hasLack || tileSuit(t) === view.lacks[actor]),
      ))
        moves.push({
          move: { type: "discard", tile },
          label: `出 ${tileName(tile)}`,
        });
    }
    return moves.map(({ move, label }) => ({
      action: { type: "scmj-action", move },
      label,
    }));
  }
  apply(state: MahjongState, actor: number, action: Action): MahjongState {
    if (action.type !== "scmj-action" || !this.actors(state).includes(actor))
      throw new Error("当前不能执行此麻将动作");
    const move = mahjongMoveSchema.parse(action.move),
      next = structuredClone(state),
      view = next.view,
      hand = view.hands[actor];
    view.events = [];
    view.sequence++;
    const legal = this.candidates(state, actor).some(
      (c) =>
        c.action.type === "scmj-action" &&
        JSON.stringify(c.action.move) === JSON.stringify(move),
    );
    if (move.type === "exchange") {
      if (
        view.phase !== "exchange" ||
        new Set(move.tiles).size !== 3 ||
        !move.tiles.every((t) => hand.includes(t)) ||
        new Set(move.tiles.map(tileSuit)).size !== 1
      )
        throw new Error("请选择自己手中的三张同花色牌");
      view.exchange[actor] = [...move.tiles];
      view.exchangeReady[actor] = true;
      if (view.exchangeReady.every(Boolean)) {
        for (let id = 0; id < 4; id++)
          view.hands[id] = view.hands[id].filter(
            (t) => !view.exchange[id]!.includes(t),
          );
        for (let id = 0; id < 4; id++) {
          const to = (id + view.direction) % 4;
          view.hands[to].push(...view.exchange[id]!);
          view.hands[to].sort((a, b) => a - b);
          view.events.push({
            type: "exchange",
            actor: id,
            from: to,
            tiles: [...view.exchange[id]!],
          });
        }
        view.exchange = [null, null, null, null];
        view.phase = "lack";
      }
    } else if (move.type === "discard") {
      if (
        view.phase !== "play" ||
        !hand.includes(move.tile) ||
        (hand.some((t) => tileSuit(t) === view.lacks[actor]) &&
          tileSuit(move.tile) !== view.lacks[actor])
      )
        throw new Error("请先打出定缺花色");
      view.hands[actor] = hand.filter((t) => t !== move.tile);
      view.rivers[actor].push(move.tile);
      view.events.push({ type: "discard", actor, tiles: [move.tile] });
      openResponse(view, actor, move.tile);
    } else {
      if (!legal) throw new Error("不是合法的麻将动作");
      if (move.type === "lack") {
        view.lacks[actor] = move.suit;
        view.lackReady[actor] = true;
        if (view.lackReady.every(Boolean)) view.phase = "play";
      } else if (move.type === "kong") {
        if (
          view.melds[actor].some(
            (m) =>
              m.type === "pong" && tileType(m.tiles[0]) === tileType(move.tile),
          )
        )
          openResponse(view, actor, move.tile, true);
        else finishKong(view, actor, move.tile, "closed");
      } else if (move.type === "win") {
        winPayment(
          view,
          actor,
          actor,
          view.lastDraw?.tile ?? hand.at(-1)!,
          winScore(view, actor, true)!,
        );
        draw(view, nextPlayer(view, actor));
      } else if (move.type === "respond") {
        const score = winScore(view, actor);
        if (move.choice !== "win" && score)
          view.passedFan[actor] = Math.max(view.passedFan[actor], score.fan);
        view.responses[actor] = move.choice;
        resolveResponses(view);
      }
    }
    return next;
  }
  project(state: MahjongState, actor: number): MahjongState {
    const result = structuredClone(state),
      view = result.view;
    view.wall = view.wall.map(() => -1);
    view.hands = view.hands.map((tiles, id) =>
      id === actor ||
      view.wins.some((w) => w.player === id) ||
      view.phase === "finished"
        ? tiles
        : tiles.map(() => -1),
    );
    view.exchange = view.exchange.map((tiles, id) =>
      id === actor ? tiles : null,
    );
    if (view.phase === "lack")
      view.lacks = view.lacks.map((suit, id) => (id === actor ? suit : -1));
    view.melds = view.melds.map((melds, id) =>
      melds.map((m) =>
        m.type === "closed" && id !== actor && view.phase !== "finished"
          ? { ...m, tiles: m.tiles.map(() => -1) }
          : m,
      ),
    );
    if (view.lastDraw?.actor !== actor && view.lastDraw)
      view.lastDraw.tile = -1;
    view.events = view.events.map((e) =>
      (e.type === "draw" && e.actor !== actor) ||
      (e.type === "exchange" && e.actor !== actor && e.from !== actor) ||
      (e.type === "kong" &&
        e.actor !== actor &&
        state.view.melds[e.actor].some(
          (m) => m.type === "closed" && m.tiles.includes(e.tiles[0]),
        ))
        ? { ...e, tiles: e.tiles.map(() => -1) }
        : e,
    );
    view.responses = view.responses.map((r, id) => (id === actor ? r : null));
    view.passedFan = view.passedFan.map((v, id) => (id === actor ? v : -1));
    return result;
  }
}
