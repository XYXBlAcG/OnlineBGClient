import type { GameSnapshot } from "../OriginalGame";
import type { Action } from "../../domain/types";
import type {
  MinerGameState,
  MinerItemId,
  MinerMove,
  MinerView,
} from "../../domain/miner/types";
import {
  minerCharacters,
  minerItems,
  minerMechanics,
  minerObjects,
  minerSceneLabels,
} from "../../domain/miner/content";
import { mapChoices, nodeLabel } from "../../domain/miner/map";
import { MapViewport } from "../MapViewport";
import { NodeSymbol } from "../expedition/NodeSymbol";
import { routeLayout } from "../expedition/map-layout";
import "./miner.css";

const playerColor = ["#d7a63a", "#5d9bd4", "#8e7bd0", "#c76d68"];

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
          {Object.keys(view.characterChoices).length}/{view.players.length} 已选择
        </span>
      </div>
      <div className="miner-character-grid">
        {Object.values(minerCharacters).map((character) => (
          <button
            type="button"
            key={character.id}
            className="miner-character-card"
            disabled={pending || view.characterChoices[actor] !== undefined}
            onClick={() => send({ type: "character", character: character.id })}
          >
            <span>{character.emoji}</span>
            <strong>{character.name}</strong>
            <em>{character.special}</em>
            <small>{character.description}</small>
          </button>
        ))}
      </div>
      <div className="miner-log">
        {view.log.slice(-5).map((entry) => (
          <p key={entry.id}>{entry.text}</p>
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
}: {
  view: MinerView;
  actor: number;
  send: (move: MinerMove) => void;
  pending: boolean;
}) {
  const layout = routeLayout(view.map, "portrait");
  const options = mapChoices(view);
  return (
    <section className="miner-map-panel">
      <div className="miner-map-title">
        <h3>秘塔矿脉 · 第 {view.floor + 1} 层</h3>
        <span>{Object.keys(view.votes).length}/{view.players.length} 已投票</span>
      </div>
      <div className="miner-map-viewport">
        <MapViewport
          naturalSize={layout}
          fitWidthOnMount
          initialZoom={0.8}
          focusTarget={
            view.current ? `[data-route-node="${view.current}"]` : undefined
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
                  strokeDasharray={link.shortcut || link.backward ? "4 5" : undefined}
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
                    left: point.x - layout.nodeWidth / 2,
                    top: point.y - layout.nodeHeight / 2,
                    width: layout.nodeWidth,
                    height: layout.nodeHeight,
                  }}
                  disabled={pending}
                  onClick={() => {
                    if (options.some((item) => item.id === node.id))
                      send({ type: "vote", nodeId: node.id });
                  }}
                >
                  <NodeSymbol kind={node.kind} />
                  <span>{nodeLabel(node.kind)}</span>
                  {elected.length > 0 && (
                    <em>{elected.map((seat) => seat + 1).join("·")}</em>
                  )}
                </button>
              );
            })}
          </div>
        </MapViewport>
      </div>
      <div className="miner-map-options">
        {options.map((node) => (
          <button
            type="button"
            key={node.id}
            disabled={pending || view.votes[actor] === node.id}
            className="miner-map-option"
            onClick={() => send({ type: "vote", nodeId: node.id })}
          >
            <NodeSymbol kind={node.kind} />
            <span>{nodeLabel(node.kind)}</span>
            <small>{node.kind}</small>
          </button>
        ))}
      </div>
      <div className="miner-log">
        {view.log.slice(-6).map((entry) => (
          <p key={entry.id}>{entry.text}</p>
        ))}
      </div>
    </section>
  );
}

function hookEnd(angle: number, length: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: 50 + Math.sin(radians) * length * 100,
    y: 3 + Math.cos(radians) * length * 100,
  };
}

function LiveBoard({
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
  const node = view.node;
  if (!node) return null;
  const player = view.players[actor];
  const hook = player?.hook;
  const end = hook ? hookEnd(hook.angle, hook.length) : { x: 50, y: 3 };
  return (
    <section className="miner-live">
      <div className="miner-live-head">
        <div>
          <h3>{node.name}</h3>
          <small>{minerSceneLabels[node.sourceKind]} · 倒计时</small>
        </div>
        <strong className={node.timeLeftMs < 10_000 ? "is-low" : ""}>
          {Math.ceil(node.timeLeftMs / 1000)}s
        </strong>
        <span className="miner-team-progress">
          团队 {view.teamScore}/{view.teamQuota}
        </span>
        <div className="miner-mechanics">
          {node.mechanics.map((id) => (
            <span key={id} title={minerMechanics[id].description}>
              {minerMechanics[id].name}
            </span>
          ))}
        </div>
      </div>
      <svg
        viewBox="0 0 100 100"
        className="miner-mine"
        role="img"
        aria-label="黄金矿工矿洞"
      >
        <defs>
          <linearGradient id="miner-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--surface)" />
            <stop offset="1" stopColor="var(--canvas)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#miner-soil)" />
        <path
          d="M0 8 Q 50 42 100 8"
          fill="none"
          stroke="var(--line)"
          strokeWidth="1"
        />
        <path
          d="M0 93 Q 30 82 50 90 T 100 94"
          fill="none"
          stroke="var(--line)"
          strokeWidth="1.2"
        />
        {node.waterLevel > 0 && (
          <g>
            <rect
              x="0"
              y={node.waterLevel * 100}
              width="100"
              height={100 - node.waterLevel * 100}
              fill="color-mix(in srgb, var(--accent) 14%, transparent)"
            />
            <line
              x1="0"
              x2="100"
              y1={node.waterLevel * 100}
              y2={node.waterLevel * 100}
              stroke="var(--accent)"
              strokeWidth="0.6"
              opacity="0.55"
            />
          </g>
        )}
        {node.objects
          .filter((object) => !object.removed)
          .map((object) => {
            const definition = minerObjects[object.kind];
            const hooked = object.hookedBy !== null;
            const endPoint = hookEnd(hook?.angle ?? 0, hook?.length ?? 0);
            const distance = Math.hypot(
              object.x * 100 - endPoint.x,
              object.y * 100 - endPoint.y,
            );
            const hidden = node.mechanics.some((id) => id === "blackout")
              ? distance > 34
              : node.mechanics.some((id) => id === "sonar")
                ? distance > 24
                : node.mechanics.some((id) => id === "fog")
                  ? distance > 48
                  : false;
            const underwater = node.waterLevel > 0 && object.y > node.waterLevel;
            return (
              <g
                key={object.id}
                opacity={hidden ? 0.05 : underwater ? 0.3 : hooked ? 0.95 : 1}
                transform={`translate(${object.x * 100} ${object.y * 100})`}
              >
                <circle
                  r={object.radius * 100}
                  fill={
                    hooked
                      ? "color-mix(in srgb, var(--accent) 34%, transparent)"
                      : "color-mix(in srgb, var(--surface) 70%, transparent)"
                  }
                  stroke="var(--line)"
                  strokeWidth="0.5"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={object.radius * 80}
                  style={{ userSelect: "none" }}
                >
                  {definition.emoji}
                </text>
              </g>
            );
          })}
        {view.players.map((item) => {
          const itemEnd = hookEnd(item.hook.angle, item.hook.length);
          return (
            <g key={item.seat} opacity={item.seat === actor ? 1 : 0.6}>
              <line
                x1={50}
                y1={3}
                x2={itemEnd.x}
                y2={itemEnd.y}
                stroke={playerColor[item.seat % playerColor.length]}
                strokeWidth={item.seat === actor ? 1 : 0.7}
              />
              <circle
                cx={itemEnd.x}
                cy={itemEnd.y}
                r={1.1}
                fill={playerColor[item.seat % playerColor.length]}
              />
              {item.hook.targetId && (
                <circle
                  cx={itemEnd.x}
                  cy={itemEnd.y}
                  r={2.4}
                  fill="none"
                  stroke={playerColor[item.seat % playerColor.length]}
                  strokeWidth="0.5"
                />
              )}
            </g>
          );
        })}
        <g transform="translate(50 3)">
          <circle r="2.2" fill="var(--accent)" />
          <path
            d="M-5 -2 L0 -5 L5 -2"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
          />
        </g>
        <line
          x1={50}
          y1={3}
          x2={end.x}
          y2={end.y}
          stroke={playerColor[actor % playerColor.length]}
          strokeWidth="1.2"
          opacity="0.8"
        />
      </svg>
      <div className="miner-live-stats">
        {view.players.map((item) => (
          <div key={item.seat} data-seat={item.seat}>
            <strong>
              {playerCharacter(item).emoji} {playerName(item.seat)}
            </strong>
            <span>{item.score} 分</span>
            <span>{item.coins} 金币</span>
            <small>
              {playerCharacter(item).special} ·{" "}
              {item.specialCharge}/{playerCharacter(item).charge}
            </small>
            <small>{item.lastCatch || "等待下钩"}</small>
          </div>
        ))}
      </div>
      <div className="miner-live-actions">
        <button
          type="button"
          className="primary"
          disabled={pending || !hook || hook.phase !== "swing"}
          onClick={() =>
            hook && send({ type: "drop", angle: hook.angle })
          }
        >
          {hook?.phase === "swing" ? "下钩" : "回收中"}
        </button>
        {player &&
          player.specialCharge >= playerCharacter(player).charge && (
            <button
              type="button"
              className="miner-special"
              disabled={pending}
              onClick={() => send({ type: "special" })}
            >
              {playerCharacter(player).emoji} {playerCharacter(player).special}
            </button>
          )}
        {hook?.phase === "reel" &&
          player?.hook.targetId &&
          (node.objects.find((object) => object.id === player.hook.targetId)
            ?.weight ?? 0) >= 4 && (
            <button
              type="button"
              className="miner-haul"
              disabled={pending}
              onClick={() => send({ type: "haul" })}
            >
              节拍拉钩
            </button>
          )}
        {Object.entries(player?.items ?? {}).map(([id, count]) =>
          count ? (
            <button
              type="button"
              key={id}
              disabled={pending}
              onClick={() =>
                send({ type: "use-item", itemId: id as MinerItemId })
              }
            >
              {minerItems[id as MinerItemId].emoji}{" "}
              {minerItems[id as MinerItemId].name} ×{count}
            </button>
          ) : null,
        )}
      </div>
      <div className="miner-log">
        {view.log.slice(-5).map((entry) => (
          <p key={entry.id}>{entry.text}</p>
        ))}
      </div>
    </section>
  );
}

function ShopBoard({
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
  const player = view.players[actor];
  return (
    <section className="miner-shop">
      <div className="miner-map-title">
        <h3>{view.node?.name ?? "矿工商店"}</h3>
        <span>{player?.coins ?? 0} 金币</span>
      </div>
      <div className="miner-shop-grid">
        {Object.values(minerItems).map((item) => (
          <button
            type="button"
            key={item.id}
            disabled={pending || (player?.coins ?? 0) < item.cost}
            onClick={() => send({ type: "buy", itemId: item.id })}
          >
            <span>{item.emoji}</span>
            <strong>{item.name}</strong>
            <small>{item.description}</small>
            <em>{item.cost} 金币</em>
          </button>
        ))}
      </div>
      <div className="miner-live-actions">
        <button
          type="button"
          disabled={pending || view.shopSpinsUsed.includes(actor)}
          onClick={() => send({ type: "spin" })}
        >
          🎰 老虎机 · 50 金币
        </button>
        <button
          type="button"
          disabled={pending || view.teamGambleUsed}
          onClick={() => send({ type: "team-gamble" })}
        >
          🎲 Team Gamble · 团队 15%
        </button>
      </div>
      <button
        type="button"
        className="primary"
        disabled={pending}
        onClick={() => send({ type: "ready" })}
      >
        离开商店
      </button>
      <div className="miner-log">
        {view.log.slice(-5).map((entry) => (
          <p key={entry.id}>{entry.text}</p>
        ))}
      </div>
    </section>
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
      <p>矿工们围坐休息，准备下一段矿道。</p>
      <button
        type="button"
        className="primary"
        disabled={pending}
        onClick={() => send({ type: "ready" })}
      >
        休整完毕
      </button>
      <div className="miner-log">
        {view.log.slice(-5).map((entry) => (
          <p key={entry.id}>{entry.text}</p>
        ))}
      </div>
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
      <p>矿脉深处传来一阵回声。要赌一把，还是稳妥拿钱？</p>
      <div className="miner-event-actions">
        <button
          type="button"
          disabled={pending}
          onClick={() => send({ type: "event", choice: "risk" })}
        >
          赌一把 · 60% 得 300，否则 -100
        </button>
        <button
          type="button"
          className="primary"
          disabled={pending}
          onClick={() => send({ type: "event", choice: "safe" })}
        >
          稳妥拿 100
        </button>
      </div>
      <div className="miner-log">
        {view.log.slice(-5).map((entry) => (
          <p key={entry.id}>{entry.text}</p>
        ))}
      </div>
    </section>
  );
}

export function MinerTable({
  snapshot,
  act,
  pending,
  replay,
}: {
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  pending: boolean;
  replay: boolean;
}) {
  const state = snapshot.state;
  if (!state || state.kind !== "miner") return null;
  const view = (state as MinerGameState).view;
  const actor = snapshot.actor;
  const send = (move: MinerMove) =>
    act({ type: "miner-action", move });
  const content = (() => {
    if (view.phase === "character")
      return (
        <CharacterBoard
          view={view}
          actor={actor}
          send={send}
          pending={pending || replay}
        />
      );
    if (view.phase === "map")
      return (
        <MapBoard
          view={view}
          actor={actor}
          send={send}
          pending={pending || replay}
        />
      );
    if (view.phase === "live")
      return (
        <LiveBoard
          view={view}
          actor={actor}
          send={send}
          pending={pending || replay}
        />
      );
    if (view.phase === "shop")
      return (
        <ShopBoard
          view={view}
          actor={actor}
          send={send}
          pending={pending || replay}
        />
      );
    if (view.phase === "camp")
      return (
        <CampBoard view={view} send={send} pending={pending || replay} />
      );
    if (view.phase === "event")
      return (
        <EventBoard view={view} send={send} pending={pending || replay} />
      );
    return (
      <section className={`miner-result ${view.phase}`}>
        <h3>{view.phase === "won" ? "全队升井成功！" : "矿灯熄灭"}</h3>
        <p>
          团队 {view.result?.score ?? view.teamScore} / {view.teamQuota}
        </p>
        <ol>
          {view.result?.ranking.map((entry) => (
            <li key={entry.seat}>
              {playerName(entry.seat)} · {entry.score} 分
            </li>
          ))}
        </ol>
      </section>
    );
  })();
  return (
    <div className="miner-table" data-phase={view.phase}>
      <header className="miner-hud">
        <div>
          <strong>黄金矿脉</strong>
          <span>
            {view.phase === "character"
              ? "选角色"
              : `第 {view.floor + 1} 层 · ${view.current ? "矿道" : "选路"}`}
          </span>
        </div>
        <div className="miner-quota">
          <span>团队目标</span>
          <strong>
            {view.teamScore}/{view.teamQuota}
          </strong>
        </div>
        <div className="miner-active-seat">
          {view.players.map((player) => (
            <span key={player.seat} data-seat={player.seat}>
              {playerCharacter(player).emoji} {playerName(player.seat)} ·{" "}
              {player.score}
            </span>
          ))}
        </div>
      </header>
      {content}
    </div>
  );
}
