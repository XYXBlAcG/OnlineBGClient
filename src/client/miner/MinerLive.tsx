import { MinerRigMotion } from "./rig-motion";
import { RoguelikeHud } from "../ui/RoguelikeHud";
import { useEffect, useId, useRef, type CSSProperties } from "react";
import {
  MINE_DEPTH,
  PIVOT_Y,
  hookPoint,
  quickHook,
  isMinerShop,
  shopDrop,
} from "../../domain/miner/geometry";
import {
  minerCharacters,
  minerItems,
  minerMechanics,
  minerObjects,
} from "../../domain/miner/content";
import type {
  MinerItemId,
  MinerMove,
  MinerObject,
  MinerView,
} from "../../domain/miner/types";
import { shopPrice } from "../../domain/miner/rules";
import { useGameBinding, useGameCommands } from "../use-game-commands";
import { Shortcut } from "../ui/Shortcut";
import type { ReactNode } from "react";
import { characterArt, objectArt, playerColor } from "./art";

type Point = ReturnType<typeof hookPoint>;
const width = 100;
const floor = MINE_DEPTH * width;
const pivot = PIVOT_Y * width;
const pointAt = (angle: number, length: number, x: number): Point => {
  const point = hookPoint(angle, length, x);
  return { x: point.x * width, y: point.y * width };
};

function Ore({ object }: { object: MinerObject }) {
  const radius = object.radius * width;
  const definition = minerObjects[object.kind];
  const marker = definition.timeChangeMs
    ? "−3s"
    : definition.charge
      ? "⚡"
      : null;
  return (
    <>
      {marker && <title>{definition.name}</title>}
      {object.frozen && (
        <circle r={radius + 0.3} fill="#9ce4eb" opacity=".55" />
      )}
      <image
        href={objectArt[object.kind]}
        x={-radius}
        y={-radius}
        width={radius * 2}
        height={radius * 2}
      />
      {marker && (
        <text
          className="miner-ore-marker"
          data-penalty={!!definition.timeChangeMs}
          y={radius * 0.82}
          textAnchor="middle"
        >
          {marker}
        </text>
      )}
    </>
  );
}

export function MinerLive({
  view,
  actor,
  names,
  send,
  pending,
  frozen,
  pauseControl,
  extraControls,
}: {
  view: MinerView;
  actor: number;
  names: string[];
  send: (move: MinerMove) => void;
  pending: boolean;
  frozen: boolean;
  pauseControl?: ReactNode;
  extraControls?: ReactNode;
}) {
  const node = view.node!;
  const shop = isMinerShop(view.phase);
  const player = view.players[actor];
  const hook = player?.hook;
  const character = player && minerCharacters[player.character];
  const target = node.objects.find(
    (object) => !object.removed && object.id === hook?.targetId,
  );
  const charge =
    character &&
    Math.max(
      1,
      character.charge -
        view.perks.filter((perk) => perk === "specialist").length,
    );
  const haul = !shop && hook?.phase === "reel" && (target?.weight ?? 0) >= 4;
  const action = view.lastAction;
  const low = node.timeLeftMs <= 10_000;
  const artId = useId();
  const scene = useRef<SVGSVGElement>(null);
  const latest = useRef(view);
  latest.current = view;
  const samples = useRef(new Map<number, MinerRigMotion>());
  const cast = useRef<{ angle: number; at: number } | null>(null);
  const localAngle = samples.current.get(actor)?.angle ?? hook?.angle ?? 0;
  const localPoint = pointAt(
    localAngle,
    hook?.length ?? 0,
    hook?.pivotX ?? 0.5,
  );

  const canCast =
    !pending &&
    !frozen &&
    !!player &&
    !view.ready.includes(actor) &&
    (haul ||
      (hook?.phase === "swing" && (!shop || view.shopOffers.length > 0)));
  const castBinding = useGameBinding("miner.drop", " ");
  const startCast = () => {
    if (!canCast) return;
    if (haul) return send({ type: "haul" });
    if (!hook || cast.current) return;
    const angle = samples.current.get(actor)?.angle ?? hook.angle;
    cast.current = { angle, at: performance.now() };
    send(shop ? shopDrop(view, actor, angle) : { type: "drop", angle });
  };
  useGameCommands([
    {
      id: "miner.drop",
      title: "下钩 / 节拍拉钩",
      scope: "miner",
      binding: " ",
      enabled: () => canCast,
      run: startCast,
    },
  ]);

  useEffect(() => {
    if (frozen) {
      samples.current.clear();
      cast.current = null;
      return;
    }
    const rigs = Array.from(
      scene.current?.querySelectorAll<SVGGElement>("[data-rig]") ?? [],
    );
    let frame: number;
    const paint = (time: number) => {
      const current = latest.current;
      for (const rig of rigs) {
        const seat = Number(rig.dataset.rig);
        const player = current.players[seat];
        const state = player.hook;
        const motion = samples.current.get(seat) ?? new MinerRigMotion();
        samples.current.set(seat, motion);
        const sample = motion.sample(
          state,
          current.tick,
          time,
          quickHook(current, player),
        );
        const localCast = seat === actor ? cast.current : null;
        if (localCast && (state.phase !== "swing" || time - localCast.at > 450))
          cast.current = null;
        const preview = localCast && cast.current && state.phase === "swing";
        const angle = preview ? localCast.angle : sample.angle;
        const length =
          state.phase === "swing"
            ? 0.035 +
              (preview ? Math.min(0.17, (time - localCast.at) * 0.0014) : 0)
            : sample.length;
        const end = pointAt(angle, length, state.pivotX);
        const rope = rig.firstElementChild!;
        rope.setAttribute("x2", String(end.x));
        rope.setAttribute("y2", String(end.y));
        rope.nextElementSibling!.setAttribute(
          "transform",
          `translate(${end.x} ${end.y}) rotate(${-angle})`,
        );
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [actor, frozen, node.id, view.players.length]);

  return (
    <section className="miner-live" data-shop={shop} data-controls={!!player}>
      <header className="miner-live-status">
        <div>
          <strong>{node.name}</strong>
          <small>第 {view.levelsPlayed + 1} 关</small>
        </div>
        {shop ? (
          <strong className="miner-stock-count">
            {view.shopOffers.length
              ? `剩余 ${view.shopOffers.length} 件`
              : "已售罄"}
          </strong>
        ) : view.untimed ? null : (
          <time data-low={low}>
            {Math.ceil(node.timeLeftMs / 1000)}
            <small>秒</small>
          </time>
        )}
        <div className="miner-live-goal">
          {pauseControl}
          {!shop &&
            (view.mode === "endless" ? (
              <RoguelikeHud
                metrics={[
                  {
                    name: "本关采集",
                    value: view.teamScore - view.levelScore,
                    limit: view.levelTarget,
                    tone: "gold",
                  },
                  { name: "团队生命", value: view.lives, tone: "health" },
                ]}
              />
            ) : view.teams.some((team) => team !== view.teams[0]) ? (
              <>
                <small>队伍得分</small>
                <strong>{view.teamScores.join(" : ")}</strong>
              </>
            ) : (
              <>
                <small>团队目标</small>
                <strong>
                  {view.teamScore} / {view.teamQuota}
                </strong>
              </>
            ))}
        </div>
      </header>
      <div className="miner-shift-roster" aria-label="矿工">
        {view.players.map((other) => (
          <div
            key={other.seat}
            data-own={other.seat === actor}
            style={{ "--rig": playerColor[other.seat] } as React.CSSProperties}
          >
            <img src={characterArt[other.character]} alt="" />
            <span title={names[other.seat]}>{names[other.seat]}</span>
            <strong>{other.score}</strong>
            {action?.actor === other.seat && !!action.value && (
              <b key={action.id} className="miner-payout">
                {action.bonus ? "接力 " : ""}+{action.value}
              </b>
            )}
          </div>
        ))}
      </div>
      <div
        className="miner-cave"
        data-cave={node.sourceKind}
        style={{ "--mine-aspect": 1 / MINE_DEPTH } as CSSProperties}
      >
        <svg
          ref={scene}
          className="miner-cave-field"
          viewBox={`0 0 ${width} ${floor}`}
          role="img"
          aria-label={shop ? "补给坑道与实时矿钩" : "矿洞与实时矿钩"}
        >
          <defs>
            <linearGradient id={`cave${artId}`} x2=".26" y2="1">
              <stop stopColor="var(--mine-stone-top)" />
              <stop offset=".5" stopColor="var(--mine-stone-mid)" />
              <stop offset="1" stopColor="var(--mine-stone-deep)" />
            </linearGradient>
            <pattern
              id={`ore${artId}`}
              width="14"
              height="12"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M1 4l2-1 2 1-1 2H2ZM10 9l2 .6-1 1.3z"
                fill="#86a29e"
                opacity=".22"
              />
              <path
                d="m7 1 2 1m-6 7 2 1"
                stroke="#101928"
                strokeWidth=".32"
                opacity=".5"
              />
            </pattern>
            <radialGradient id={`lamp${artId}`}>
              <stop stopColor="#ffd38d" stopOpacity=".52" />
              <stop offset="1" stopColor="#ffd38d" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={width} height={floor} fill={`url(#cave${artId})`} />
          <path
            d="M0 21 17 13 34 20 57 15 72 23 100 12V0H0Z"
            fill="var(--mine-stratum)"
          />
          <path
            d="M0 58 14 54 36 62 53 53 71 58 83 48 100 53V72H0Z"
            fill="var(--mine-shadow)"
            opacity=".52"
          />
          <rect width={width} height={floor} fill={`url(#ore${artId})`} />
          <path
            d="M0 10 8 8 21 10 40 6 53 8 67 6 85 9 100 7V0H0Z"
            fill="var(--mine-ledge)"
          />
          {[6, 94].map((x) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <circle cy="13" r="12" fill={`url(#lamp${artId})`} />
              <path d="M0 0v9" stroke="#bd9062" strokeWidth=".3" />
              <path
                d="m-1.1 9-.65 3.1.75.7h2l.75-.7L1.1 9Z"
                fill="#ffe09f"
                stroke="#9c6647"
                strokeWidth=".34"
              />
            </g>
          ))}
          {node.waterLevel > 0 && (
            <g className="miner-water">
              <rect
                y={node.waterLevel * floor}
                width={width}
                height={(1 - node.waterLevel) * floor}
              />
              <path d={`M0 ${node.waterLevel * floor}H${width}`} />
            </g>
          )}
          {node.mechanics.includes("centerWall") && (
            <path
              d="M48.5 11 51 14 51.5 66 49 70Z"
              fill="#91a497"
              opacity=".35"
            />
          )}
          {shop && (
            <path
              className="miner-shop-shelf"
              d="M6 48H94v1.5H6Z M11 49.5h1.5V64H11Z M87.5 49.5H89V64h-1.5Z"
            />
          )}
          {node.objects
            .filter((object) => !object.removed && object.hookedBy === null)
            .map((object) => {
              const dim =
                node.mechanics.some((id) =>
                  [
                    "blackout",
                    "fog",
                    "sonar",
                    "fogRollsIn",
                    "risingFog",
                  ].includes(id),
                ) &&
                Math.hypot(
                  object.x * width - localPoint.x,
                  object.y * floor - localPoint.y,
                ) > 26;
              return (
                <g
                  key={object.id}
                  transform={`translate(${object.x * width} ${object.y * floor})`}
                  opacity={dim ? 0.25 : object.phantom ? 0.5 : 1}
                >
                  {object.offerItem ? (
                    (() => {
                      const offer = view.shopOffers.find(
                        ({ id }) => id === object.id,
                      );
                      if (!offer) return null;
                      const item = minerItems[offer.itemId];
                      const price = shopPrice(view, offer.price);
                      return (
                        <g
                          className="miner-crate"
                          data-affordable={!!player && player.coins >= price}
                          data-offer={offer.id}
                        >
                          <title>{`${item.name} · ${price} 金币 · ${item.description}`}</title>
                          <rect
                            x="-5.7"
                            y="-4.8"
                            width="11.4"
                            height="9.6"
                            rx="1.2"
                          />
                          <text y="2.3" fontSize="6.2" textAnchor="middle">
                            {item.emoji}
                          </text>
                          <text
                            y="9"
                            className="miner-crate-name"
                            textAnchor="middle"
                          >
                            {item.name}
                          </text>
                          <text
                            y="13"
                            className="miner-crate-price"
                            textAnchor="middle"
                          >
                            {price}
                          </text>
                        </g>
                      );
                    })()
                  ) : (
                    <Ore object={object} />
                  )}
                </g>
              );
            })}
          {action?.point && action.kind !== "tnt" && (
            <circle
              key={action.id}
              className="miner-vein-flash"
              cx={action.point.x * width}
              cy={action.point.y * floor}
              r="5"
              fill="none"
              stroke="var(--mine-lamp)"
              strokeWidth="1"
            />
          )}
          {action?.kind === "tnt" && action.point && (
            <circle
              key={action.id}
              className="miner-blast"
              cx={action.point.x * width}
              cy={action.point.y * floor}
              r="11"
              fill="none"
              stroke="#ffda96"
              strokeWidth="2"
            />
          )}
          {view.players.map((other) => {
            const { hook: rig, seat } = other;
            const current = samples.current.get(seat);
            const angle = !frozen && current ? current.angle : rig.angle;
            const length = !frozen && current ? current.length : rig.length;
            const end = pointAt(
              angle,
              rig.phase === "swing" ? 0.035 : length,
              rig.pivotX,
            );
            const loaded = node.objects.find(
              (object) => object.id === rig.targetId && !object.removed,
            );
            return (
              <g key={seat} data-rig={seat} color={playerColor[seat]}>
                <line
                  x1={rig.pivotX * width}
                  y1={pivot}
                  x2={end.x}
                  y2={end.y}
                  stroke="currentColor"
                  strokeWidth={seat === actor ? ".46" : ".28"}
                  strokeLinecap="round"
                />
                <g transform={`translate(${end.x} ${end.y}) rotate(${-angle})`}>
                  {loaded && (
                    <g transform={`translate(0 ${loaded.radius * width})`}>
                      {loaded.offerItem ? (
                        <g className="miner-crate">
                          <rect
                            x="-4.8"
                            y="-4.2"
                            width="9.6"
                            height="8.4"
                            rx="1"
                          />
                          <text y="2.5" fontSize="6.3" textAnchor="middle">
                            {minerItems[loaded.offerItem].emoji}
                          </text>
                        </g>
                      ) : (
                        <Ore object={loaded} />
                      )}
                    </g>
                  )}
                  {loaded && rig.nextBeatTick > 0 && (
                    <circle
                      r={loaded.radius * width + 0.8}
                      fill="none"
                      stroke="#ffe5a3"
                      strokeWidth={
                        Math.abs(view.tick - rig.nextBeatTick) <= 1
                          ? ".62"
                          : ".17"
                      }
                    />
                  )}
                  <path
                    d="M-.8-.4v1.1l-.65.8.85.35.6-.52.6.52.85-.35L.8.7V-.4Z"
                    fill={seat === actor ? "#fff4d3" : "currentColor"}
                    stroke="#1b2830"
                    strokeWidth=".14"
                  />
                </g>
                <rect
                  x={rig.pivotX * width - 1.9}
                  y={pivot - 1.55}
                  rx=".65"
                  width="3.8"
                  height="2.15"
                  fill="#304044"
                  stroke="currentColor"
                  strokeWidth=".24"
                />
                <circle
                  cx={rig.pivotX * width}
                  cy={pivot - 0.48}
                  r=".57"
                  fill="currentColor"
                />
              </g>
            );
          })}
        </svg>
        {node.waterLevel > 0 && (
          <p className="miner-water-hint">水下照常下钩，收放速度减慢</p>
        )}
        {!!node.mechanics.length && (
          <div className="miner-hazards">
            {node.mechanics.map((id) => (
              <span key={id} title={minerMechanics[id].description}>
                {minerMechanics[id].name}
              </span>
            ))}
          </div>
        )}
      </div>
      {player && (
        <footer className="miner-controls">
          <div className="miner-wallet">
            <span>金币</span>
            <strong>{player.coins}</strong>
          </div>
          {shop &&
            action?.actor === actor &&
            (action.kind === "shop-miss" || action.kind === "buy") && (
              <span className="miner-shop-feedback" role="status">
                {action.text}
              </span>
            )}
          {!shop &&
            action?.actor === actor &&
            action.kind === "catch" &&
            action.value === undefined && (
              <span className="miner-shop-feedback" role="status">
                {action.text}
              </span>
            )}
          <div className="miner-control-buttons">
            <button
              type="button"
              className="miner-drop"
              data-ready={haul && Math.abs(view.tick - hook!.nextBeatTick) <= 1}
              disabled={!canCast}
              onClick={startCast}
            >
              {haul
                ? "节拍拉钩"
                : hook?.phase === "shoot"
                  ? "出钩中"
                  : hook?.phase === "reel"
                    ? "收钩中"
                    : "下钩"}{" "}
              <Shortcut binding={castBinding} />
            </button>
            {!shop && character && charge && (
              <button
                type="button"
                className="miner-skill"
                disabled={
                  pending ||
                  player.specialCharge < charge ||
                  (player.character === "merchant" && !target)
                }
                onClick={() => send({ type: "special" })}
              >
                {character.special}{" "}
                <small>
                  {Math.min(charge, player.specialCharge)}/{charge}
                </small>
              </button>
            )}
          </div>
          <div className="miner-inventory">
            {!shop &&
              Object.entries(player.items)
                .filter(([, count]) => count > 0)
                .map(([id, count]) => {
                  const itemId = id as MinerItemId;
                  const item = minerItems[itemId];
                  return (
                    <button
                      type="button"
                      key={id}
                      aria-label={`${item.name} ×${count}`}
                      title={item.name}
                      disabled={pending || (id === "dynamite" && !target)}
                      onClick={() => send({ type: "use-item", itemId })}
                    >
                      {item.emoji}
                      <small>{count}</small>
                    </button>
                  );
                })}
          </div>
          {extraControls}
        </footer>
      )}
    </section>
  );
}
