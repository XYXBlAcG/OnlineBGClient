import { MovementOverlay } from "./MovementOverlay";
import { MapViewport } from "../MapViewport";
import { battlefield, guarded } from "../../domain/graphwar/types";
import { balance } from "../../domain/graphwar/balance";
import { useEffect, useRef, useState } from "react";
import type {
  GraphwarView,
  Shot,
  Circle,
  Point,
} from "../../domain/graphwar/types";
import type { GameSnapshot } from "../OriginalGame";
import { AvatarSurface, type AvatarSurfaceProps } from "../AvatarSurface";
import { usePresentation } from "../motion";
const colors = ["#3489ef", "#ee6748"];
export function GraphwarBoard({
  view,
  snapshot,
  preview,
  avatar,
  active,
  rate,
  moveMode = false,
  onMove,
  onHover,
  selected,
  onSelect,
  destination,
}: {
  view: GraphwarView;
  snapshot: GameSnapshot;
  preview?: Shot;
  avatar: Omit<AvatarSurfaceProps, "index">;
  active: boolean;
  rate: number;
  moveMode?: boolean;
  onMove?: (point: Point) => void;
  onHover?: (point: Point) => void;
  selected?: number;
  onSelect?: (id: number) => void;
  destination?: Point;
}) {
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 800, height: 480 });
  const { game } = usePresentation();
  const [theme, setTheme] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setTheme((revision) => revision + 1),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "data-color-scheme"],
    });
    return () => observer.disconnect();
  }, []);
  const playback = useRef({ key: "", elapsed: Infinity });
  const previous = useRef({ room: snapshot.room, sequence: view.sequence });
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const arena = battlefield(view);
  const scale = Math.min(size.width / arena.width, size.height / arena.height);
  const width = scale * arena.width,
    height = scale * arena.height;
  useEffect(() => {
    const element = canvas.current,
      context = element?.getContext("2d");
    if (!element || !context || !width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.ceil(width * ratio);
    element.height = Math.ceil(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const style = getComputedStyle(host.current!);
    const field = style.getPropertyValue("--gw-field").trim(),
      ink = style.getPropertyValue("--gw-ink").trim();
    const previousFrame = previous.current;
    const continuous =
      previousFrame.room === snapshot.room &&
      view.sequence === previousFrame.sequence + 1;
    previous.current = { room: snapshot.room, sequence: view.sequence };
    const key = `${snapshot.room}:${view.lastShot?.actor}:${view.lastShot?.formula}:${view.lastShot?.soldier}:${view.sequence}`;
    if (playback.current.key !== key)
      playback.current = {
        key,
        elapsed:
          continuous &&
          view.lastAction === "fire" &&
          active &&
          game !== "reduced"
            ? 0
            : Infinity,
      };
    const point = (p: Point) => ({
      x: (p.x + arena.width / 2) * scale,
      y: (arena.height / 2 - p.y) * scale,
    });
    const circle = (ctx: CanvasRenderingContext2D, c: Circle) => {
      const p = point(c);
      ctx.beginPath();
      ctx.arc(p.x, p.y, c.radius * scale, 0, Math.PI * 2);
      ctx.fill();
    };
    const background = document.createElement("canvas");
    background.width = element.width;
    background.height = element.height;
    const base = background.getContext("2d")!;
    base.setTransform(ratio, 0, 0, ratio, 0, 0);
    base.fillStyle = ink;
    for (const c of view.terrain) circle(base, c);
    base.globalCompositeOperation = "destination-out";
    for (const c of view.craters) circle(base, c);
    base.globalCompositeOperation = "source-over";
    base.fillStyle = "#596b82";
    for (const c of view.terrain) if (c.permanent) circle(base, c);
    const path = (shot: Shot, progress: number, dashed: boolean) => {
      const length = Math.max(1, Math.ceil(shot.points.length * progress));
      context.beginPath();
      shot.points.slice(0, length).forEach((p, i) => {
        const pos = point(p);
        if (i) context.lineTo(pos.x, pos.y);
        else context.moveTo(pos.x, pos.y);
      });
      context.strokeStyle = colors[view.teams[shot.actor]];
      context.lineWidth = dashed ? 1.7 : game === "enhanced" ? 3 : 2;
      context.setLineDash(dashed ? [6, 5] : []);
      context.globalAlpha = dashed ? 0.65 : 1;
      context.shadowColor = context.strokeStyle;
      context.shadowBlur = !dashed && game === "enhanced" ? 12 : 0;
      context.stroke();
      context.shadowBlur = 0;
      context.globalAlpha = 1;
      context.setLineDash([]);
    };
    let frame = 0,
      last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;
      if (active && game !== "reduced") playback.current.elapsed += dt * rate;
      const duration = game === "enhanced" ? 1100 : 400;
      const progress =
        game === "reduced"
          ? 1
          : Math.min(1, playback.current.elapsed / duration);
      context.clearRect(0, 0, width, height);
      context.fillStyle = field;
      context.fillRect(0, 0, width, height);
      context.strokeStyle = ink;
      context.globalAlpha = 0.12;
      context.lineWidth = 1;
      context.beginPath();
      for (let x = -arena.width / 2; x <= arena.width / 2; x += 5) {
        context.moveTo((x + arena.width / 2) * scale, 0);
        context.lineTo((x + arena.width / 2) * scale, height);
      }
      for (let y = -arena.height / 2; y <= arena.height / 2; y += 5) {
        context.moveTo(0, (arena.height / 2 - y) * scale);
        context.lineTo(width, (arena.height / 2 - y) * scale);
      }
      context.stroke();
      context.globalAlpha = 0.4;
      context.beginPath();
      context.moveTo(width / 2, 0);
      context.lineTo(width / 2, height);
      context.moveTo(0, height / 2);
      context.lineTo(width, height / 2);
      context.stroke();
      context.globalAlpha = 1;
      context.drawImage(background, 0, 0, width, height);
      context.fillStyle = ink;
      context.font = "10px system-ui";
      context.globalAlpha = 0.7;
      for (const x of [-arena.width / 2, -arena.width / 4, 0, arena.width / 4])
        context.fillText(
          String(x),
          (x + arena.width / 2) * scale + 3,
          height / 2 + 13,
        );
      for (const y of [-arena.height / 4, arena.height / 4])
        context.fillText(
          String(y),
          width / 2 + 4,
          (arena.height / 2 - y) * scale - 3,
        );
      context.globalAlpha = 1;
      if (view.lastShot) path(view.lastShot, progress, false);
      if (preview) path(preview, 1, true);
      const explosion = view.lastShot?.crater;
      const burst = (playback.current.elapsed - duration) / 550;
      if (explosion && burst >= 0 && burst < 1 && game === "enhanced") {
        const p = point(explosion),
          radius = explosion.radius * scale;
        context.strokeStyle = "#ff9e30";
        context.lineWidth = 4 * (1 - burst);
        context.globalAlpha = 1 - burst;
        context.beginPath();
        context.arc(p.x, p.y, radius * (0.5 + burst * 1.5), 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = "#ffd767";
        for (let n = 0; n < 12; n++) {
          const a = (n * Math.PI) / 6;
          context.fillRect(
            p.x + Math.cos(a) * radius * 2 * burst,
            p.y + Math.sin(a) * radius * 2 * burst,
            3,
            3,
          );
        }
        context.globalAlpha = 1;
      }
      if (
        active &&
        game !== "reduced" &&
        playback.current.elapsed < duration + (game === "enhanced" ? 550 : 0)
      )
        frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(frame);
  }, [
    view,
    preview,
    width,
    height,
    scale,
    snapshot.room,
    game,
    active,
    rate,
    theme,
  ]);
  return (
    <MapViewport compact focusTarget='[data-graphwar-selected="true"]'>
      <div
        ref={host}
        className={`gw-board-space ${moveMode ? "gw-moving" : ""}`}
      >
        <div
          className="gw-board"
          style={{ width, height }}
          data-guide-target="gw.axes"
          onPointerMove={(event) => {
            if (!moveMode || event.pointerType === "touch") return;
            const b = event.currentTarget.getBoundingClientRect();
            onHover?.({
              x:
                ((event.clientX - b.left) / b.width) * arena.width -
                arena.width / 2,
              y:
                arena.height / 2 -
                ((event.clientY - b.top) / b.height) * arena.height,
            });
          }}
          onClick={(event) => {
            if (!moveMode || !onMove) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            onMove({
              x:
                ((event.clientX - bounds.left) / bounds.width) * arena.width -
                arena.width / 2,
              y:
                arena.height / 2 -
                ((event.clientY - bounds.top) / bounds.height) * arena.height,
            });
          }}
        >
          <canvas
            ref={canvas}
            style={{ width, height }}
            aria-label={`函数坐标战场：${arena.width}×${arena.height}`}
          />
          {moveMode && <MovementOverlay view={view} point={destination} />}
          {view.soldiers.map((soldier) => (
            <div
              key={soldier.id}
              className={`gw-soldier ${soldier.hp > 0 ? "" : "is-out"} ${view.currentSoldier === soldier.id && !view.finished ? "is-current" : ""}`}
              style={
                {
                  left: `${((soldier.x + arena.width / 2) / arena.width) * 100}%`,
                  top: `${((arena.height / 2 - soldier.y) / arena.height) * 100}%`,
                  "--gw-team": colors[view.teams[soldier.player]],
                } as React.CSSProperties
              }
              data-graphwar-selected={
                soldier.id === selected ? "true" : undefined
              }
              data-guide-target={
                view.currentSoldier === soldier.id ? "gw.soldier" : undefined
              }
              title={`${snapshot.seats[soldier.player].name} · (${soldier.x.toFixed(1)}, ${soldier.y.toFixed(1)})${soldier.hp > 0 ? "" : " · 已出局"}`}
            >
              <AvatarSurface
                {...avatar}
                effectAnchor={false}
                unit={soldier.id}
                onChoose={
                  soldier.player === snapshot.actor &&
                  !avatar.replay &&
                  soldier.hp > 0
                    ? () => onSelect?.(soldier.id)
                    : undefined
                }
                onInteract={
                  selected === undefined
                    ? undefined
                    : (target, kind) => {
                        if (selected !== undefined)
                          avatar.onInteract?.(target, kind, {
                            game: "graphwar",
                            from: selected,
                            target: soldier.id,
                          });
                      }
                }
                index={soldier.player}
                isTurn={view.currentSoldier === soldier.id && !view.finished}
              >
                <span className="gw-unit">{soldier.hp > 0 ? "●" : "×"}</span>
              </AvatarSurface>
              <span
                className="gw-health"
                role="meter"
                aria-label={`${snapshot.seats[soldier.player].name}士兵生命值`}
                aria-valuemin={0}
                aria-valuemax={balance.hp}
                aria-valuenow={soldier.hp}
              >
                <span
                  style={{ width: `${(soldier.hp / balance.hp) * 100}%` }}
                />
              </span>
              <span className="gw-hp-label">
                {soldier.hp}
                {guarded(view, soldier) ? " 🛡" : ""}
              </span>
            </div>
          ))}
          {view.terrain.length > 0 && (
            <span
              className="gw-terrain-anchor"
              data-guide-target="gw.terrain"
              style={{
                left: `${((view.terrain[0].x + arena.width / 2) / arena.width) * 100}%`,
                top: `${((arena.height / 2 - view.terrain[0].y) / arena.height) * 100}%`,
              }}
            />
          )}
        </div>
      </div>
    </MapViewport>
  );
}
