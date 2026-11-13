import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  poolLayout,
  type PoolTableLayout,
} from "../../domain/pool/table";
import type { PoolBall, PoolShot, PoolView } from "../../domain/pool/types";
import type { Action } from "../../domain/types";
import { POOL_PLAYBACK_RATE, interpolateBalls } from "./frames";
import { poolBallColors } from "./colors";
import { poolAudio } from "./audio";
import { poolBallCursor, type PoolCursor } from "./aim";
import { ballAtPoint } from "./hit-ball";
import { poolBallLabel } from "./labels";
import { predictShot, type PoolPrediction } from "./prediction";
import { usePoolAim } from "./use-pool-aim";
import { usePoolClock } from "./use-pool-clock";
import type { PoolPlayback } from "./use-pool-playback";
import { PoolTableShell } from "./PoolTableShell";
import { useLayoutEffectSafe } from "../use-layout-effect";
import "./pool.css";

function tablePoint(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
): [number, number] {
  return [width / 2 + x * scale, height / 2 + y * scale];
}

function drawBall(
  context: CanvasRenderingContext2D,
  ball: PoolBall,
  width: number,
  height: number,
  scale: number,
  layout: PoolTableLayout,
  eightBall: boolean,
  special?: "bolt" | "gold",
) {
  const radius = layout.table.ballRadius * scale,
    [x, y] = tablePoint(ball.x, ball.y, width, height, scale),
    stripe = eightBall && ball.id >= 9 && ball.id <= 15;
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle =
    special === "bolt"
      ? "#2f80ed"
      : special === "gold"
        ? "#f2c94c"
        : (poolBallColors[ball.id] ?? "#ddd");
  context.fill();
  context.strokeStyle = "#233142";
  context.lineWidth = Math.max(1, radius * 0.05);
  context.stroke();
  if (stripe) {
    context.beginPath();
    context.arc(x, y, radius * 0.72, 0, Math.PI * 2);
    context.fillStyle = "#f8f7f2";
    context.fill();
  }
  if (ball.id !== 0) {
    context.beginPath();
    context.arc(x, y, radius * 0.37, 0, Math.PI * 2);
    context.fillStyle = "#f8f7f2";
    context.fill();
    context.fillStyle = "#172330";
    context.font = `700 ${Math.max(8, radius * 0.42)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      special === "bolt" ? "⚡" : special === "gold" ? "★" : String(ball.id),
      x,
      y + radius * 0.02,
    );
  }
  context.restore();
}

function drawPrediction(
  context: CanvasRenderingContext2D,
  prediction: PoolPrediction,
  width: number,
  height: number,
  scale: number,
  layout: PoolTableLayout,
) {
  const drawPath = (path: { x: number; y: number }[], color: string) => {
    if (path.length < 2) return;
    context.beginPath();
    context.setLineDash([6, 6]);
    path.forEach((point, index) => {
      const [x, y] = tablePoint(point.x, point.y, width, height, scale);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
    context.setLineDash([]);
  };
  drawPath(prediction.cue, "#f5d37a");
  if (prediction.ghost) {
    const [x, y] = tablePoint(
      prediction.ghost.x,
      prediction.ghost.y,
      width,
      height,
      scale,
    );
    context.beginPath();
    context.setLineDash([4, 4]);
    context.arc(x, y, layout.table.ballRadius * scale, 0, Math.PI * 2);
    context.strokeStyle = "#f5d37a";
    context.lineWidth = 1.5;
    context.stroke();
    context.setLineDash([]);
  }
}

function drawTable(
  canvas: HTMLCanvasElement,
  view: PoolView,
  shot: PoolShot | null,
  elapsed: number,
  animating: boolean,
  cueBall: { x: number; y: number } | null,
  stick: { x: number; y: number } | null,
  aim: number,
  power: number,
  prediction: PoolPrediction | null,
  strike: { progress: number; power: number } | null,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const dpr = Math.min(devicePixelRatio || 1, 2),
    width = canvas.clientWidth,
    height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * dpr))
    canvas.width = Math.round(width * dpr);
  if (canvas.height !== Math.round(height * dpr))
    canvas.height = Math.round(height * dpr);
  if (width < 80 || height < 80) return;
  const layout = poolLayout(view.mode);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  const padding = 36,
    scale = Math.min(
      (width - padding * 2) / layout.table.width,
      (height - padding * 2) / layout.table.height,
    );
  context.save();
  const [left, top] = tablePoint(
    -layout.table.width / 2,
    -layout.table.height / 2,
    width,
    height,
    scale,
  );
  context.fillStyle = "#5b3524";
  context.roundRect(
    left - 18,
    top - 18,
    layout.table.width * scale + 36,
    layout.table.height * scale + 36,
    26,
  );
  context.fill();
  context.fillStyle = "#116b5a";
  context.roundRect(
    left,
    top,
    layout.table.width * scale,
    layout.table.height * scale,
    10,
  );
  context.fill();
  context.strokeStyle = "#0a3f39";
  context.lineWidth = 3;
  context.stroke();
  for (const pocket of layout.pockets) {
    const [x, y] = tablePoint(pocket.x, pocket.y, width, height, scale);
    context.beginPath();
    context.arc(x, y, layout.table.pocketRadius * scale, 0, Math.PI * 2);
    context.fillStyle = "#02070b";
    context.fill();
  }
  context.strokeStyle = "#0a3f39";
  context.lineWidth = Math.max(2, 0.01 * scale);
  for (const jaw of layout.jaws) {
    const [ax, ay] = tablePoint(jaw.a.x, jaw.a.y, width, height, scale),
      [bx, by] = tablePoint(jaw.b.x, jaw.b.y, width, height, scale);
    context.beginPath();
    context.moveTo(ax, ay);
    context.lineTo(bx, by);
    context.stroke();
  }
  if (prediction)
    drawPrediction(context, prediction, width, height, scale, layout);
  const balls =
    shot && animating
      ? interpolateBalls(shot, elapsed)
      : view.balls.filter((ball) => ball.id !== 0);
  const specials = new Map(
    (view.party?.specials ?? []).map((special) => [special.id, special.kind]),
  );
  for (const ball of balls)
    if (!ball.pocketed)
      drawBall(
        context,
        ball,
        width,
        height,
        scale,
        layout,
        view.mode === "eight-ball",
        specials.get(ball.id),
      );
  if (!animating && cueBall)
    drawBall(
      context,
      { id: 0, x: cueBall.x, y: cueBall.y, pocketed: false },
      width,
      height,
      scale,
      layout,
      view.mode === "eight-ball",
    );
  if (stick) {
    const direction = { x: Math.cos(aim), y: Math.sin(aim) },
      stickPower = strike?.power ?? power,
      pulled = layout.table.ballRadius * 1.35 + stickPower * 0.42,
      reach =
        pulled +
        (layout.table.ballRadius * 1.02 - pulled) * (strike?.progress ?? 0),
      [tipX, tipY] = tablePoint(
        stick.x - direction.x * reach,
        stick.y - direction.y * reach,
        width,
        height,
        scale,
      ),
      [buttX, buttY] = tablePoint(
        stick.x - direction.x * (reach + 0.78),
        stick.y - direction.y * (reach + 0.78),
        width,
        height,
        scale,
      );
    if (!prediction) {
      const [aimX, aimY] = tablePoint(
        stick.x + direction.x * (0.22 + power * 0.22),
        stick.y + direction.y * (0.22 + power * 0.22),
        width,
        height,
        scale,
      );
      const [aimStartX, aimStartY] = tablePoint(
        stick.x + direction.x * layout.table.ballRadius,
        stick.y + direction.y * layout.table.ballRadius,
        width,
        height,
        scale,
      );
      context.beginPath();
      context.moveTo(aimStartX, aimStartY);
      context.lineTo(aimX, aimY);
      context.strokeStyle = "#f5d37a";
      context.globalAlpha = 0.35;
      context.lineWidth = 1.5;
      context.stroke();
      context.globalAlpha = 1;
    }
    context.beginPath();
    context.moveTo(buttX, buttY);
    context.lineTo(tipX, tipY);
    context.strokeStyle = "#d9b37a";
    context.lineWidth = Math.max(5, layout.table.ballRadius * scale * 0.34);
    context.lineCap = "round";
    context.stroke();
    context.beginPath();
    context.arc(
      tipX,
      tipY,
      Math.max(2, layout.table.ballRadius * scale * 0.14),
      0,
      Math.PI * 2,
    );
    context.fillStyle = "#f4f1e6";
    context.fill();
    const [ballX, ballY] = tablePoint(
      stick.x - direction.x * layout.table.ballRadius,
      stick.y - direction.y * layout.table.ballRadius,
      width,
      height,
      scale,
    );
    context.beginPath();
    context.setLineDash([4, 4]);
    context.moveTo(tipX, tipY);
    context.lineTo(ballX, ballY);
    context.strokeStyle = "#f5d37a";
    context.lineWidth = 2;
    context.stroke();
    context.setLineDash([]);
    if (strike && strike.progress > 0.55) {
      const [impactX, impactY] = tablePoint(
        stick.x,
        stick.y,
        width,
        height,
        scale,
      );
      context.beginPath();
      context.arc(
        impactX,
        impactY,
        layout.table.ballRadius * scale * (1 + (strike.progress - 0.55) * 3.2),
        0,
        Math.PI * 2,
      );
      context.strokeStyle = "#fff2c0";
      context.globalAlpha = 1 - strike.progress;
      context.lineWidth = 2;
      context.stroke();
      context.globalAlpha = 1;
    }
  }
  context.restore();
}

export function PoolTable({
  view,
  act,
  replay,
  pending,
  actor,
  turnDeadline,
  serverTime,
  paused = false,
  playback,
  onRendererToggle,
  soundEnabled = true,
  soundVolume = 0.5,
}: {
  view: PoolView;
  act: (action: Action) => void;
  replay: boolean;
  pending: boolean;
  actor: number;
  turnDeadline?: number;
  serverTime?: number;
  paused?: boolean;
  playback: PoolPlayback;
  onRendererToggle?: () => void;
  soundEnabled?: boolean;
  soundVolume?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [predict, setPredict] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [resize, setResize] = useState(0);
  const [cursor, setCursor] = useState<PoolCursor>("default");
  const [hoverBall, setHoverBall] = useState<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const layout = poolLayout(view.mode);
  const [strike, setStrike] = useState<{ at: number; power: number } | null>(
    null,
  );
  const [strikeProgress, setStrikeProgress] = useState(0);
  const playedPockets = useRef(new Set<number>());
  const playedImpacts = useRef(new Set<number>());
  const leadInStrike = useRef(-1);
  const shot = playback.shot;
  const lastFrame = shot?.frames.at(-1)?.t ?? 0;
  const animating =
    !!shot && playback.startedAt > 0 && elapsed * 1000 < lastFrame;
  const leadInActive = !!shot && playback.leadIn > 0 && elapsed * 1000 < 0;
  const leadInProgress = leadInActive
    ? Math.max(
        0,
        Math.min(
          1,
          1 + (elapsed * 1000) / (playback.leadIn * POOL_PLAYBACK_RATE),
        ),
      )
    : 0;
  const own =
    !replay &&
    !paused &&
    !pending &&
    view.phase !== "finished" &&
    view.turn === actor &&
    !animating;
  const cueBall =
    view.balls.find((ball) => ball.id === 0 && !ball.pocketed) ?? null;
  const aim = usePoolAim({
    balls: view.balls,
    cue: cueBall,
    own,
    ballInHand: view.ballInHand,
    resetKey: `${view.shotNumber}:${view.turn}`,
  });
  const remaining = usePoolClock(turnDeadline, serverTime, paused);
  const prediction =
    predict && aim.cue && own
      ? predictShot(
          view.balls,
          aim.cue,
          aim.aim,
          aim.power,
          poolLayout(view.mode),
        )
      : null;
  const cueVisible = own || (pending && !!strike && !animating);
  useEffect(() => {
    poolAudio.configure(soundEnabled, soundVolume);
  }, [soundEnabled, soundVolume]);
  useEffect(() => {
    const unlock = () => void poolAudio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  useEffect(() => {
    if (
      !shot ||
      !soundEnabled ||
      !leadInActive ||
      leadInProgress < 0.95 ||
      leadInStrike.current === playback.shotNumber
    )
      return;
    leadInStrike.current = playback.shotNumber;
    poolAudio.strike(shot.power);
  }, [shot, soundEnabled, leadInActive, leadInProgress, playback.shotNumber]);
  useLayoutEffectSafe(() => {
    playedPockets.current.clear();
    playedImpacts.current.clear();
    leadInStrike.current = -1;
    const current = playback.shot;
    if (!current || !playback.startedAt) return;
    const initial =
      ((performance.now() - playback.startedAt) / 1000) *
      POOL_PLAYBACK_RATE *
      1000;
    for (const pocket of current.pocketed)
      if (pocket.t <= initial) playedPockets.current.add(pocket.id);
    for (let index = 0; index < (current.impacts?.length ?? 0); index++)
      if (current.impacts[index].t <= initial) playedImpacts.current.add(index);
  }, [playback.shotNumber, playback.startedAt, playback.shot]);
  useEffect(() => {
    const current = playback.shot;
    if (!current || !soundEnabled || !playback.startedAt) return;
    const time =
      ((performance.now() - playback.startedAt) / 1000) *
      POOL_PLAYBACK_RATE *
      1000;
    for (const pocket of current.pocketed) {
      if (pocket.t <= time && !playedPockets.current.has(pocket.id)) {
        playedPockets.current.add(pocket.id);
        poolAudio.pocket();
      }
    }
    for (let index = 0; index < (current.impacts?.length ?? 0); index++) {
      const impact = current.impacts[index];
      if (impact.t <= time && !playedImpacts.current.has(index)) {
        playedImpacts.current.add(index);
        poolAudio.impact(impact.kind, impact.intensity);
      }
    }
  }, [elapsed, playback.shot, playback.startedAt, soundEnabled]);
  useLayoutEffectSafe(() => {
    const current = playback.shot;
    if (!current?.frames.length || !playback.startedAt) {
      setElapsed(Number.POSITIVE_INFINITY);
      return;
    }
    const last = current.frames[current.frames.length - 1].t;
    const now = () =>
      ((performance.now() - playback.startedAt) / 1000) * POOL_PLAYBACK_RATE;
    const initial = now();
    setElapsed(initial);
    if (initial * 1000 >= last) return;
    let frame = 0;
    const tick = () => {
      const next = now();
      setElapsed(next);
      if (next * 1000 < last) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playback.shotNumber, playback.startedAt, playback.shot]);
  useLayoutEffectSafe(() => {
    setStrike(null);
    setStrikeProgress(0);
  }, [playback.shotNumber]);
  useEffect(() => {
    if (!strike) return;
    let frame = 0;
    const tick = () => {
      const progress = Math.min(1, (performance.now() - strike.at) / 160);
      setStrikeProgress(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [strike]);
  useEffect(() => {
    if (!canvas.current) return;
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => setResize((value) => value + 1));
    if (observer && canvas.current) observer.observe(canvas.current);
    return () => observer?.disconnect();
  }, []);
  useLayoutEffectSafe(() => {
    if (!canvas.current) return;
    const stick = leadInActive
        ? shot!.cueBefore
        : animating || !cueVisible
          ? null
          : aim.cue,
      cueAim = leadInActive ? shot!.aim : aim.aim,
      cuePower = leadInActive ? shot!.power : aim.power,
      cueStrike = leadInActive
        ? { progress: leadInProgress, power: shot!.power }
        : strike && !animating
          ? { progress: strikeProgress, power: strike.power }
          : null;
    drawTable(
      canvas.current,
      view,
      shot,
      elapsed,
      animating,
      animating ? null : aim.cue,
      stick,
      cueAim,
      cuePower,
      prediction,
      cueStrike,
    );
  }, [
    view,
    shot,
    elapsed,
    aim.aim,
    aim.cue,
    aim.power,
    prediction,
    animating,
    resize,
    strike,
    strikeProgress,
    pending,
    replay,
    playback.leadIn,
    leadInActive,
    leadInProgress,
  ]);
  const pointAt = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect(),
      width = rect.width,
      height = rect.height,
      scale = Math.min(
        (width - 72) / layout.table.width,
        (height - 72) / layout.table.height,
      );
    if (scale <= 0) return { x: 0, y: 0 };
    return {
      x: (event.clientX - rect.left - width / 2) / scale,
      y: (event.clientY - rect.top - height / 2) / scale,
    };
  };
  const begin = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!own || !event.isPrimary || event.button !== 0) return;
    void poolAudio.unlock();
    const point = pointAt(event);
    const gesture = aim.begin(point);
    if (!gesture) return;
    setCursor(gesture === "place" ? "grabbing" : "default");
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary) return;
    const point = pointAt(event);
    if (animating) {
      setHoverBall(null);
    } else {
      const id = ballAtPoint(view.balls, point);
      if (id === null) setHoverBall(null);
      else {
        const rect = event.currentTarget.getBoundingClientRect();
        setHoverBall({
          id,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    }
    setCursor(
      poolBallCursor(
        point,
        aim.cue,
        own && view.ballInHand,
        aim.pulling || aim.placing,
      ),
    );
    if (!own) return;
    aim.move(point);
  };
  const end = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary) return;
    const input = aim.end();
    setCursor("default");
    if (!input) return;
    setStrike({ at: performance.now(), power: input.power });
    poolAudio.strike(input.power);
    act({ type: "pool-shot", ...input });
  };
  const cancel = () => {
    aim.cancel();
    setCursor("default");
    setStrike(null);
    setStrikeProgress(0);
  };
  const leave = () => {
    setHoverBall(null);
    if (!aim.pulling && !aim.placing) setCursor("default");
  };
  const hint = view.ballInHand
    ? aim.placement
      ? aim.pulling
        ? "松手击球"
        : "拖动蓄力"
      : "点击台面放置白球"
    : "拖动蓄力，松手击球";
  return (
    <PoolTableShell
      view={view}
      remaining={remaining}
      power={aim.power}
      spin={aim.spin}
      onSpin={aim.setSpin}
      elevation={aim.elevation}
      onElevation={aim.setElevation}
      predict={predict}
      onPredict={() => setPredict((value) => !value)}
      renderer="2d"
      onRendererToggle={onRendererToggle}
      hint={hint}
      disabled={!own || animating}
      replay={replay}
    >
      <div className="pool-canvas-wrap">
        <canvas
        ref={canvas}
        className="pool-canvas"
        data-cursor={cursor}
        data-guide-target="pool.table"
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={leave}
        onPointerCancel={cancel}
        aria-label="台球桌"
        />
        {hoverBall && (
          <span
            className="pool-ball-tip"
            data-ball={hoverBall.id}
            style={{ left: hoverBall.x, top: hoverBall.y }}
            aria-hidden="true"
          >
            {poolBallLabel(view, hoverBall.id)}
          </span>
        )}
      </div>
    </PoolTableShell>
  );
}
