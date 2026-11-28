import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { Action } from "../../domain/actions";
import {
  golfBallRadius,
  golfCupRadius,
  golfFrameMs,
} from "../../domain/golf/physics";
import { GolfTerrainOverlay } from "./GolfTerrainOverlay";
import { golfTotal } from "../../domain/golf/rules";
import type { GolfPoint, GolfPutt, GolfState } from "../../domain/golf/types";
import type { GameSnapshot } from "../OriginalGame";
import { aimFromPointer, pullStrength } from "../pool/aim";
import { useTurnClock } from "../use-turn-clock";
import { PartyBoard } from "../ui/PartyBoard";
import { Button, Slider } from "../ui/Controls";
import "../ui/party-games.css";

const ballColors = [
  "#f9faed",
  "#eda547",
  "#80bcee",
  "#f17494",
  "#bd9af4",
  "#b3dd59",
];
const pullDistance = 3.8;
const minPower = 0.035;
const flatAngle = (radians: number) =>
  Math.atan2(Math.sin(radians), Math.cos(radians));

export function GolfTable({
  view,
  snapshot,
  act,
  replay,
  pending,
  animate,
  rate,
  onRendererToggle,
}: {
  view: GolfState["view"];
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  replay: boolean;
  pending: boolean;
  animate: boolean;
  rate: number;
  onRendererToggle?: () => void;
}) {
  const course = view.courses[view.hole]!;

  const width = course.width;
  const height = course.height;
  const nextIn = useTurnClock(
    snapshot.turnDeadline,
    snapshot.serverTime,
    !!snapshot.paused,
  );
  const { actor } = snapshot;
  const me = view.players[actor];
  const interactive = !replay && !pending && !snapshot.paused && !!me;
  const seated = !replay && !!me;
  const ready =
    view.phase === "putting" &&
    seated &&
    !me.sunk &&
    me.strokes < (view.strokeCap ?? Infinity);
  const [aim, setAim] = useState(() =>
    me ? (aimFromPointer(me.position, course.cup, 0) ?? 0) : 0,
  );
  const [power, setPower] = useState(0.42);
  const [pull, setPull] = useState<{ aim: number; power: number }>();
  const drag = useRef<number>();
  const dragStart = useRef<GolfPoint | null>(null);
  const [followBall, setFollowBall] = useState(false);
  const [moving, setMoving] = useState<Record<number, GolfPoint>>({});
  const lastStrokes = useRef(view.players.map((player) => player.strokes));
  const shots = useRef(
    new Map<
      number,
      { shot: NonNullable<NonNullable<typeof me>["lastShot"]>; time: number }
    >(),
  );
  const raf = useRef(0);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const turf = useId();
  const movementKey = view.players.map(({ strokes }) => strokes).join(":");

  useLayoutEffect(() => {
    const refreshed = view.players.map(({ strokes }) => strokes);
    if (animate) {
      for (const [index, player] of view.players.entries()) {
        if (player.strokes < lastStrokes.current[index])
          shots.current.delete(index);
        if (player.strokes <= lastStrokes.current[index] || !player.lastShot)
          continue;
        shots.current.set(index, { shot: player.lastShot, time: 0 });
      }
    } else {
      shots.current.clear();
    }
    lastStrokes.current = refreshed;
    const first: Record<number, GolfPoint> = {};
    for (const [index, item] of shots.current)
      first[index] = item.shot.frames[Math.floor(item.time / golfFrameMs)];
    setMoving(first);
    if (!shots.current.size || !animate) return;
    let before = performance.now();
    const tick = (now: number) => {
      const positions: Record<number, GolfPoint> = {};
      for (const [index, item] of shots.current) {
        item.time += Math.max(0, now - before) * rateRef.current;
        const fraction = item.time / golfFrameMs;
        const frame = Math.floor(fraction);
        const start = item.shot.frames[frame];
        const next = item.shot.frames[frame + 1];
        if (!start || !next) {
          shots.current.delete(index);
          continue;
        }
        positions[index] = {
          x: start.x + (next.x - start.x) * (fraction - frame),
          y: start.y + (next.y - start.y) * (fraction - frame),
        };
      }
      setMoving(positions);
      before = now;
      if (shots.current.size) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [movementKey, animate]);

  const canPutt = ready && interactive && moving[actor] === undefined;
  useEffect(() => {
    if (!canPutt) return;
    const reset = (event: KeyboardEvent) => {
      if (event.key !== "r" && event.key !== "R") return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      act({ type: "golf-reset", hole: view.hole });
    };
    window.addEventListener("keydown", reset);
    return () => window.removeEventListener("keydown", reset);
  }, [act, canPutt, view.hole]);
  function shoot(angle: number, strength: number) {
    if (!canPutt || strength < minPower) return;
    const action: GolfPutt = {
      type: "golf-putt",
      hole: view.hole,
      previousStrokes: me.strokes,
      aim: flatAngle(angle),
      power: strength,
    };
    act(action);
  }

  const center = moving[actor] ?? me?.position ?? Object.values(moving)[0] ?? view.players[0]?.position ?? course.tee;
  const zoom = followBall ? Math.max(1.55, width / 19) : 1;
  const viewWidth = width / zoom;
  const viewHeight = height / zoom;
  const viewX = Math.max(0, Math.min(width - viewWidth, center.x - viewWidth / 2));
  const viewY = Math.max(0, Math.min(height - viewHeight, center.y - viewHeight / 2));
  function point(event: PointerEvent<SVGSVGElement>): GolfPoint {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return center;
    const svgPoint = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  }

  function pullFrom(cursor: GolfPoint) {
    const angle = aimFromPointer(cursor, me.position, 0.1);
    if (angle === null) return { aim, power: 0 };
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const toXEdge =
      x >= 0 ? me.position.x / x : (width - me.position.x) / -x;
    const toYEdge =
      y >= 0 ? me.position.y / y : (height - me.position.y) / -y;
    const range = Math.max(
      0.3,
      Math.min(pullDistance, toXEdge - 0.12, toYEdge - 0.12),
    );
    return {
      aim: angle,
      power: pullStrength(angle, me.position, cursor, range),
    };
  }

  const vector = pull ?? { aim, power };
  const trace = canPutt && {
    x: me.position.x + Math.cos(vector.aim) * (0.55 + 3 * vector.power),
    y: me.position.y + Math.sin(vector.aim) * (0.55 + 3 * vector.power),
  };
  const totals = view.players.map(golfTotal);
  const best = Math.min(...totals);
  return (
    <section className="party-game golf-table" aria-label="迷你高尔夫">
      <header className="party-game-head">
        <div>
          <small>
            第 {view.hole + 1} / {view.holes} 洞
          </small>
          <h2>{course.name}</h2>
        </div>
        <div className="party-game-tags">
          <span>标准杆 {course.par}</span>
          {me?.lastShot?.water && !moving[actor] && (
            <strong role="status">落水罚一杆</strong>
          )}
          {me?.sunk && !moving[actor] && <strong role="status">已进洞</strong>}
          <Button type="button" aria-pressed={followBall} onClick={() => setFollowBall((value) => !value)}>{followBall ? "全景" : "跟球"}</Button>
          <Button
            type="button"
            disabled={!canPutt}
            onClick={() => act({ type: "golf-reset", hole: view.hole })}
          >
            重置球位 R
          </Button>
          {onRendererToggle && <Button type="button" onClick={onRendererToggle}>3D</Button>}
        </div>
      </header>
      <PartyBoard width={width} height={height}>
        <svg
          className="golf-field"
          role="img"
          aria-label={canPutt ? "果岭，在自己的球上向反方向拉杆后释放" : "果岭"}
          viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
          data-golf-ready={canPutt}
          onPointerDown={(event) => {
            if (!canPutt || event.button !== 0 || drag.current !== undefined)
              return;
            const cursor = point(event);
            if (
              Math.hypot(cursor.x - me.position.x, cursor.y - me.position.y) >
              0.55
            ) {
              const angle = aimFromPointer(me.position, cursor, 0.1);
              if (angle !== null) setAim(angle);
              return;
            }
            drag.current = event.pointerId;
            dragStart.current = cursor;
            setPull({ aim, power: 0 });
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (drag.current === event.pointerId)
              setPull(pullFrom(point(event)));
          }}
          onPointerUp={(event) => {
            if (drag.current !== event.pointerId) return;
            const cursor = point(event);
            const start = dragStart.current;
            dragStart.current = null;
            const shot = pullFrom(cursor);
            drag.current = undefined;
            setPull(undefined);
            if (!start || Math.hypot(cursor.x - start.x, cursor.y - start.y) <= 0.16)
              return;
            if (shot.power >= minPower) {
              setAim(shot.aim);
              setPower(shot.power);
              shoot(shot.aim, shot.power);
            }
          }}
          onLostPointerCapture={(event) => {
            if (drag.current !== event.pointerId) return;
            drag.current = undefined;
            setPull(undefined);
          }}
        >
          <defs>
            <pattern
              id={turf}
              width="2"
              height="2"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(28)"
            >
              <rect width="2" height="2" className="golf-grass" />
              <rect width="1" height="2" className="golf-grass-band" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill={`url(#${turf})`} />
          <GolfTerrainOverlay course={course} />
          <rect
            x=".10"
            y=".10"
            width={width - 0.2}
            height={height - 0.2}
            rx=".24"
            className="golf-rails"
          />
          <circle
            cx={course.tee.x}
            cy={course.tee.y}
            r=".42"
            className="golf-tee"
          />
          <circle
            cx={course.cup.x}
            cy={course.cup.y}
            r=".70"
            className="golf-green-ring"
          />
          {(["sand", "water", "banks"] as const).flatMap((feature) =>
            course[feature].map(({ x, y, width, height }, index) => (
              <rect
                key={`${feature}:${index}`}
                className={`golf-${feature}`}
                x={x - width / 2}
                y={y - height / 2}
                width={width}
                height={height}
                rx=".12"
              />
            )),
          )}
          <circle
            cx={course.cup.x}
            cy={course.cup.y}
            r={golfCupRadius}
            className="golf-cup"
          />
          <path
            className="golf-pole"
            d={`M ${course.cup.x} ${course.cup.y} v -0.97`}
          />
          <path
            className="golf-flag"
            d={`M ${course.cup.x} ${course.cup.y - 0.97} l 0.61 0.22 l -0.61 0.24 Z`}
          />
          {trace && (
            <line
              className="golf-aim"
              x1={me.position.x}
              y1={me.position.y}
              x2={trace.x}
              y2={trace.y}
            />
          )}
          {[...view.players.keys()]
            .filter((index) => index !== actor)
            .concat(me ? actor : [])
            .map((index) => {
              const player = view.players[index];
              const position = moving[index] ?? player.position;
              if (!moving[index] && player.sunk) return null;
              return (
                <g key={index}>
                  {index === actor && (
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r=".30"
                      className="golf-player-ring"
                    />
                  )}
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={golfBallRadius}
                    fill={ballColors[index]}
                    className="golf-ball"
                  />
                </g>
              );
            })}
        </svg>
      </PartyBoard>
      <ol className="party-game-scores" aria-label="杆数">
        {view.players.map((player, index) => (
          <li key={index} aria-current={actor === index}>
            <i
              className="golf-score-dot"
              style={{ backgroundColor: ballColors[index] }}
              aria-hidden="true"
            />
            <span>{snapshot.seats[index]?.name || `玩家 ${index + 1}`}</span>
            {view.phase === "finished" && totals[index] === best ? (
              <small>获胜</small>
            ) : (
              player.sunk && !moving[index] && <small>进洞</small>
            )}
            <strong>
              {view.phase === "putting" ? player.strokes : totals[index]} 杆
            </strong>
          </li>
        ))}
      </ol>
      {view.phase === "putting" && seated && (
        <div className="party-game-controls golf-controls">
          <label>
            方向
            <Slider
              aria-label="方向"
              disabled={!canPutt}
              min={-180}
              max={180}
              step={1}
              value={Math.round((aim * 180) / Math.PI)}
              onValueChange={(degrees) => setAim((degrees * Math.PI) / 180)}
            />
          </label>
          <label>
            力度
            <Slider
              aria-label="力度"
              disabled={!canPutt}
              min={4}
              max={100}
              step={1}
              value={Math.max(4, Math.round(vector.power * 100))}
              onValueChange={(value) => setPower(value / 100)}
            />
          </label>
          <Button
            variant="primary"
            disabled={!canPutt}
            onClick={() => shoot(aim, power)}
          >
            推杆
          </Button>
        </div>
      )}
      {view.phase === "scorecard" && seated ? (
        <div className="party-game-controls">
          <Button
            variant="primary"
            disabled={
              !interactive ||
              Object.keys(moving).length > 0 ||
              (nextIn ?? 0) > 0
            }
            onClick={() => act({ type: "golf-next", hole: view.hole })}
          >
            下一洞
          </Button>
        </div>
      ) : view.phase === "finished" ? (
        <div className="party-game-controls">
          <small role="status">总杆数结算</small>
        </div>
      ) : null}
    </section>
  );
}
