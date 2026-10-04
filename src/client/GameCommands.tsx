import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "../domain/protocol";
import type { Action } from "../domain/types";
import { Panel } from "./ui/Controls";
import { CommandRegistry } from "./commands";

export function GameCommands({
  snapshot,
  act,
  registry,
  bindings,
}: {
  snapshot: Snapshot;
  act: (action: Action) => void;
  registry: CommandRegistry;
  bindings: Record<string, string>;
}) {
  const choices = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const latest = useRef({ snapshot, act, selected, open });
  latest.current = { snapshot, act, selected, open };
  useEffect(() => {
    setSelected(0);
  }, [snapshot.version]);
  useEffect(() => {
    const kind = snapshot.kind;
    const entries = [
      {
        id: `${kind}.actions`,
        title: "显示游戏操作",
        binding: "F2",
        enabled: () =>
          !!latest.current.snapshot.state && !latest.current.snapshot.finished,
        run: () => setOpen((value) => !value),
      },
      {
        id: `${kind}.previous`,
        title: "上一动作",
        binding: "ArrowUp",
        enabled: () => latest.current.open,
        run: () => setSelected((value) => Math.max(0, value - 1)),
      },
      {
        id: `${kind}.next`,
        title: "下一动作",
        binding: "ArrowDown",
        enabled: () => latest.current.open,
        run: () =>
          setSelected((value) =>
            Math.min(latest.current.snapshot.candidates.length - 1, value + 1),
          ),
      },
      {
        id: `${kind}.submit`,
        title: "确认动作",
        binding: "Enter",
        enabled: () =>
          latest.current.open &&
          !!latest.current.snapshot.candidates[latest.current.selected],
        run: () => {
          const { snapshot, selected, act } = latest.current;
          act(snapshot.candidates[selected].action);
          setOpen(false);
        },
      },
    ];
    const quick =
      kind === "uno"
        ? { type: "uno-draw", title: "摸牌 / 不出", binding: "D" }
        : kind === "fxq"
          ? { type: "fxq-roll", title: "掷骰", binding: "D" }
          : null;
    if (quick)
      entries.push({
        id: `${kind}.${quick.type}`,
        title: quick.title,
        binding: quick.binding,
        enabled: () =>
          !latest.current.open &&
          latest.current.snapshot.candidates.some(
            (candidate) => candidate.action.type === quick.type,
          ),
        run: () => {
          const candidate = latest.current.snapshot.candidates.find(
            (candidate) => candidate.action.type === quick.type,
          );
          if (candidate) latest.current.act(candidate.action);
        },
      });
    const stop = entries.map((entry) =>
      registry.register({
        ...entry,
        scope: kind,
        binding: bindings[entry.id] ?? entry.binding,
      }),
    );
    return () => stop.forEach((dispose) => dispose());
  }, [snapshot.kind, registry, bindings]);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!snapshot.state || snapshot.finished}
      >
        游戏操作 <kbd>{bindings[`${snapshot.kind}.actions`] || "F2"}</kbd>
      </button>
      <Panel
        initialFocus={choices}
        scope={snapshot.kind}
        open={open}
        onOpenChange={setOpen}
        title="游戏操作"
      >
        <div className="command-picker">
          <p className="muted">↑ ↓ 选择 · Enter 确认 · Esc 关闭</p>
          {snapshot.candidates.length ? (
            <>
              <div
                ref={choices}
                role="listbox"
                tabIndex={0}
                aria-label="合法游戏动作"
                aria-activedescendant={`game-action-${selected}`}
                className="game-action-list"
              >
                {snapshot.candidates.map((candidate, index) => (
                  <button
                    role="option"
                    aria-selected={index === selected}
                    id={`game-action-${index}`}
                    tabIndex={-1}
                    className={index === selected ? "selected-action" : ""}
                    key={index}
                    onClick={() => setSelected(index)}
                  >
                    {candidate.label}
                  </button>
                ))}
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  const candidate = snapshot.candidates[selected];
                  if (candidate) {
                    act(candidate.action);
                    setOpen(false);
                  }
                }}
              >
                确认动作
              </button>
            </>
          ) : (
            <p>等待其他玩家操作</p>
          )}
        </div>
      </Panel>
    </>
  );
}
