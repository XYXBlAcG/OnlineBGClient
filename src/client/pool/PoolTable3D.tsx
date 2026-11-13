import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { PoolView } from "../../domain/pool/types";
import type { Action } from "../../domain/types";
import { Button } from "../ui/Controls";
import { POOL_PLAYBACK_RATE } from "./frames";
import { poolAudio } from "./audio";
import { poolBallCursor, type PoolCursor } from "./aim";
import { ballAtPoint } from "./hit-ball";
import {
  PoolScene3D,
  type PoolSceneInputMode,
  type PoolSceneStatus,
} from "./render3d/PoolScene3D";
import { PoolTableShell } from "./PoolTableShell";
import { poolLayout } from "../../domain/pool/table";
import { predictShot } from "./prediction";
import { usePoolAim } from "./use-pool-aim";
import { usePoolClock } from "./use-pool-clock";
import type { PoolPlayback } from "./use-pool-playback";
import { useLayoutEffectSafe } from "../use-layout-effect";
import "./pool.css";

function playbackActive(playback: PoolPlayback): boolean {
  const last = playback.shot?.frames.at(-1)?.t ?? 0;
  return (
    playback.startedAt > 0 &&
    !!playback.shot &&
    performance.now() - playback.startedAt < last / POOL_PLAYBACK_RATE
  );
}

export function PoolTable3D({
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
  onUnavailable,
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
  onRendererToggle: () => void;
  onUnavailable: () => void;
  soundEnabled?: boolean;
  soundVolume?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<PoolScene3D>();
  const pointers = useRef(new Set<number>());
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [predict, setPredict] = useState(false);
  const [cameraMode, setCameraMode] = useState<PoolSceneInputMode>("aim");
  const [cursor, setCursor] = useState<PoolCursor>("default");
  const [hoverBall, setHoverBall] = useState<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const [status, setStatus] = useState<PoolSceneStatus>({
    phase: "loading",
    message: "正在初始化 3D 桌面",
  });
  const visible =
    !replay && !playing && view.phase !== "finished" && view.turn === actor;
  const aimVisible = visible && cameraMode === "aim";
  const interactive = aimVisible && !pending;
  const cueBall =
    view.balls.find((ball) => ball.id === 0 && !ball.pocketed) ?? null;
  const aim = usePoolAim({
    balls: view.balls,
    cue: cueBall,
    own: interactive,
    ballInHand: view.ballInHand,
    resetKey: `${view.shotNumber}:${view.turn}`,
  });
  const remaining = usePoolClock(turnDeadline, serverTime, paused);
  useEffect(() => {
    poolAudio.configure(soundEnabled, soundVolume);
  }, [soundEnabled, soundVolume]);
  useEffect(() => {
    const unlock = () => void poolAudio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  const prediction =
    predict && interactive && aim.cue
      ? predictShot(
          view.balls,
          aim.cue,
          aim.aim,
          aim.power,
          poolLayout(view.mode),
        )
      : null;
  useLayoutEffectSafe(() => {
    if (!host.current) return;
    setStatus({ phase: "loading", message: "正在初始化 3D 桌面" });
    const current = new PoolScene3D(host.current, view, {
      mode: "play",
      onStatus: setStatus,
      onShotEnd: () => setPlaying(false),
      onPocket: () => poolAudio.pocket(),
      onImpact: (kind, intensity) => poolAudio.impact(kind, intensity),
      onCueStrike: (power) => poolAudio.strike(power),
    });
    scene.current = current;
    if (playback.startedAt > 0 && playback.shot) {
      current.playShot(
        playback.shot,
        playback.shotNumber,
        playback.startedAt,
        playback.leadIn,
      );
      setPlaying(playbackActive(playback));
    } else setPlaying(false);
    return () => {
      current.destroy();
      scene.current = undefined;
    };
  }, [attempt]);
  useLayoutEffectSafe(() => {
    scene.current?.setInputMode(cameraMode);
  }, [cameraMode, attempt]);
  useLayoutEffectSafe(() => {
    scene.current?.setCursor(cursor);
  }, [cursor, attempt]);
  useEffect(() => {
    if (status.phase !== "error") return;
    const timer = window.setTimeout(onUnavailable, 800);
    return () => window.clearTimeout(timer);
  }, [status.phase, onUnavailable]);
  useEffect(() => {
    const release = (event: globalThis.PointerEvent) =>
      pointers.current.delete(event.pointerId);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);
  useLayoutEffectSafe(() => {
    const current = scene.current;
    if (!current) return;
    current.update(view);
    if (playback.startedAt > 0 && playback.shot) {
      current.playShot(
        playback.shot,
        playback.shotNumber,
        playback.startedAt,
        playback.leadIn,
      );
      setPlaying(playbackActive(playback));
    } else setPlaying(false);
  }, [
    view,
    attempt,
    playback.shot,
    playback.shotNumber,
    playback.startedAt,
    playback.leadIn,
  ]);
  useLayoutEffectSafe(() => {
    scene.current?.updateAim({
      cue: aim.cue,
      aim: aim.aim,
      power: aim.power,
      elevation: aim.elevation,
      prediction,
      visible: aimVisible,
    });
  }, [
    aim.cue,
    aim.aim,
    aim.power,
    aim.elevation,
    prediction,
    aimVisible,
    attempt,
  ]);
  const tablePoint = (event: ReactPointerEvent<HTMLDivElement>) =>
    scene.current?.pointAt(event.clientX, event.clientY) ?? null;
  const begin = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (cameraMode !== "aim") return;
    pointers.current.add(event.pointerId);
    if (!event.isPrimary) {
      aim.cancel();
      return;
    }
    if (!interactive || status.phase !== "ready" || event.button !== 0) return;
    void poolAudio.unlock();
    const point = tablePoint(event);
    if (!point) return;
    const gesture = aim.begin(point);
    if (!gesture) return;
    setCursor(gesture === "place" ? "grabbing" : "default");
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const hostRect = host.current?.getBoundingClientRect();
    if (
      hostRect &&
      status.phase === "ready" &&
      !playbackActive(playback)
    ) {
      const point = scene.current?.pointAt(event.clientX, event.clientY);
      const id = point ? ballAtPoint(view.balls, point) : null;
      setHoverBall(
        id === null
          ? null
          : {
              id,
              x: event.clientX - hostRect.left,
              y: event.clientY - hostRect.top,
            },
      );
    } else {
      setHoverBall(null);
    }
    if (cameraMode !== "aim") return;
    if (
      !event.isPrimary ||
      pointers.current.size > 1 ||
      status.phase !== "ready" ||
      (event.buttons & 2) === 2
    )
      return;
    const point = tablePoint(event);
    if (!point) return;
    setCursor(
      poolBallCursor(
        point,
        aim.cue,
        interactive && view.ballInHand,
        aim.pulling || aim.placing,
      ),
    );
    if (!interactive) return;
    aim.move(point);
  };
  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (cameraMode !== "aim") return;
    pointers.current.delete(event.pointerId);
    if (!event.isPrimary) return;
    if (status.phase !== "ready") {
      aim.cancel();
      setCursor("default");
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    const input = aim.end();
    setCursor("default");
    if (!input) return;
    scene.current?.strike(input.power);
    poolAudio.strike(input.power);
    act({ type: "pool-shot", ...input });
  };
  const cancel = () => {
    if (cameraMode !== "aim") return;
    pointers.current.clear();
    aim.cancel();
    setCursor("default");
  };
  const leave = () => {
    setHoverBall(null);
    if (!aim.pulling && !aim.placing) setCursor("default");
  };
  const hint =
    cameraMode === "orbit"
      ? "拖动旋转视角，滚轮缩放，点“返回击球”继续"
      : view.ballInHand
        ? aim.placement
          ? aim.pulling
            ? "松手击球"
            : "白球已放置，按住拖动蓄力"
          : "自由球：点击台面放置白球"
        : "移动瞄准，按住拖动蓄力，右键/中键旋转，滚轮缩放";
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
      renderer="3d"
      onRendererToggle={onRendererToggle}
      onResetCamera={() => scene.current?.resetCamera()}
      cameraMode={cameraMode}
      onCameraToggle={() =>
        setCameraMode((value) => (value === "aim" ? "orbit" : "aim"))
      }
      hint={hint}
      disabled={!interactive || status.phase !== "ready"}
      replay={replay}
    >
      <div
        ref={host}
        className="pool-canvas pool-canvas-3d"
        data-cursor={cursor}
        data-guide-target="pool.table"
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={leave}
        onPointerCancel={cancel}
        onContextMenu={(event) => event.preventDefault()}
      >
        {hoverBall ? (
          <span
            className="pool-ball-tip"
            data-ball={hoverBall.id}
            style={{ left: hoverBall.x, top: hoverBall.y }}
            aria-hidden="true"
          >
            {hoverBall.id === 0 ? "白球" : `${hoverBall.id} 号球`}
          </span>
        ) : null}
        {status.phase !== "ready" ? (
          <div className="pool-3d-status" role="status" aria-live="polite">
            <strong>
              {status.phase === "error"
                ? "3D 桌面无法显示"
                : "正在准备 3D 桌面"}
            </strong>
            {status.message ? <span>{status.message}</span> : null}
            {status.phase === "error" ? (
              <div className="pool-3d-status-actions">
                <Button
                  variant="primary"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  重试 3D
                </Button>
                <Button onClick={onRendererToggle}>切换到 2D</Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </PoolTableShell>
  );
}
