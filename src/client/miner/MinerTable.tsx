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
  minerModes,
  minerPerks,
  minerSceneLabels,
} from "../../domain/miner/content";
import { mapChoices, nodeLabel } from "../../domain/miner/map";
import { useEffect } from "react";
import { MapViewport } from "../MapViewport";
import { NodeSymbol } from "../expedition/NodeSymbol";
import { routeLayout } from "../expedition/map-layout";
import { MinerProfileLayer } from "./MinerProfilePanel";
import { playMinerSound } from "./sound";
import "./miner.css";

const playerColor = [
  "#d7a63a",
  "#5d9bd4",
  "#8e7bd0",
  "#c76d68",
  "#5aa878",
  "#b26fa8",
];

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

function ObjectSprite({
  kind,
  radius,
}: {
  kind: keyof typeof minerObjects;
  radius: number;
}) {
  const size = radius * 100;
  if (kind === "goldSmall" || kind === "goldMedium" || kind === "goldLarge")
    return (
      <g>
        <path
          d={`M${-size} 0 L${-size * 0.55} ${-size * 0.8} L${size * 0.35} ${-size * 0.9} L${size} ${-size * 0.15} L${size * 0.7} ${size * 0.75} L${-size * 0.25} ${size * 0.85} Z`}
          fill="url(#miner-gold)"
          stroke="#a46b1c"
          strokeWidth="0.35"
        />
        <path
          d={`M${-size * 0.5} ${-size * 0.2} L${-size * 0.1} ${-size * 0.5} L${size * 0.45} ${-size * 0.2}`}
          fill="none"
          stroke="var(--surface)"
          strokeWidth="0.45"
          opacity="0.55"
        />
      </g>
    );
  if (kind === "rockSmall" || kind === "rockLarge")
    return (
      <g>
        <path
          d={`M${-size} ${size * 0.2} L${-size * 0.65} ${-size * 0.7} L${size * 0.15} ${-size * 0.95} L${size * 0.9} ${-size * 0.25} L${size * 0.7} ${size * 0.75} L${-size * 0.25} ${size * 0.9} Z`}
          fill="url(#miner-rock)"
          stroke="var(--line)"
          strokeWidth="0.3"
        />
        <path
          d={`M${-size * 0.45} ${size * 0.05} L${size * 0.1} ${-size * 0.3} L${size * 0.5} ${size * 0.25}`}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="0.3"
          opacity="0.5"
        />
      </g>
    );
  if (kind === "diamond")
    return (
      <path
        d={`M0 ${-size} L${size} ${-size * 0.15} L0 ${size} L${-size} ${-size * 0.15} Z M${-size} ${-size * 0.15} H${size} M0 ${-size} V${size}`}
        fill="url(#miner-diamond)"
        stroke="var(--accent)"
        strokeWidth="0.35"
      />
    );
  if (kind === "bag")
    return (
      <g>
        <path
          d={`M${-size * 0.75} ${-size * 0.2} Q${-size * 0.9} ${size} 0 ${size} Q${size * 0.9} ${size} ${size * 0.75} ${-size * 0.2} Z`}
          fill="url(#miner-bag)"
          stroke="var(--line)"
          strokeWidth="0.35"
        />
        <path
          d={`M${-size * 0.35} ${-size * 0.25} L${-size * 0.25} ${-size * 0.75} H${size * 0.25} L${size * 0.35} ${-size * 0.25}`}
          fill="none"
          stroke="#7a4f24"
          strokeWidth="0.5"
        />
      </g>
    );
  if (kind === "skull")
    return (
      <g>
        <circle r={size * 0.8} fill="var(--surface)" stroke="var(--muted)" strokeWidth="0.35" />
        <circle cx={-size * 0.3} cy={-size * 0.1} r={size * 0.18} fill="var(--muted)" />
        <circle cx={size * 0.3} cy={-size * 0.1} r={size * 0.18} fill="var(--muted)" />
        <path d={`M${-size * 0.2} ${size * 0.35} Q0 ${size * 0.55} ${size * 0.2} ${size * 0.35}`} stroke="var(--muted)" strokeWidth="0.3" fill="none" />
      </g>
    );
  if (kind === "tnt")
    return (
      <g>
        <rect x={-size * 0.6} y={-size * 0.55} width={size * 1.2} height={size * 1.1} rx="0.8" fill="var(--danger)" />
        <path d={`M0 ${-size * 0.55} Q${size * 0.4} ${-size * 1.3} ${size * 0.1} ${-size * 1.45}`} stroke="var(--accent)" strokeWidth="0.55" fill="none" />
        <text textAnchor="middle" dominantBaseline="central" fontSize={size * 0.62} fill="var(--surface)" fontWeight="700">TNT</text>
      </g>
    );
  return (
    <g>
      <path
        d={`M0 ${-size * 0.3} Q${-size} ${-size * 0.9} ${-size * 1.1} 0 Q${-size * 0.45} ${-size * 0.1} 0 ${size * 0.35} Q${size * 0.45} ${-size * 0.1} ${size * 1.1} 0 Q${size} ${-size * 0.9} 0 ${-size * 0.3} Z`}
        fill="var(--muted)"
      />
      <circle r={size * 0.25} fill="var(--surface)" />
    </g>
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
  const specialist = view.perks.filter((perk) => perk === "specialist").length;
  const end = hook ? hookEnd(hook.angle, hook.length) : { x: 50, y: 3 };
  return (
    <section className="miner-live" data-cave={node.sourceKind}>
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
          {node.mechanics.includes("goldFever") &&
            view.tick % 150 < 40 && <span className="fever">黄金热 ×2</span>}
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
            <stop offset="0" stopColor="rgb(224 192 142)" />
            <stop offset="0.6" stopColor="rgb(190 151 104)" />
            <stop offset="1" stopColor="rgb(151 110 72)" />
          </linearGradient>
          <radialGradient id="miner-gold" cx="35%" cy="30%">
            <stop offset="0" stopColor="#f9df8a" />
            <stop offset="0.35" stopColor="#e8b63e" />
            <stop offset="1" stopColor="#b8791b" />
          </radialGradient>
          <linearGradient id="miner-rock" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a8a49b" />
            <stop offset="1" stopColor="#6f706e" />
          </linearGradient>
          <linearGradient id="miner-diamond" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f0feff" />
            <stop offset="0.5" stopColor="#8ad8e8" />
            <stop offset="1" stopColor="#3f9fb8" />
          </linearGradient>
          <linearGradient id="miner-bag" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e3bc7a" />
            <stop offset="1" stopColor="#96612f" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#miner-soil)" />
        <path
          d="M0 5 H100 M6 0 V13 M94 0 V13 M0 9 H8 M92 9 H100"
          stroke="var(--muted)"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="50" cy="3" r="3.6" fill="none" stroke="var(--muted)" strokeWidth="0.9" />
        <text x="50" y="-2.5" textAnchor="middle" fontSize="4.5">
          👷
        </text>
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
        {node.mechanics.includes("goldFever") && view.tick % 150 < 40 && (
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill="color-mix(in srgb, var(--accent) 8%, transparent)"
          />
        )}
        {node.mechanics.includes("centerWall") && (
          <rect
            x="48.5"
            y="0"
            width="3"
            height="78"
            rx="1"
            fill="var(--line)"
            opacity="0.75"
          />
        )}
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
                  : node.mechanics.some((id) => id === "fogRollsIn")
                    ? distance > 38 + Math.sin(view.tick / 10) * 16
                    : node.mechanics.some((id) => id === "risingFog")
                      ? distance > Math.max(16, 50 - view.tick / 28)
                      : false;
            const underwater = node.waterLevel > 0 && object.y > node.waterLevel;
            return (
              <g
                key={object.id}
                opacity={
                  hidden
                    ? 0.18
                    : object.phantom
                      ? 0.55
                      : underwater
                        ? 0.3
                        : hooked
                          ? 0.95
                          : 1
                }
                transform={`translate(${object.x * 100} ${object.y * 100})`}
              >
                {(object.phantom ||
                  (object.value > definition.value * 1.2 &&
                    node.mechanics.includes("hotspot"))) && (
                  <circle
                    r={object.radius * 100 + 2}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="0.7"
                    strokeDasharray="2 2"
                  />
                )}
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
                <ObjectSprite kind={object.kind} radius={object.radius} />
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
              <path
                d={`M${itemEnd.x - 1.3} ${itemEnd.y - 0.7} L${itemEnd.x} ${itemEnd.y + 0.8} L${itemEnd.x + 1.3} ${itemEnd.y - 0.7}`}
                fill="none"
                stroke={playerColor[item.seat % playerColor.length]}
                strokeWidth="0.9"
                strokeLinecap="round"
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
          <div
            key={item.seat}
            data-seat={item.seat}
            data-team={view.teams.some((team) => team !== view.teams[0])
              ? view.teams[item.seat]
              : undefined}
          >
            <strong>
              {playerCharacter(item).emoji} {playerName(item.seat)}
            </strong>
            <span>{item.score} 分</span>
            <span>{item.coins} 金币</span>
            <small>
              {playerCharacter(item).special} ·{" "}
              {item.specialCharge}/
              {Math.max(1, playerCharacter(item).charge - specialist)}
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
          player.specialCharge >= Math.max(1, playerCharacter(player).charge - specialist) && (
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
      <div className="miner-perk-grid">
        {view.perkOffers.map((perkId) => (
          <button
            type="button"
            key={perkId}
            disabled={
              pending ||
              view.perkBought ||
              (player?.coins ?? 0) < minerPerks[perkId].cost
            }
            onClick={() => send({ type: "buy-perk", perkId })}
          >
            <span>{minerPerks[perkId].emoji}</span>
            <strong>{minerPerks[perkId].name}</strong>
            <small>{minerPerks[perkId].description}</small>
            <em>{minerPerks[perkId].cost} 金币</em>
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

function MinerSounds({ view }: { view: MinerView }) {
  const lastKind = view.lastAction?.kind;
  const lastText = view.lastAction?.text;
  useEffect(() => {
    if (!lastKind) return;
    if (lastKind === "catch") playMinerSound("catch");
    else if (lastKind === "drop") playMinerSound("drop");
    else if (lastKind === "special") playMinerSound("special");
    else if (lastKind === "tnt") playMinerSound("tnt");
    else if (lastKind === "spin") playMinerSound("spin");
    else if (lastKind === "gamble") playMinerSound("gamble");
  }, [lastKind, lastText]);
  useEffect(() => {
    if (view.phase === "won") playMinerSound("win");
    if (view.phase === "lost") playMinerSound("lose");
  }, [view.phase]);
  return null;
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
  const teamMode = view.teams.some((team) => team !== view.teams[0]);
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
    if (view.phase === "shop" || view.phase === "intermission")
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
              <strong>{playerName(entry.seat)}</strong>
              <em>{entry.score} 分</em>
              <small>#{index + 1}</small>
            </div>
          ))}
        </div>
        <div className="miner-result-lines">
          {view.players.map((player) => (
            <span key={player.seat}>
              {playerCharacter(player).emoji} {playerName(player.seat)}
              <em>{player.score}</em>
            </span>
          ))}
        </div>
      </section>
    );
  })();
  return (
    <div className="miner-table" data-phase={view.phase}>
      <MinerSounds view={view} />
      {actor >= 0 && <MinerProfileLayer view={view} actor={actor} />}
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
                  ? `第 ${view.levelsPlayed + 1} 关 · 无尽`
                  : `第 ${Math.min(view.levelsPlayed + 1, view.matchLevels)} / ${view.matchLevels} 关 · ${
                    view.phase === "live"
                      ? "矿洞"
                      : view.phase === "map"
                        ? "选路"
                        : "关间补给"
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
        {view.phase === "live" && view.node && (
          <div className="miner-live-summary">
            <strong
              className={view.node.timeLeftMs < 10_000 ? "is-low" : undefined}
            >
              {Math.ceil(view.node.timeLeftMs / 1000)}s
            </strong>
            {view.node.mechanics.map((id) => (
              <span key={id} title={minerMechanics[id].description}>
                {minerMechanics[id].name}
              </span>
            ))}
          </div>
        )}
        <div className="miner-team-perks">
          {view.perks.map((id) => (
            <span key={id} title={minerPerks[id].description}>
              {minerPerks[id].emoji} {minerPerks[id].name}
            </span>
          ))}
        </div>
        <div className="miner-active-seat">
          {view.players.map((player) => (
            <span
              key={player.seat}
              data-seat={player.seat}
              data-team={teamMode ? view.teams[player.seat] : undefined}
            >
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
