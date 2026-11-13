import { useEffect, useMemo, useRef, useState } from "react";
import { PoolRules } from "../../domain/pool/rules";
import type { PoolMode, PoolState } from "../../domain/pool/types";
import {
  PoolScene3D,
  type PoolSceneMetrics,
  type PoolSceneStatus,
} from "../pool/render3d/PoolScene3D";
import { Button } from "../ui/Controls";
import "../pool/pool.css";

const create = (rules: PoolRules, mode: PoolMode): PoolState =>
  rules.create(2, false, {
    pool: { mode, shotSeconds: 60, assist: true },
  });

export interface Pool3DPreviewProps {
  debug?: boolean;
}

export function Pool3DPreview({ debug = false }: Pool3DPreviewProps) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<PoolScene3D>();
  const shotNumber = useRef(0);
  const rules = useMemo(() => new PoolRules(() => 0.42), []);
  const [mode, setMode] = useState<PoolMode>("eight-ball");
  const [state, setState] = useState<PoolState>(() => create(rules, mode));
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<PoolSceneStatus>({
    phase: "loading",
    message: "正在初始化 3D 桌面",
  });
  const [metrics, setMetrics] = useState<PoolSceneMetrics | null>(null);
  const latestView = useRef(state.view);
  latestView.current = state.view;

  useEffect(() => {
    if (!host.current) return;
    setStatus({ phase: "loading", message: "正在初始化 3D 桌面" });
    shotNumber.current = latestView.current.shotNumber;
    const current = new PoolScene3D(host.current, latestView.current, {
      onStatus: setStatus,
    });
    scene.current = current;
    return () => {
      current.destroy();
      scene.current = undefined;
    };
  }, [attempt, mode]);

  useEffect(() => {
    const current = scene.current;
    if (!current) return;
    current.update(state.view);
    const shot = state.view.lastShot;
    if (shot && shotNumber.current !== state.view.shotNumber) {
      shotNumber.current = state.view.shotNumber;
      current.playShot(shot, state.view.shotNumber);
    }
  }, [state.view]);

  useEffect(() => {
    if (!debug) {
      setMetrics(null);
      return;
    }
    const update = () => setMetrics(scene.current?.metrics() ?? null);
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [debug, attempt, mode]);

  const reset = (next: PoolMode) => {
    setMode(next);
    setState(create(rules, next));
    setAttempt((value) => value + 1);
  };
  const demo = () =>
    setState((value) =>
      rules.apply(value, value.view.turn, {
        type: "pool-shot",
        aim: 0,
        power: 0.72,
        spin: { x: 0, y: 0 },
      }),
    );
  const open2D = () => {
    location.href = "?dev=pool";
  };
  const debugRows = [
    ["状态", `${status.phase}${status.message ? ` · ${status.message}` : ""}`],
    [
      "渲染",
      metrics
        ? `${metrics.webgl} · DPR ${metrics.devicePixelRatio} · ×${metrics.rendererPixelRatio}`
        : "等待",
    ],
    [
      "尺寸",
      metrics
        ? `渲染 ${metrics.width}×${metrics.height} · CSS ${metrics.canvas.width}×${metrics.canvas.height}`
        : "等待",
    ],
    [
      "相机",
      metrics
        ? `(${metrics.camera.x.toFixed(2)}, ${metrics.camera.y.toFixed(2)}, ${metrics.camera.z.toFixed(2)}) · fov ${metrics.camera.fov} · aspect ${metrics.camera.aspect.toFixed(2)}`
        : "等待",
    ],
    [
      "场景",
      metrics ? `${metrics.objects} 个对象 · ${metrics.balls} 个球` : "等待",
    ],
    [
      "绘制",
      metrics
        ? `${metrics.calls} calls · ${metrics.triangles} 三角形 · ${metrics.fps.toFixed(0)} FPS`
        : "等待",
    ],
    [
      "最近 resize",
      metrics?.lastResize
        ? `${metrics.lastResize.width}×${metrics.lastResize.height} · ${metrics.lastResize.at.toFixed(0)}ms`
        : "无",
    ],
  ];
  return (
    <main className="app-shell pool-preview">
      <header>
        <div>
          <h1>台球 3D 原型</h1>
          <p>三维桌面、球体、灯光与击球录像播放。</p>
        </div>
        <div className="pool-preview-actions">
          <Button
            variant={mode === "eight-ball" ? "primary" : "secondary"}
            onClick={() => reset("eight-ball")}
          >
            8-Ball
          </Button>
          <Button
            variant={mode === "nine-ball" ? "primary" : "secondary"}
            onClick={() => reset("nine-ball")}
          >
            9-Ball
          </Button>
          <Button variant="primary" onClick={demo}>
            演示开球
          </Button>
          <Button onClick={() => scene.current?.resetCamera()}>相机复位</Button>
          <Button onClick={open2D}>2D 版本</Button>
        </div>
      </header>
      <div ref={host} className="pool-preview-3d" data-phase={status.phase}>
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
                <Button onClick={open2D}>回退 2D</Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {debug ? (
          <aside className="pool-3d-debug" aria-label="3D 调试信息">
            <dl>
              {debugRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
