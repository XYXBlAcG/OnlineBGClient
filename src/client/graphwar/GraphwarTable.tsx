import { balance } from "../../domain/graphwar/balance";
import { Movement } from "../../domain/graphwar/movement";
import { seatAvatar } from "../../domain/avatar";
import { firingView, openingProtected } from "../../domain/graphwar/types";
import { actionLimit, type Point } from "../../domain/graphwar/types";
import { useEffect, useMemo, useState } from "react";
import type { GameSnapshot } from "../OriginalGame";
import { AvatarSurface, type AvatarSurfaceProps } from "../AvatarSurface";
import type { Action } from "../../domain/types";
import {
  compileFormula,
  formulaFamily,
} from "../../domain/graphwar/expression";
import {
  graphwarModes,
  graphwarMaps,
  type GraphwarLogAction,
} from "../../domain/graphwar/types";
import { GraphwarBoard } from "./GraphwarBoard";
import { usePreview } from "./use-preview";
import { MathFormulaField } from "./MathFormulaField";
import { Switch } from "../ui/Controls";
import "./graphwar.css";
const logActions: Record<GraphwarLogAction, string> = {
  fire: "射击",
  move: "移动",
  guard: "防御",
  pass: "跳过",
};
function TurnClock({ snapshot }: { snapshot: GameSnapshot }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!snapshot.turnDeadline || snapshot.paused) return;
    const start = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - start), 250);
    return () => clearInterval(timer);
  }, [snapshot.turnDeadline, snapshot.serverTime, snapshot.paused]);
  if (snapshot.paused) return <span>已暂停</span>;
  if (!snapshot.turnDeadline || !snapshot.serverTime) return null;
  const seconds = Math.max(
    0,
    Math.ceil((snapshot.turnDeadline - snapshot.serverTime - elapsed) / 1000),
  );
  return (
    <time
      className={seconds <= 10 ? "gw-clock is-urgent" : "gw-clock"}
      aria-label={`本回合剩余 ${seconds} 秒`}
    >
      {seconds}s
    </time>
  );
}
export function GraphwarTable({
  snapshot,
  view,
  act,
  replay,
  avatar,
  pending,
  animationActive,
  animationRate,
}: {
  snapshot: GameSnapshot;
  view: import("../../domain/graphwar/types").GraphwarView;
  act: (action: Action) => void;
  replay: boolean;
  avatar: Omit<AvatarSurfaceProps, "index">;
  pending: boolean;
  animationActive: boolean;
  animationRate: number;
}) {
  const [formula, setFormula] = useState("0.2*x"),
    [showPreview, setShowPreview] = useState(true);
  const [moveSequence, setMoveSequence] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number>();
  const selected =
    view.soldiers.find(
      (s) => s.id === selectedId && s.player === snapshot.actor && s.hp > 0,
    ) ??
    view.soldiers.find(
      (s) =>
        s.id === view.currentSoldier && s.player === snapshot.actor && s.hp > 0,
    ) ??
    view.soldiers.find((s) => s.player === snapshot.actor && s.hp > 0);
  const source = useMemo(
    () => (selected ? firingView(view, snapshot.actor, selected.id) : view),
    [view, snapshot.actor, selected?.id],
  );
  const movement = useMemo(
    () => (selected ? new Movement(source, selected.id) : null),
    [source, selected?.id],
  );
  const [destination, setDestination] = useState<Point>();
  const [hover, setHover] = useState<Point>();
  const choose = (id: number) => {
    setSelectedId(id);
    setMoveSequence(null);
    setDestination(undefined);
    setHover(undefined);
  };
  const draft = destination ?? hover,
    verdict = draft && movement ? movement.check(draft) : null;
  const turn =
    !replay &&
    !snapshot.finished &&
    !snapshot.paused &&
    view.turn === snapshot.actor &&
    !pending;
  const validation = useMemo(() => {
    try {
      compileFormula(formula);
      if (
        view.options.scenario === "storm" &&
        view.allowedFamily &&
        view.allowedFamily !== "any" &&
        formulaFamily(formula) !== view.allowedFamily
      )
        throw new Error(`本轮只允许 ${view.allowedFamily} 类函数`);
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }, [formula, view.allowedFamily, view.options.scenario]);
  const preview = usePreview(
    source,
    snapshot.actor,
    formula,
    turn &&
      moveSequence !== view.sequence &&
      view.options.preview &&
      showPreview &&
      !validation,
  );
  const alive = [0, 1].map(
    (team) =>
      view.soldiers.filter((s) => s.hp > 0 && view.teams[s.player] === team)
        .length,
  );
  const roundTitle = snapshot.finished
    ? view.finished
      ? view.winner === null
        ? "双方平局"
        : `${view.winner === 0 ? "蓝" : "橙"}队获胜`
      : "对局已结束"
    : `${snapshot.seats[view.turn].name}的回合`;
  const send = () => {
    if (!turn || validation) return;
    act({
      type: "graphwar-fire",
      soldier: selected?.id,
      formula: formula.trim(),
    });
  };
  return (
    <section
      className="gw-table"
      onKeyDown={(event) => {
        if (
          (event.target as HTMLElement).closest(
            "input,textarea,select,[contenteditable=true]",
          )
        )
          return;
        if (event.key === "Escape") {
          setMoveSequence(null);
          setDestination(undefined);
          setHover(undefined);
          event.stopPropagation();
        }
        const number = Number(event.key);
        if (number >= 1 && number <= 6) {
          const unit = view.soldiers.filter(
            (s) => s.player === snapshot.actor && s.hp > 0,
          )[number - 1];
          if (unit) choose(unit.id);
        }
        if (
          moveSequence === view.sequence &&
          turn &&
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          const at = destination ?? selected!;
          setDestination({
            x:
              at.x +
              (event.key === "ArrowRight"
                ? 0.25
                : event.key === "ArrowLeft"
                  ? -0.25
                  : 0),
            y:
              at.y +
              (event.key === "ArrowUp"
                ? 0.25
                : event.key === "ArrowDown"
                  ? -0.25
                  : 0),
          });
        }
      }}
    >
      <header className="gw-heading">
        <strong role="status">{roundTitle}</strong>
        <span className="gw-team-blue">蓝队 {alive[0]}</span>
        <span className="gw-team-orange">橙队 {alive[1]}</span>
        <span className="gw-relation-legend" aria-label="友军与敌军标记">
          <i data-relation="ally" />
          友军
          <i data-relation="enemy" />
          敌军
        </span>
        {!replay && !snapshot.finished && <TurnClock snapshot={snapshot} />}
        <small
          data-guide-target={
            view.options.scenario === "storm" ? "gw.storm" : undefined
          }
        >
          {graphwarModes[view.options.mode].name} ·{" "}
          {graphwarMaps[view.options.map]} · {view.sequence}/{actionLimit(view)}
          {view.options.scenario === "storm"
            ? ` · 风场 ${(view.wind ?? 0).toFixed(2)} · 函数限制 ${view.allowedFamily ?? "any"}`
            : ""}
        </small>
      </header>
      <div className="gw-battlefield">
        <GraphwarBoard
          view={turn ? source : view}
          snapshot={snapshot}
          preview={preview.shot}
          avatar={avatar}
          active={animationActive}
          rate={animationRate}
          moveMode={turn && moveSequence === view.sequence}
          selected={selected?.id}
          onSelect={choose}
          destination={draft}
          onHover={(point) => {
            if (!destination) setHover(point);
          }}
          onMove={(point) => {
            if (turn && moveSequence === view.sequence) setDestination(point);
          }}
        />
        <aside className="gw-shot-panel" aria-label="射击日志">
          <strong>射击日志</strong>
          {view.log?.length ? (
            <ol className="gw-shot-log">
              {[...view.log].reverse().map((entry) => (
                <li
                  className="gw-shot-log-entry"
                  data-action={entry.action}
                  key={entry.sequence}
                >
                  <div className="gw-shot-log-heading">
                    <span>#{entry.sequence}</span>
                    <strong>{snapshot.seats[entry.actor]?.name}</strong>
                    <small>{logActions[entry.action]}</small>
                  </div>
                  {entry.formula && <code>y = {entry.formula}</code>}
                  {entry.action === "fire" && (
                    <span className="gw-shot-summary">
                      命中 {entry.hits} 名 · 合计 {entry.damage} 伤害
                    </span>
                  )}
                  {entry.point && (
                    <span className="gw-shot-summary">
                      移动至 ({entry.point.x.toFixed(1)},{" "}
                      {entry.point.y.toFixed(1)})
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <span className="gw-shot-empty">还没有操作记录</span>
          )}
        </aside>
      </div>
      <div className="gw-tactical-status" aria-live="polite">
        {moveSequence === view.sequence && turn
          ? verdict
            ? `${verdict.allowed ? "可移动" : verdict.reason} · ${verdict.distance.toFixed(1)} / ${balance.moveDistance} · ${destination ? "请确认目的地" : "点击选择目的地"}`
            : "绿色区域可移动：点击空地，再确认；方向键微调，Escape 取消"
          : `${selected ? `已选自己的第 ${view.soldiers.filter((s) => s.player === snapshot.actor).findIndex((s) => s.id === selected.id) + 1} 名士兵 · 点击自己的地图头像切换` : "点击地图头像互动"}${openingProtected(view) ? " · 首轮护阵生效" : ""}`}
      </div>
      <div className="gw-player-status" aria-label="两队玩家状态">
        {snapshot.seats.map((seat, player) => (
          <div
            key={player}
            className={`gw-player-item ${view.teams[player] === 0 ? "gw-team-blue" : "gw-team-orange"} ${view.turn === player ? "is-turn" : ""}`}
            data-relation={
              snapshot.actor < 0
                ? undefined
                : view.teams[player] === view.teams[snapshot.actor]
                  ? "ally"
                  : "enemy"
            }
          >
            <span>{seatAvatar(seat)}</span>
            <span className="gw-player-name">{seat.name}</span>
            <small>
              {
                view.soldiers.filter((s) => s.player === player && s.hp > 0)
                  .length
              }
              /{view.options.soldiers}
            </small>
            {player === snapshot.actor && (
              <AvatarSurface
                {...avatar}
                effectAnchor={false}
                index={player}
                className="gw-own-menu"
              >
                <span>⋯</span>
              </AvatarSurface>
            )}
          </div>
        ))}
      </div>
      {!replay && !snapshot.finished && (
        <div className="gw-controls" data-guide-target="gw.controls">
          <form
            className="gw-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <span className="gw-formula-label">y =</span>
            <MathFormulaField
              value={formula}
              onChange={setFormula}
              onSubmit={send}
            />
            <button
              className="primary-button"
              type="submit"
              data-guide-target="gw.fire"
              disabled={!turn || !!validation}
            >
              {pending ? "确认中…" : "发射"}
            </button>
            <button
              type="button"
              disabled={!turn}
              aria-pressed={moveSequence === view.sequence}
              onClick={() => {
                setDestination(undefined);
                setHover(undefined);
                setMoveSequence(
                  moveSequence === view.sequence ? null : view.sequence,
                );
              }}
            >
              {moveSequence === view.sequence ? "取消移动" : "移动"}
            </button>
            <button
              type="button"
              disabled={!turn}
              onClick={() =>
                act({ type: "graphwar-guard", soldier: selected?.id })
              }
            >
              防御
            </button>
            <button
              type="button"
              disabled={!turn}
              onClick={() => act({ type: "graphwar-pass" })}
            >
              跳过
            </button>
          </form>
          {turn && moveSequence === view.sequence && (
            <div className="gw-move-confirm">
              <button
                className="primary-button"
                disabled={!destination || !verdict?.allowed}
                onClick={() => {
                  if (destination && movement?.check(destination).allowed) {
                    act({
                      type: "graphwar-move",
                      soldier: selected?.id,
                      ...destination,
                    });
                    setMoveSequence(null);
                    setDestination(undefined);
                  }
                }}
              >
                确认移动
              </button>
              <button
                onClick={() => {
                  setMoveSequence(null);
                  setDestination(undefined);
                }}
              >
                取消
              </button>
            </div>
          )}
          <p
            className={
              validation || preview.error
                ? "gw-validation is-invalid"
                : "gw-validation"
            }
            aria-live="polite"
          >
            {validation ||
              preview.error ||
              (preview.shot
                ? `预计命中 ${preview.shot.impacts.length} 名士兵（含队友） · ${preview.shot.reason === "terrain" ? "将撞上障碍" : preview.shot.reason === "undefined" ? "途中存在无定义值" : preview.shot.reason === "limit" ? "达到轨迹上限" : preview.shot.reason === "penetration" ? "穿透次数耗尽" : "飞出战场"}`
                : turn
                  ? "函数会平移到当前士兵；常数项不会改变射击曲线"
                  : "可提前编辑函数，等待轮到自己")}
          </p>
          <div className="gw-control-row">
            {view.options.preview && (
              <Switch
                className="gw-preview-switch"
                label="预览弹道"
                checked={showPreview}
                onCheckedChange={setShowPreview}
              />
            )}
            <span className="gw-help">
              {view.options.preview
                ? "虚线是预览；实线是实际射击"
                : "本房关闭弹道预览"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
