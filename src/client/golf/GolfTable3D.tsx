import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { Action } from "../../domain/types";
import { golfFrameMs } from "../../domain/golf/physics";
import { golfTotal } from "../../domain/golf/rules";
import type { GolfPoint, GolfPutt, GolfState } from "../../domain/golf/types";
import type { GameSnapshot } from "../OriginalGame";
import { aimFromPointer, pullStrength } from "../pool/aim";
import { useTurnClock } from "../use-turn-clock";
import { Button, Slider } from "../ui/Controls";
import { GolfScene3D, type GolfSceneInputMode, type GolfSceneStatus } from "./render3d/GolfScene3D";
import type { GolfEnvironment } from "../scene3d/environment";
import "../ui/party-games.css";
import "./golf-3d.css";

const ballColors = ["#f9faed", "#eda547", "#80bcee", "#f17494", "#bd9af4", "#b3dd59"];
const minPower = 0.035;
const flatAngle = (radians: number) => Math.atan2(Math.sin(radians), Math.cos(radians));

export function GolfTable3D({
  view,
  snapshot,
  act,
  replay,
  pending,
  animate,
  rate,
  environment,
  quality = "balanced",
  onRendererToggle,
  onUnavailable,
}: {
  view: GolfState["view"];
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  replay: boolean;
  pending: boolean;
  animate: boolean;
  rate: number;
  environment: GolfEnvironment;
  quality?: import("../scene3d/environment").Scene3dQuality;
  onRendererToggle: () => void;
  onUnavailable: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<GolfScene3D>();
  const [status, setStatus] = useState<GolfSceneStatus>({ phase: "loading" });
  const [followBall, setFollowBall] = useState(false);
  const [cameraMode, setCameraMode] = useState<GolfSceneInputMode>("aim");
  const dragStart = useRef<GolfPoint | null>(null);
  const [aim, setAim] = useState(() => {
    const me = view.players[snapshot.actor];
    return me ? (aimFromPointer(me.position, view.courses[view.hole]!.cup, 0) ?? 0) : 0;
  });
  const [power, setPower] = useState(0.42);
  const [pull, setPull] = useState<{ aim: number; power: number }>();
  const [moving, setMoving] = useState<Record<number, GolfPoint>>({});
  const drag = useRef<number>();
  const shots = useRef(new Map<number, { shot: NonNullable<ReturnType<() => GolfState["view"]["players"][number]["lastShot"]>>; time: number }>());
  const lastStrokes = useRef(view.players.map((player) => player.strokes));
  const raf = useRef(0);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const course = view.courses[view.hole]!;
  const actor = snapshot.actor;
  const me = view.players[actor];
  const seated = !replay && !!me;
  const interactive = !replay && !pending && !snapshot.paused && !!me;
  const nextIn = useTurnClock(snapshot.turnDeadline, snapshot.serverTime, !!snapshot.paused);
  const ready = view.phase === "putting" && seated && !me.sunk && me.strokes < (view.strokeCap ?? Infinity);
  const canPutt = ready && interactive && moving[actor] === undefined;
  const movementKey = view.players.map(({ strokes }) => strokes).join(":");

  const initialHole = useRef({ course, hole: view.hole });
  initialHole.current = { course, hole: view.hole };

  useLayoutEffect(() => {
    if (!host.current) return;
    const current = new GolfScene3D(
      host.current,
      environment,
      initialHole.current.course,
      setStatus,
      quality,
      initialHole.current.hole,
    );
    scene.current = current;
    return () => {
      current.dispose();
      scene.current = undefined;
    };
  }, [environment, quality]);

  useEffect(() => {
    if (status.phase === "error") onUnavailable();
  }, [status.phase, onUnavailable]);

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

  useEffect(() => {
    scene.current?.update(view, moving);
  }, [view, moving, environment, quality]);

  useEffect(() => {
    scene.current?.setInputMode(cameraMode);
  }, [cameraMode, environment, quality]);
  useEffect(() => {
    scene.current?.focusBall(followBall ? moving[actor] ?? me?.position ?? view.players[0]?.position ?? null : null);
  }, [followBall, moving, actor, me?.position, view.players, environment, quality]);

  useEffect(() => {
    scene.current?.setAim(me?.position ?? null, aim, power, canPutt || !!pull);
  }, [aim, power, canPutt, pull, me?.position, environment, quality]);

  useLayoutEffect(() => {
    const refreshed = view.players.map(({ strokes }) => strokes);
    if (animate) {
      for (const [index, player] of view.players.entries()) {
        if (player.strokes < lastStrokes.current[index]) shots.current.delete(index);
        if (player.strokes <= lastStrokes.current[index] || !player.lastShot) continue;
        shots.current.set(index, { shot: player.lastShot, time: 0 });
      }
    } else shots.current.clear();
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

  function point(event: PointerEvent<HTMLDivElement>): GolfPoint | null {
    return scene.current?.groundPoint(event.clientX, event.clientY) ?? null;
  }
  function pullFrom(cursor: GolfPoint) {
    if (!me) return { aim, power: 0 };
    const angle = aimFromPointer(cursor, me.position, 0.1);
    if (angle === null) return { aim, power: 0 };
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const toXEdge = x >= 0 ? me.position.x / x : (course.width - me.position.x) / -x;
    const toYEdge = y >= 0 ? me.position.y / y : (course.height - me.position.y) / -y;
    const range = Math.max(0.3, Math.min(3.8, toXEdge - 0.12, toYEdge - 0.12));
    return { aim: angle, power: pullStrength(angle, me.position, cursor, range) };
  }
  function shoot(angle: number, strength: number) {
    if (!canPutt || !me || strength < minPower) return;
    const action: GolfPutt = {
      type: "golf-putt",
      hole: view.hole,
      previousStrokes: me.strokes,
      aim: flatAngle(angle),
      power: strength,
    };
    act(action);
  }
  const vector = pull ?? { aim, power };
  const totals = view.players.map(golfTotal);
  const best = Math.min(...totals);
  return (
    <section className="party-game golf-table golf-3d-table" aria-label="迷你高尔夫 3D">
      <header className="party-game-head">
        <div>
          <small>第 {view.hole + 1} / {view.holes} 洞</small>
          <h2>{course.name}</h2>
        </div>
        <div className="party-game-tags">
          <span>标准杆 {course.par}</span>
          {me?.lastShot?.water && !moving[actor] && <strong role="status">落水罚一杆</strong>}
          {me?.sunk && !moving[actor] && <strong role="status">已进洞</strong>}
          <span className="golf-camera-hint">WASD 移动镜头 · QE 旋转</span>
          <Button type="button" onClick={() => setCameraMode(cameraMode === "aim" ? "orbit" : "aim")}>
            {cameraMode === "aim" ? "转动视角" : "击球视角"}
          </Button>
          <Button type="button" aria-pressed={followBall} onClick={() => setFollowBall((value) => !value)}>{followBall ? "全景" : "跟球"}</Button>
          <Button type="button" onClick={() => { setFollowBall(false); scene.current?.resetCamera(); }}>视角复位</Button>
          <Button type="button" disabled={!canPutt} onClick={() => act({ type: "golf-reset", hole: view.hole })}>重置球位 R</Button>
          <Button type="button" onClick={onRendererToggle}>2D</Button>
        </div>
      </header>
      <div
        ref={host}
        className="golf-3d-host"
        data-ready={status.phase === "ready"}
        onPointerDown={(event) => {
          if (!canPutt || cameraMode !== "aim" || event.button !== 0 || !me) return;
          const cursor = point(event);
          if (!cursor) return;
          if (Math.hypot(cursor.x - me.position.x, cursor.y - me.position.y) > 0.85) {
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
          if (drag.current !== event.pointerId) return;
          const cursor = point(event);
          if (cursor) setPull(pullFrom(cursor));
        }}
        onPointerUp={(event) => {
          if (drag.current !== event.pointerId) return;
          const cursor = point(event);
          drag.current = undefined;
          setPull(undefined);
          if (!cursor) return;
          const start = dragStart.current;
          dragStart.current = null;
          const dragged =
            !!start && Math.hypot(cursor.x - start.x, cursor.y - start.y) > 0.16;
          const shot = pullFrom(cursor);
          if (dragged && shot.power >= minPower) {
            setAim(shot.aim);
            setPower(shot.power);
            shoot(shot.aim, shot.power);
          }
        }}
        onLostPointerCapture={() => {
          drag.current = undefined;
          dragStart.current = null;
          setPull(undefined);
        }}
      >
        {status.phase !== "ready" && (
          <div className="golf-3d-loading" role="status">
            {status.phase === "error" ? status.message : "正在加载 3D 球场"}
          </div>
        )}
      </div>
      <ol className="party-game-scores" aria-label="杆数">
        {view.players.map((player, index) => (
          <li key={index} aria-current={actor === index}>
            <i className="golf-score-dot" style={{ backgroundColor: ballColors[index] }} aria-hidden="true" />
            <span>{snapshot.seats[index]?.name || `玩家 ${index + 1}`}</span>
            {view.phase === "finished" && totals[index] === best ? <small>获胜</small> : player.sunk && !moving[index] && <small>进洞</small>}
            <strong>{view.phase === "putting" ? player.strokes : totals[index]} 杆</strong>
          </li>
        ))}
      </ol>
      {view.phase === "putting" && seated && (
        <div className="party-game-controls golf-controls">
          <label>
            方向
            <Slider aria-label="方向" disabled={!canPutt} min={-180} max={180} step={1} value={Math.round((aim * 180) / Math.PI)} onValueChange={(degrees) => setAim((degrees * Math.PI) / 180)} />
          </label>
          <label>
            力度
            <Slider aria-label="力度" disabled={!canPutt} min={4} max={100} step={1} value={Math.max(4, Math.round(vector.power * 100))} onValueChange={(value) => setPower(value / 100)} />
          </label>
          <Button variant="primary" disabled={!canPutt} onClick={() => shoot(aim, power)}>推杆</Button>
        </div>
      )}
      {view.phase === "scorecard" && seated ? (
        <div className="party-game-controls">
          <Button variant="primary" disabled={!interactive || Object.keys(moving).length > 0 || (nextIn ?? 0) > 0} onClick={() => act({ type: "golf-next", hole: view.hole })}>下一洞</Button>
        </div>
      ) : view.phase === "finished" ? <div className="party-game-controls"><small role="status">总杆数结算</small></div> : null}
    </section>
  );
}
