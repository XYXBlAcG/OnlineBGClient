import type { GameSnapshot } from "../OriginalGame";
import type { Action } from "../../domain/types";
import type {
  MinerGameState,
  MinerMove,
  MinerView,
} from "../../domain/miner/types";
import {
  minerCharacters,
  minerModes,
  minerPerks,
} from "../../domain/miner/content";
import { mapChoices, nodeLabel } from "../../domain/miner/map";
import { useEffect } from "react";
import { MapViewport } from "../MapViewport";
import { useMediaQuery, useMobile } from "../use-mobile";
import { NodeSymbol } from "../expedition/NodeSymbol";
import { routeLayout } from "../expedition/map-layout";
import { MinerProfileLayer } from "./MinerProfilePanel";
import { playMinerSound } from "./sound";
import { characterArt } from "./art";
import { MinerLive } from "./MinerLive";
import { isMinerShop } from "../../domain/miner/geometry";
import { useGameBinding, useGameCommands } from "../use-game-commands";
import { Shortcut } from "../ui/Shortcut";
import type { ReactNode } from "react";
import "./miner.css";

function playerName(seat: number) {
  return `玩家 ${seat + 1}`;
}

function CharacterBoard({
  view,
  actor,
  send,
  pending,
}: {
  view: MinerView;
  actor: number;
  send: (move: MinerMove) => void;
  pending: boolean;
}) {
  return (
    <section className="miner-character-board">
      <div className="miner-map-title">
        <h3>选择角色</h3>
        <span>
          {Object.keys(view.characterChoices).length}/{view.players.length}{" "}
          已选择
        </span>
      </div>
      <div className="miner-character-grid">
        {Object.values(minerCharacters).map((character) => (
          <button
            type="button"
            key={character.id}
            className="miner-character-card"
            data-selected={view.characterChoices[actor] === character.id}
            disabled={pending || view.characterChoices[actor] !== undefined}
            onClick={() => send({ type: "character", character: character.id })}
          >
            <img src={characterArt[character.id]} alt="" />
            <strong>{character.name}</strong>
            <em>{character.special}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function playerCharacter(player: MinerView["players"][number]) {
  return minerCharacters[player.character];
}

function MapBoard({
  view,
  actor,
  send,
  pending,
  names,
}: {
  view: MinerView;
  actor: number;
  send: (move: MinerMove) => void;
  pending: boolean;
  names: string[];
}) {
  const voted = view.votes[actor];
  const mobile = useMobile(),
    landscape = useMediaQuery("(orientation: landscape)"),
    orientation = mobile && !landscape ? "portrait" : "landscape",
    layout = routeLayout(view.map, orientation),
    options = mapChoices(view);
  return (
    <section className="miner-map-panel">
      <div className="miner-map-title">
        <h3>坑道路线</h3>
        <span>
          {Object.keys(view.votes).length}/{view.players.length} 已投票
        </span>
      </div>
      <div className="miner-map-viewport">
        <MapViewport
          naturalSize={layout}
          fitContainOnMount={false}
          fitWidthOnMount={orientation === "portrait"}
          initialZoom={1}
          focusTarget={
            view.current || options[0]
              ? `[data-route-node="${view.current ?? options[0].id}"]`
              : undefined
          }
          focusLabel="当前矿点"
          compact
        >
          <div
            className="miner-route-canvas"
            style={{ width: layout.width, height: layout.height }}
          >
            <svg
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="miner-route-edges"
              aria-hidden="true"
            >
              {layout.links.map((link, index) => (
                <path
                  key={`${link.from}-${link.to}-${index}`}
                  d={link.path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={link.shortcut || link.backward ? 1.2 : 2}
                  strokeDasharray={
                    link.shortcut || link.backward ? "4 5" : undefined
                  }
                  opacity={0.24}
                />
              ))}
            </svg>
            {view.map.flat().map((node) => {
              const point = layout.points.get(node.id);
              if (!point) return null;
              const elected = Object.entries(view.votes)
                .filter(([, id]) => id === node.id)
                .map(([seat]) => Number(seat));
              return (
                <button
                  type="button"
                  key={node.id}
                  data-route-node={node.id}
                  className="miner-route-node"
                  data-available={options.some((item) => item.id === node.id)}
                  data-current={node.id === view.current}
                  data-mine-scene={node.kind}
                  style={{
                    left: `${((point.x - layout.nodeWidth / 2) / layout.width) * 100}%`,
                    top: `${((point.y - layout.nodeHeight / 2) / layout.height) * 100}%`,
                    width: `${(layout.nodeWidth / layout.width) * 100}%`,
                    height: `${(layout.nodeHeight / layout.height) * 100}%`,
                  }}
                  disabled={
                    pending ||
                    actor < 0 ||
                    !!voted ||
                    !options.some((item) => item.id === node.id)
                  }
                  aria-pressed={voted === node.id}
                  onClick={() => send({ type: "vote", nodeId: node.id })}
                >
                  <NodeSymbol kind={node.kind} />
                  <span>{nodeLabel(node.kind)}</span>
                  {elected.length > 0 && (
                    <em>
                      {elected
                        .map((seat) => names[seat] || playerName(seat))
                        .join("、")}
                    </em>
                  )}
                </button>
              );
            })}
          </div>
        </MapViewport>
      </div>
    </section>
  );
}

function ShopBoard({
  view,
  actor,
  send,
  pending,
  names,
  frozen,
  pauseControl,
}: {
  view: MinerView;
  actor: number;
  send: (move: MinerMove) => void;
  pending: boolean;
  names: string[];
  frozen: boolean;
  pauseControl?: ReactNode;
}) {
  const player = view.players[actor];
  const locked = pending || !player || view.ready.includes(actor);
  const stockLocked = locked || player.hook.phase !== "swing";
  return (
    <MinerLive
      view={view}
      actor={actor}
      names={names}
      send={send}
      pending={locked}
      frozen={frozen}
      pauseControl={pauseControl}
      extraControls={
        <div className="miner-shop-controls">
          <button
            type="button"
            className="primary"
            disabled={stockLocked}
            onClick={() => send({ type: "ready" })}
          >
            {view.ready.includes(actor) ? "已准备" : "下一关"}
          </button>
          <div className="miner-perk-grid">
            {view.perkOffers.map((perkId) => (
              <button
                type="button"
                key={perkId}
                title={minerPerks[perkId].description}
                disabled={
                  stockLocked ||
                  view.perkBought ||
                  (player?.coins ?? 0) <
                    (view.mode === "endless" ? 0 : minerPerks[perkId].cost)
                }
                onClick={() => send({ type: "buy-perk", perkId })}
              >
                <span>{minerPerks[perkId].emoji}</span>
                <strong>{minerPerks[perkId].name}</strong>
                <small>{minerPerks[perkId].description}</small>
                <em>
                  {view.mode === "endless"
                    ? "免费"
                    : `${minerPerks[perkId].cost} 金币`}
                </em>
              </button>
            ))}
          </div>
          <div className="miner-live-actions">
            <button
              type="button"
              disabled={
                stockLocked ||
                !view.shopOffers.length ||
                view.shopRefreshes >= 3
              }
              onClick={() => send({ type: "refresh-shop" })}
            >
              刷新商品 · {3 - view.shopRefreshes}
            </button>
            <button
              type="button"
              disabled={
                stockLocked ||
                player.coins < 50 ||
                view.shopSpinsUsed.includes(actor)
              }
              onClick={() => send({ type: "spin" })}
            >
              🎰 老虎机 · 50 金币
            </button>
            <button
              type="button"
              disabled={stockLocked || view.teamGambleUsed}
              onClick={() => send({ type: "team-gamble" })}
            >
              🎲 Team Gamble · 团队 15%
            </button>
          </div>
        </div>
      }
    />
  );
}

function CampBoard({
  view,
  send,
  pending,
}: {
  view: MinerView;
  send: (move: MinerMove) => void;
  pending: boolean;
}) {
  return (
    <section className="miner-interlude">
      <h3>{view.node?.name ?? "矿工营地"}</h3>
      <button
        type="button"
        className="primary"
        disabled={pending}
        onClick={() => send({ type: "ready" })}
      >
        休整完毕
      </button>
    </section>
  );
}

function EventBoard({
  view,
  send,
  pending,
}: {
  view: MinerView;
  send: (move: MinerMove) => void;
  pending: boolean;
}) {
  return (
    <section className="miner-interlude">
      <h3>{view.node?.name ?? "矿工奇遇"}</h3>
      <div className="miner-live-actions">
        <button
          type="button"
          disabled={pending}
          onClick={() => send({ type: "event", choice: "risk" })}
        >
          赌一把 · 60% 得 300
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => send({ type: "event", choice: "safe" })}
        >
          稳妥拿 100
        </button>
      </div>
    </section>
  );
}

function MinerSounds({ view, volume }: { view: MinerView; volume: number }) {
  const lastKind = view.lastAction?.kind;
  const eventId = view.lastAction?.id;
  useEffect(() => {
    if (!lastKind) return;
    if (lastKind === "catch" || lastKind === "vein" || lastKind === "relay")
      playMinerSound("catch", volume);
    else if (lastKind === "drop") playMinerSound("drop", volume);
    else if (lastKind === "special") playMinerSound("special", volume);
    else if (lastKind === "tnt") playMinerSound("tnt", volume);
    else if (lastKind === "spin") playMinerSound("spin", volume);
    else if (lastKind === "gamble") playMinerSound("gamble", volume);
  }, [lastKind, eventId, volume]);
  useEffect(() => {
    if (view.phase === "won") playMinerSound("win", volume);
    if (view.phase === "lost") playMinerSound("lose", volume);
  }, [view.phase, volume]);
  return null;
}

export function MinerTable({
  snapshot,
  act,
  pending,
  replay,
  volume = 0,
  onPause,
}: {
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  pending: boolean;
  replay: boolean;
  volume?: number;
  onPause?: (paused: boolean) => void;
}) {
  const canPause =
    !!snapshot.minerCanPause &&
    !replay &&
    !!onPause &&
    (!snapshot.paused || snapshot.minerPaused === true);
  const togglePause = () => {
    if (canPause) onPause?.(!snapshot.minerPaused);
  };
  const pauseBinding = useGameBinding("miner.pause", "P");
  useGameCommands([
    {
      id: "miner.pause",
      title: "暂停 / 继续对局",
      scope: "miner",
      binding: "P",
      enabled: () => canPause,
      run: togglePause,
    },
  ]);
  const pauseControl = canPause ? (
    <button
      type="button"
      className="miner-pause"
      onClick={togglePause}
      aria-pressed={!!snapshot.minerPaused}
    >
      {snapshot.minerPaused ? "继续" : "暂停"}{" "}
      <Shortcut binding={pauseBinding} />
    </button>
  ) : undefined;
  const state = snapshot.state;
  if (!state || state.kind !== "miner") return null;
  const view = (state as MinerGameState).view;
  const actor = snapshot.actor;
  const names = snapshot.seats.map(
    (seat, index) => seat.name || playerName(index),
  );
  const locked = pending || replay || !!snapshot.paused || actor < 0;
  const teamMode = view.teams.some((team) => team !== view.teams[0]);
  const send = (move: MinerMove) => act({ type: "miner-action", move });
  const content = (() => {
    if (view.phase === "character")
      return (
        <CharacterBoard
          view={view}
          actor={actor}
          send={send}
          pending={locked}
        />
      );
    if (view.phase === "map")
      return (
        <MapBoard
          names={names}
          view={view}
          actor={actor}
          send={send}
          pending={locked}
        />
      );
    if (view.phase === "live")
      return (
        <MinerLive
          key={view.node!.id}
          view={view}
          actor={actor}
          names={names}
          send={send}
          pending={locked}
          frozen={replay || !!snapshot.paused}
          pauseControl={pauseControl}
        />
      );
    if (isMinerShop(view.phase))
      return (
        <ShopBoard
          key={view.node?.id}
          view={view}
          actor={actor}
          send={send}
          pending={locked}
          names={names}
          frozen={replay || !!snapshot.paused}
          pauseControl={pauseControl}
        />
      );
    if (view.phase === "camp")
      return <CampBoard view={view} send={send} pending={locked} />;
    if (view.phase === "event")
      return <EventBoard view={view} send={send} pending={locked} />;
    return (
      <section className={`miner-result ${view.phase}`}>
        <header>
          <h3>{view.phase === "won" ? "全队升井成功！" : "矿灯熄灭"}</h3>
          <p>
            {view.result?.teamScores
              ? `A 队 ${view.result.teamScores[0]} · B 队 ${view.result.teamScores[1]}`
              : view.mode === "endless"
                ? `无尽深度 ${view.levelsPlayed} 关 · 生命 ${view.result?.lives ?? 0}`
                : `团队 ${view.result?.score ?? view.teamScore} / ${view.teamQuota}`}
          </p>
        </header>
        <div className="miner-podium">
          {(view.result?.ranking ?? []).map((entry, index) => (
            <div
              key={entry.seat}
              className="miner-podium-item"
              data-place={index + 1}
            >
              <span>{playerCharacter(view.players[entry.seat]!).emoji}</span>
              <strong>{names[entry.seat]}</strong>
              <em>{entry.score} 分</em>
              <small>#{index + 1}</small>
            </div>
          ))}
        </div>
        <div className="miner-result-lines">
          {view.players.map((player) => (
            <span key={player.seat}>
              {playerCharacter(player).emoji} {names[player.seat]}
              <em>{player.score}</em>
            </span>
          ))}
        </div>
      </section>
    );
  })();
  return (
    <div className="miner-table" data-phase={view.phase}>
      {volume > 0 && !replay && <MinerSounds view={view} volume={volume} />}
      {view.phase !== "live" && !isMinerShop(view.phase) && (
        <header className="miner-hud">
          <div className="miner-hud-title">
            <strong>黄金矿脉</strong>
            <span>
              {minerModes[view.mode].name} ·{" "}
              {view.phase === "character"
                ? "选择角色"
                : view.phase === "won" || view.phase === "lost"
                  ? "本局结束"
                  : view.mode === "endless"
                    ? `第 ${view.levelsPlayed + 1} 关`
                    : `第 ${Math.min(view.levelsPlayed + 1, view.matchLevels)} / ${view.matchLevels} 关 · ${
                        view.phase === "map" ? "选路" : "关间补给"
                      }`}
            </span>
            {view.mode !== "endless" && (
              <div className="miner-levels" aria-label="关卡进度">
                {Array.from({ length: view.matchLevels }, (_, index) => (
                  <span
                    key={index}
                    data-done={index < view.levelsPlayed}
                    data-current={index === view.levelsPlayed}
                  />
                ))}
              </div>
            )}
          </div>
          {teamMode ? (
            <div className="miner-team-scores">
              <span data-team="0">A 队 {view.teamScores[0]}</span>
              <span data-team="1">B 队 {view.teamScores[1]}</span>
            </div>
          ) : (
            <div className="miner-quota">
              <span>{view.mode === "endless" ? "本关目标" : "团队目标"}</span>
              <strong>
                {view.mode === "endless"
                  ? `${view.levelTarget}`
                  : `${view.teamScore}/${view.teamQuota}`}
              </strong>
              {view.mode === "endless" ? (
                <div className="miner-lives">
                  {"❤️".repeat(Math.max(0, view.lives))}
                </div>
              ) : (
                <div className="miner-team-bar">
                  <span
                    style={{
                      width: `${Math.min(100, (view.teamScore / view.teamQuota) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}
          {pauseControl}
          {actor >= 0 && !replay && (
            <MinerProfileLayer view={view} actor={actor} />
          )}
          <div className="miner-team-perks">
            {view.perks.map((id) => (
              <span key={id} title={minerPerks[id].description}>
                {minerPerks[id].emoji} {minerPerks[id].name}
              </span>
            ))}
          </div>
        </header>
      )}
      {content}
    </div>
  );
}
