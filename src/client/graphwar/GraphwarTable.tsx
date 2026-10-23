import { balance } from "../../domain/graphwar/balance";
import { Movement } from "../../domain/graphwar/movement";
import { seatAvatar } from "../../domain/avatar";
import { firingView, openingProtected } from "../../domain/graphwar/types";
import { actionLimit, type Point } from "../../domain/graphwar/types";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GameSnapshot } from "../OriginalGame";
import { AvatarSurface, type AvatarSurfaceProps } from "../AvatarSurface";
import type { Action } from "../../domain/types";
import { compileFormula } from "../../domain/graphwar/expression";
import { graphwarModes, graphwarMaps } from "../../domain/graphwar/types";
import { GraphwarBoard } from "./GraphwarBoard";
import { usePreview } from "./use-preview";
import { readFormulaHistory, saveFormulaHistory } from "./formula-history";
import { Select } from "../ui/Controls";
import { confirmation } from "../confirmation-controller";
import "./graphwar.css";
const keys = [
  "x",
  "+",
  "−",
  "*",
  "/",
  "^",
  "(",
  ")",
  "sin(",
  "cos(",
  "sqrt(",
  "abs(",
  "ln(",
  "log(",
];
const templates = {
  line: "0.2*x",
  parabola: "x^2/60",
  wave: "3*sin(x/4)",
  arch: "sqrt(abs(x))",
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
  end,
  replay,
  avatar,
  pending,
  animationActive,
  animationRate,
}: {
  snapshot: GameSnapshot;
  view: import("../../domain/graphwar/types").GraphwarView;
  act: (action: Action) => void;
  end: () => void;
  replay: boolean;
  avatar: Omit<AvatarSurfaceProps, "index">;
  pending: boolean;
  animationActive: boolean;
  animationRate: number;
}) {
  const [formula, setFormula] = useState("0.2*x"),
    [showPreview, setShowPreview] = useState(true),
    [showKeys, setShowKeys] = useState(false);
  const [history, setHistory] = useState<string[]>(() =>
    typeof localStorage === "undefined" ? [] : readFormulaHistory(localStorage),
  );
  const input = useRef<HTMLInputElement>(null);
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
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }, [formula]);
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
  const insert = (key: string) => {
    const text = key === "−" ? "-" : key;
    const start = input.current?.selectionStart ?? formula.length,
      end = input.current?.selectionEnd ?? start;
    const next = formula.slice(0, start) + text + formula.slice(end);
    if (next.length > 256) return;
    setFormula(next);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(
        start + text.length,
        start + text.length,
      );
    });
  };
  const send = () => {
    if (!turn || validation) return;
    act({
      type: "graphwar-fire",
      soldier: selected?.id,
      formula: formula.trim(),
    });
    const next = [
      formula.trim(),
      ...history.filter((item) => item !== formula.trim()),
    ].slice(0, 12);
    setHistory(next);
    try {
      saveFormulaHistory(localStorage, next);
    } catch {
      return;
    }
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
        {!replay && !snapshot.finished && <TurnClock snapshot={snapshot} />}
        {!replay && snapshot.canManage && !snapshot.finished && (
          <details className="gw-room-menu">
            <summary>房间 ⋯</summary>
            <button
              className="gw-end"
              onClick={() => {
                void confirmation
                  .request("结束当前对局并保存回放？", "结束游戏")
                  .then((ok) => {
                    if (ok) end();
                  });
              }}
            >
              结束游戏
            </button>
          </details>
        )}
        <small>
          {graphwarModes[view.options.mode].name} ·{" "}
          {graphwarMaps[view.options.map]} · {view.sequence}/{actionLimit(view)}
        </small>
      </header>
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
            <label htmlFor={`gw-formula-${snapshot.room}`}>y =</label>
            <input
              id={`gw-formula-${snapshot.room}`}
              ref={input}
              aria-label="发射函数"
              data-guide-target="gw.formula"
              value={formula}
              maxLength={256}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(event) => setFormula(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.nativeEvent.isComposing)
                  event.preventDefault();
                if (event.key === "Escape") {
                  setShowKeys(false);
                  input.current?.blur();
                }
              }}
            />
            <button
              className="primary-button"
              type="submit"
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
          <details className="gw-tools">
            <summary>数学键盘 · 模板 · 伤害明细</summary>
            <div className="gw-toolbar">
              <button
                type="button"
                aria-expanded={showKeys}
                onClick={() => setShowKeys(!showKeys)}
              >
                ƒ 数学键盘
              </button>
              <Select
                aria-label="函数模板与历史"
                value="choose"
                onValueChange={(value) => {
                  if (value.startsWith("history:"))
                    setFormula(history[Number(value.slice(8))]);
                  else if (Object.hasOwn(templates, value))
                    setFormula(templates[value as keyof typeof templates]);
                }}
              >
                <option value="choose">模板与历史</option>
                <option value="line">直线 · 0.2x</option>
                <option value="parabola">抛物线 · x²/60</option>
                <option value="wave">波形 · 3sin(x/4)</option>
                <option value="arch">根式 · √|x|</option>
                {history.map((f, i) => (
                  <option key={f} value={`history:${i}`}>
                    {f}
                  </option>
                ))}
              </Select>
              {view.options.preview && (
                <label>
                  <input
                    type="checkbox"
                    checked={showPreview}
                    onChange={(event) => setShowPreview(event.target.checked)}
                  />
                  预览弹道
                </label>
              )}
              <span className="gw-help">
                {view.options.preview
                  ? "虚线是预览；实线是实际射击"
                  : "本房关闭弹道预览"}
              </span>
            </div>
            {showKeys && (
              <div className="gw-keyboard" aria-label="数学键盘">
                {keys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => insert(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            )}
            {preview.shot && (
              <details className="gw-impact-details">
                <summary>
                  预计伤害 · 弧长 {preview.shot.length.toFixed(1)} ·
                  每次穿透保留
                  {Math.round(balance.penetration * 100)}% 能量
                </summary>
                {preview.shot.impacts.map((hit) => {
                  const s = view.soldiers.find((s) => s.id === hit.soldier)!;
                  return (
                    <p key={hit.soldier}>
                      {snapshot.seats[s.player].name} · -{hit.damage} HP →{" "}
                      {hit.hpAfter} HP · 弧长 {hit.length.toFixed(1)} ·{" "}
                      {hit.guarded ? "防御减伤 · " : ""}
                      {hit.openingProtected ? "首轮护阵 · " : ""}第{" "}
                      {hit.penetration + 1} 次命中
                    </p>
                  );
                })}
              </details>
            )}
          </details>
        </div>
      )}
      {view.lastShot && (
        <details className="gw-last-shot">
          <summary>上一发射击</summary>
          <span>
            {snapshot.seats[view.lastShot.actor].name}：y ={" "}
            <code>{view.lastShot.formula}</code>
          </span>
          <span>
            {view.lastPass !== null
              ? `${snapshot.seats[view.lastPass].name}跳过回合`
              : view.lastAction === "move"
                ? "本回合移动"
                : view.lastAction === "guard"
                  ? "本回合防御"
                  : `命中 ${view.lastShot.impacts.length} 名 · 合计 ${view.lastShot.impacts.reduce((n, h) => n + h.damage, 0)} 伤害`}
          </span>
        </details>
      )}
    </section>
  );
}
