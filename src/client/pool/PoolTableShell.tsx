import type { ReactNode } from "react";
import type { PoolView } from "../../domain/pool/types";
import { Button, Slider } from "../ui/Controls";
import { poolBallColors } from "./colors";
import { elevationDegrees } from "./cue";

const spinOptions: [string, number, number][] = [
  ["高杆", 0, 0.8],
  ["低杆", 0, -0.8],
  ["左塞", -0.8, 0],
  ["右塞", 0.8, 0],
  ["中杆", 0, 0],
];

export function PoolTableShell({
  view,
  remaining,
  power,
  spin,
  onSpin,
  elevation,
  onElevation,
  requiredElevation = 0,
  predict,
  onPredict,
  renderer,
  onRendererToggle,
  onResetCamera,
  cameraMode,
  onCameraToggle,
  hint,
  disabled,
  replay,
  children,
}: {
  view: PoolView;
  remaining: number | null;
  power: number;
  spin: { x: number; y: number };
  onSpin: (spin: { x: number; y: number }) => void;
  elevation: number;
  onElevation: (elevation: number) => void;
  requiredElevation?: number;
  predict: boolean;
  onPredict: () => void;
  renderer: "2d" | "3d";
  onRendererToggle?: () => void;
  onResetCamera?: () => void;
  cameraMode?: "aim" | "orbit";
  onCameraToggle?: () => void;
  hint: string;
  disabled: boolean;
  replay: boolean;
  children: ReactNode;
}) {
  const percent = Math.round(power * 100);
  return (
    <section className="pool-table" data-renderer={renderer}>
      <header className="pool-heading" data-guide-target="pool.status">
        <div>
          <small>
            玩家 {view.turn + 1} · 第 {view.shotNumber + 1} 杆
            {view.mode === "eight-ball" &&
              !view.openTable &&
              ` · ${view.groups[0] === 0 ? "玩家 1 全色" : "玩家 1 花色"} / ${view.groups[1] === 0 ? "玩家 2 全色" : "玩家 2 花色"}`}
          </small>
        </div>
        <span className="pool-message">
          {remaining !== null && (
            <time className="pool-clock">{remaining}s</time>
          )}
          {!/^(开球|玩家 \d+ (击球|继续击球))$/.test(view.message)
            ? view.message
            : ""}
        </span>
      </header>
      {view.mode === "party" && view.party && (
        <div
          className="pool-party-status"
          role="status"
          aria-label="派对台球进度"
        >
          {view.party.owners.map((ids, index) => {
            const left = ids.filter(
              (id) =>
                !view.balls.find((ball) => ball.id === id)?.pocketed,
            ).length;
            return (
              <span
                key={index}
                data-player={index}
                data-turn={view.turn === index}
              >
                <b
                  className="pool-party-dot"
                  style={{
                    background: poolBallColors[ids[0]] ?? "transparent",
                  }}
                  aria-hidden="true"
                />
                玩家 {index + 1} 剩 {left}
              </span>
            );
          })}
          <span>⚡ 闪电球 · ★ 金球</span>
        </div>
      )}
      {children}
      <div className="pool-hud">
        <div className="pool-pockets" data-guide-target="pool.pockets">
          {view.balls
            .filter((ball) => ball.pocketed && ball.id !== 0)
            .map((ball) => (
              <span key={ball.id} data-ball={ball.id}>
                {ball.id}
              </span>
            ))}
        </div>
        {!replay && (
          <div className="pool-controls">
            <span className="pool-power" data-guide-target="pool.power">
              <span className="pool-power-track" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </span>
              力度 {percent}%
            </span>
            <small className="pool-hint">{hint}</small>
            <Button
              data-guide-target="pool.predict"
              variant={predict ? "primary" : "secondary"}
              onClick={onPredict}
              disabled={disabled}
            >
              预计轨迹
            </Button>
            {onCameraToggle && (
              <Button
                data-guide-target="pool.camera"
                variant={cameraMode === "orbit" ? "primary" : "secondary"}
                onClick={onCameraToggle}
              >
                {cameraMode === "orbit" ? "返回击球" : "转动视角"}
              </Button>
            )}
            {onResetCamera && <Button onClick={onResetCamera}>视角复位</Button>}
            {onRendererToggle && (
              <Button
                data-guide-target="pool.render"
                onClick={onRendererToggle}
                aria-label={`切换到 ${renderer === "3d" ? "2D" : "3D"} 渲染`}
              >
                {renderer === "3d" ? "2D" : "3D"}
              </Button>
            )}
            <div className="pool-elevation" data-guide-target="pool.elevation">
              <Slider
                aria-label="杆身角度"
                min={0}
                max={1}
                step={0.02}
                value={Math.max(elevation, requiredElevation)}
                onValueChange={onElevation}
                disabled={disabled}
              />
              <span className="pool-elevation-label">
                杆身 {elevationDegrees(Math.max(elevation, requiredElevation))}°
                {requiredElevation > elevation + 0.005 ? " · 已抬高避让" : ""}
              </span>
            </div>
            <div className="pool-spin" data-guide-target="pool.spin">
              {spinOptions.map(([label, x, y]) => (
                <Button
                  key={label}
                  variant={
                    spin.x === x && spin.y === y ? "primary" : "secondary"
                  }
                  onClick={() => onSpin({ x, y })}
                  disabled={disabled}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
