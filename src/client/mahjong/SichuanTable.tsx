import { useMemo, useState } from "react";
import type { GameSnapshot } from "../OriginalGame";
import { AvatarSurface, type AvatarSurfaceProps } from "../AvatarSurface";
import type { Action } from "../../domain/types";
import {
  SichuanRules,
  responseChoices,
  kongTiles,
  winScore,
} from "../../domain/mahjong/rules";
import {
  suitNames,
  isTransparent,
  mahjongModeNames,
  tileName,
  tileSuit,
  tileType,
  type MahjongMove,
} from "../../domain/mahjong/types";
import { winningTiles } from "../../domain/mahjong/hand";
import { MahjongTile } from "./MahjongTile";
import { Panel } from "../ui/Controls";
import "./mahjong.css";
const rules = new SichuanRules(Math.random);
export function SichuanTable({
  snapshot,
  act,
  replay,
  avatar,
  onAutoplay,
}: {
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  replay: boolean;
  onAutoplay?: (enabled: boolean) => void;
  avatar: Omit<AvatarSurfaceProps, "index">;
}) {
  const [selection, setSelection] = useState({
      key: "",
      tiles: [] as number[],
    }),
    [scores, setScores] = useState(false),
    [help, setHelp] = useState(false),
    [inspectSeat, setInspectSeat] = useState<number | null>(null);
  const visible = snapshot.state?.kind === "scmj" ? snapshot.state.view : null,
    viewer = Math.max(0, snapshot.actor);
  const selectionKey = visible
    ? `${snapshot.actor}:${visible.phase}:${visible.hands[viewer].join(",")}:${visible.pending?.tile}`
    : "";
  const selected = selection.key === selectionKey ? selection.tiles : [];
  const waits = useMemo(
    () =>
      visible &&
      !visible.riichi &&
      visible.hands[viewer].every((t) => t >= 0) &&
      visible.hands[viewer].length % 3 === 1
        ? winningTiles(
            visible.hands[viewer],
            visible.melds[viewer],
            visible.lacks[viewer],
            visible.options,
          )
        : [],
    [visible, viewer],
  );
  if (snapshot.state?.kind !== "scmj") return null;
  const state = snapshot.state,
    v = state.view,
    me = Math.max(0, snapshot.actor),
    interactive =
      !replay &&
      !snapshot.finished &&
      snapshot.actor >= 0 &&
      !snapshot.seats[me].difficulty &&
      !snapshot.seats[me].autoplay,
    turn = interactive && rules.actors(state).includes(me),
    phase = v.phase,
    hand = v.hands[me];
  const transparent = !!v.riichi;
  const PublicHand = transparent ? "button" : "div";
  const modeName = mahjongModeNames[transparent ? "washizu" : "sichuan"];
  const choices =
    transparent && turn
      ? (snapshot.candidates ?? []).flatMap(({ action, label }) =>
          action.type === "scmj-action" ? [{ move: action.move, label }] : [],
        )
      : [];
  const discard = choices.find(
    (choice) =>
      choice.move.type === "discard" && choice.move.tile === selected[0],
  );
  const send = (move: MahjongMove) => {
    if (turn) act({ type: "scmj-action", move });
  };
  const response =
    !transparent && turn && phase === "response" ? responseChoices(v, me) : [];
  const exchangeValid =
    selected.length === 3 && new Set(selected.map(tileSuit)).size === 1;
  const selectedTile = selected[0],
    mustLack = hand.some((t) => tileSuit(t) === v.lacks[me]);
  const canDiscard =
    turn &&
    phase === "play" &&
    selected.length === 1 &&
    (!mustLack || tileSuit(selectedTile) === v.lacks[me]);
  const title =
    phase === "finished"
      ? v.finishedReason
      : phase === "exchange"
        ? v.exchangeReady[me]
          ? "等待其他玩家换牌"
          : "请选择三张同花色牌"
        : phase === "lack"
          ? v.lackReady[me]
            ? "等待其他玩家定缺"
            : "请选择要打缺的花色"
          : phase === "response"
            ? turn
              ? "可以响应这张牌"
              : "等待响应结算"
            : `${snapshot.seats[v.turn].name}出牌`;
  const seat = (id: number, position: string) => (
    <section
      className={`scmj-seat scmj-${position}`}
      key={id}
      data-guide-target={id === me ? "scmj.score" : undefined}
    >
      <div className="scmj-player">
        <AvatarSurface
          {...avatar}
          index={id}
          isTurn={
            (phase === "play" && v.turn === id) ||
            (phase === "response" && turn && id === me)
          }
        />
        <div>
          <strong>
            {snapshot.seats[id].name}
            {id === v.dealer ? " · 庄" : ""}
          </strong>
          <small>
            {v.wins.some((w) => w.player === id)
              ? `已胡 · 第${v.wins.findIndex((w) => w.player === id) + 1}家`
              : transparent
                ? `${v.hands[id].length} 张${v.riichi?.ready[id] ? " · 立直" : ""}`
                : `${v.hands[id].length} 张 · ${v.lacks[id] < 0 ? "待定缺" : `缺${suitNames[v.lacks[id]]}`}`}{" "}
            · {v.scores[id] > 0 ? "+" : ""}
            {v.scores[id]} 分
          </small>
        </div>
      </div>
      {id !== me && (
        <PublicHand
          className="scmj-hidden-hand"
          type={transparent ? "button" : undefined}
          onClick={transparent ? () => setInspectSeat(id) : undefined}
          aria-label={`${snapshot.seats[id].name}的公开手牌`}
        >
          {v.hands[id].map((tile, i) => (
            <span key={tile < 0 ? i : tile}>
              <MahjongTile
                tile={tile}
                transparent={transparent && isTransparent(tile)}
              />
            </span>
          ))}
        </PublicHand>
      )}
      <div
        className="scmj-melds"
        data-guide-target={id === me ? "scmj.melds" : undefined}
      >
        {v.melds[id].map((meld, i) => (
          <div
            className="scmj-meld"
            key={i}
            aria-label={
              meld.type === "chi"
                ? "吃牌"
                : meld.type === "pong"
                  ? "碰牌"
                  : meld.type === "closed"
                    ? "暗杠"
                    : "杠牌"
            }
          >
            {meld.tiles.map((tile, j) => (
              <span
                data-motion-key={tile >= 0 ? `scmj-tile-${tile}` : undefined}
                key={j}
              >
                <MahjongTile
                  tile={tile}
                  transparent={transparent && isTransparent(tile)}
                />
              </span>
            ))}
          </div>
        ))}
      </div>
      <div
        className="scmj-river"
        data-guide-target="scmj.river"
        data-guide-player={id}
      >
        {v.rivers[id].map((tile) => (
          <span
            className={v.pending?.tile === tile ? "is-last" : ""}
            data-motion-key={`scmj-tile-${tile}`}
            key={tile}
          >
            <MahjongTile
              tile={tile}
              transparent={transparent && isTransparent(tile)}
            />
          </span>
        ))}
      </div>
    </section>
  );
  return (
    <section className="scmj-table">
      <header className="scmj-heading">
        <span>{modeName}</span>
        <div>
          {!replay &&
            !snapshot.finished &&
            snapshot.actor >= 0 &&
            onAutoplay && (
              <button onClick={() => onAutoplay(!snapshot.seats[me].autoplay)}>
                {snapshot.seats[me].autoplay ? "取消托管" : "托管"}
              </button>
            )}
          <button onClick={() => setHelp(true)}>牌桌规则</button>
          <button onClick={() => setScores(true)}>结算明细</button>
        </div>
      </header>
      <div className="scmj-board">
        {seat((me + 2) % 4, "north")}
        {seat((me + 3) % 4, "west")}
        <div className="scmj-center">
          <span>
            余牌 <strong>{v.wall.length}</strong>
          </span>
          <strong role="status">{title}</strong>
          {v.riichi && (
            <div className="scmj-dora">
              <span>宝牌指示</span>
              {v.riichi.dora.map((tile) => (
                <MahjongTile key={tile} tile={tile} />
              ))}
              {v.riichi.ura.length > 0 && (
                <>
                  <span>里宝牌指示</span>
                  {v.riichi.ura.map((tile) => (
                    <MahjongTile key={tile} tile={tile} />
                  ))}
                </>
              )}
            </div>
          )}
          {phase === "exchange" && (
            <small>
              换牌方向：
              {v.direction === 1 ? "下家" : v.direction === 2 ? "对家" : "上家"}
            </small>
          )}
          <div className="scmj-wall" data-motion-zone="scmj.wall">
            <MahjongTile tile={-1} />
          </div>
          <div className="scmj-last" key={v.pending?.tile ?? "none"}>
            <MahjongTile tile={v.pending?.tile ?? -1} />
          </div>
          {v.pending && (
            <small>
              {snapshot.seats[v.pending.actor].name} ·{" "}
              {v.pending.rob
                ? "补杠"
                : v.pending.declaration
                  ? "宣告立直"
                  : "出牌"}{" "}
              · {tileName(v.pending.tile)}
            </small>
          )}
          {v.wins.length > 0 && (
            <span className="scmj-win-count">{v.wins.length} 家已胡</span>
          )}
        </div>
        {seat((me + 1) % 4, "east")}
        <div className="scmj-own">
          {seat(me, "south")}
          <div className="scmj-actions" data-guide-target="scmj.actions">
            {turn &&
              phase === "lack" &&
              suitNames.map((name, suit) => (
                <button
                  key={name}
                  className="primary-button"
                  onClick={() => send({ type: "lack", suit })}
                >
                  定缺{name}
                </button>
              ))}
            {turn && phase === "exchange" && (
              <>
                <span>{selected.length} / 3</span>
                <button
                  className="primary-button"
                  disabled={!exchangeValid}
                  onClick={() =>
                    send({
                      type: "exchange",
                      tiles: [...selected].sort((a, b) => a - b),
                    })
                  }
                >
                  确认换三张
                </button>
              </>
            )}
            {transparent && turn && phase === "play" && (
              <button
                className="primary-button"
                disabled={!discard}
                onClick={() => {
                  if (discard) send(discard.move);
                }}
              >
                出牌
              </button>
            )}
            {choices
              .filter(
                ({ move }) =>
                  move.type !== "discard" &&
                  (move.type !== "riichi" || move.tile === selectedTile),
              )
              .map(({ move, label }) => (
                <button key={JSON.stringify(move)} onClick={() => send(move)}>
                  {label}
                </button>
              ))}
            {!transparent && turn && phase === "play" && (
              <>
                <button
                  className="primary-button"
                  disabled={!canDiscard}
                  onClick={() => send({ type: "discard", tile: selectedTile })}
                >
                  出牌
                </button>
                {kongTiles(v, me).map((tile) => (
                  <button
                    key={tile}
                    onClick={() => send({ type: "kong", tile })}
                  >
                    杠 {tileName(tile)}
                  </button>
                ))}
                {winScore(v, me, true) && (
                  <button
                    className="primary-button"
                    onClick={() => send({ type: "win" })}
                  >
                    自摸胡牌
                  </button>
                )}
              </>
            )}
            {response.map((choice) => (
              <button
                key={choice}
                className={choice === "win" ? "primary-button" : ""}
                onClick={() => send({ type: "respond", choice })}
              >
                {{ pass: "过", pong: "碰", kong: "杠", win: "胡" }[choice]}
              </button>
            ))}
            {!turn && phase !== "finished" && (
              <span className="muted">
                {v.wins.some((w) => w.player === me)
                  ? "你已胡牌，可以继续观战"
                  : snapshot.actor < 0
                    ? "全 AI 观战"
                    : title}
              </span>
            )}
            {phase === "finished" && (
              <button
                className="primary-button"
                onClick={() => setScores(true)}
              >
                查看本局结算
              </button>
            )}
          </div>
          <div className="scmj-hand" data-guide-target="scmj.hand">
            {hand.map((tile, i) => (
              <button
                type="button"
                key={tile < 0 ? i : tile}
                className={`scmj-tile ${selected.includes(tile) ? "is-selected" : ""} ${tile >= 0 && tileSuit(tile) === v.lacks[me] ? "is-lack" : ""}`}
                disabled={
                  !turn ||
                  !["play", "exchange"].includes(phase) ||
                  tile < 0 ||
                  (transparent &&
                    !choices.some(
                      ({ move }) =>
                        move.type === "discard" && move.tile === tile,
                    ))
                }
                aria-label={
                  tileName(tile) +
                  (transparent && tile >= 0
                    ? isTransparent(tile)
                      ? "，透明牌"
                      : "，暗牌"
                    : "")
                }
                aria-pressed={selected.includes(tile)}
                data-motion-key={tile >= 0 ? `scmj-tile-${tile}` : undefined}
                onClick={() =>
                  setSelection((previous) => {
                    const old =
                      previous.key === selectionKey ? previous.tiles : [];
                    return {
                      key: selectionKey,
                      tiles:
                        phase === "exchange"
                          ? old.includes(tile)
                            ? old.filter((t) => t !== tile)
                            : old.length < 3
                              ? [...old, tile]
                              : old
                          : old.includes(tile)
                            ? []
                            : [tile],
                    };
                  })
                }
              >
                <MahjongTile
                  tile={tile}
                  transparent={transparent && isTransparent(tile)}
                />
                {tile >= 0 && tileSuit(tile) === v.lacks[me] && (
                  <span className="scmj-lack-mark">缺</span>
                )}
              </button>
            ))}
          </div>
          <footer className="scmj-footer">
            {!transparent && (
              <span data-guide-target="scmj.lack">
                定缺：{v.lacks[me] < 0 ? "未选" : suitNames[v.lacks[me]]}
              </span>
            )}
            <span>
              {phase === "exchange"
                ? "先选三张同色牌，再确认"
                : mustLack
                  ? "金色标记为缺门，须优先打出"
                  : "选择手牌后出牌"}
            </span>
            {waits.length > 0 && (
              <details>
                <summary>听牌提示</summary>
                {waits.map((w) => (
                  <span key={w.type}>
                    {tileName(w.type * 4)} · {w.score.labels.join("、")}{" "}
                  </span>
                ))}
              </details>
            )}
          </footer>
        </div>
      </div>
      {transparent && inspectSeat !== null && (
        <Panel
          open
          onOpenChange={(open) => {
            if (!open) setInspectSeat(null);
          }}
          title={`${snapshot.seats[inspectSeat].name} · 公开手牌`}
        >
          <div className="scmj-inspect-hand">
            {v.hands[inspectSeat].map((tile, index) => (
              <span key={index} aria-label={tileName(tile)}>
                <MahjongTile tile={tile} transparent={isTransparent(tile)} />
              </span>
            ))}
          </div>
        </Panel>
      )}
      <Panel
        open={scores}
        onOpenChange={setScores}
        title={`${modeName} · 结算明细`}
      >
        <div className="scmj-score" data-guide-target="scmj.payments">
          {snapshot.seats.map((seat, i) => {
            const win = v.wins.find((w) => w.player === i);
            return (
              <p key={i}>
                <strong>{seat.name}</strong> {v.scores[i] > 0 ? "+" : ""}
                {v.scores[i]} 分{win && ` · ${win.labels.join("、")}`}
                {transparent &&
                  win &&
                  ` · ${win.fan} 番${win.fu ? ` ${win.fu} 符` : ""} · ${win.value} 点`}
              </p>
            );
          })}
          {!v.payments.length && <p className="muted">本局尚无分数转移。</p>}
          {v.payments.map((p, i) => (
            <p key={i}>
              {snapshot.seats[p.from].name} → {snapshot.seats[p.to].name}：
              {p.amount} 分 · {p.reason}
            </p>
          ))}
        </div>
      </Panel>
      <Panel
        open={help}
        onOpenChange={setHelp}
        title={`${modeName} · 本房规则`}
      >
        {transparent ? (
          <p>
            四人透明立直单局。每种牌有三张透明牌、一张暗牌。他家只能看到你的透明手牌。支持吃、碰、杠、立直与振听，按番符计分。多人可荣和同一张牌，立直棒归顺位最接近的和家。流局按听牌结算并退还本局立直棒。
          </p>
        ) : (
          <>
            <p>
              108
              张万筒条，四人桌；不能吃，只能碰、杠、胡。换三张后同时定缺，有缺门牌必须先打缺门，未打缺不能胡。
            </p>
            <p>
              第一家胡牌后离场，其余继续。三家胡牌或牌墙耗尽结束；一张牌可被多家胡，胡优先于碰杠。
            </p>
            <p>
              平胡 0 番；对对胡 1 番；金钩钓额外 1 番；七对 2
              番，龙七对每组四张额外 1 番；清一色加 2 番，普通胡型每根加 1
              番。龙七对的四张不再重复算根。
            </p>
            <p>
              杠上花、杠上炮、抢补杠和海底各加 1 番。每次胡牌基础为 2
              的番数次方，
              {v.options.cap} 番封顶；自摸
              {v.options.selfDraw === "base"
                ? "每位付款者加付 1 底分"
                : "加 1 番后按封顶计算"}
              。
            </p>
            <p>
              暗杠每位未胡者付 2 分，补杠各付 1 分，点杠者付 2
              分。流局未打缺者付给未胡且已打缺者封顶分；未听者向听牌者付其最大可胡分，未听者退回杠费。已胡者不参与流局查叫。
            </p>
            <p>
              过胡后，同一轮只能胡更高番，摸牌或碰杠轮到自己后重置。不启用呼叫转移、天地胡、幺九将对和末四张强制胡牌。
            </p>
          </>
        )}
      </Panel>
    </section>
  );
}
