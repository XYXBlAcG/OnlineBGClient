import { gameQuickActions } from "./game-quick-actions";
import { useNativeWindow } from "./native/windows";
import { auxiliaryView } from "./native/contract";
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
  pending = false,
  onError,
  showTrigger = true,
}: {
  pending?: boolean;
  showTrigger?: boolean;
  onError?: (message: string) => void;
  snapshot: Snapshot;
  act: (action: Action) => void;
  registry: CommandRegistry;
  bindings: Record<string, string>;
}) {
  const choices = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(auxiliaryView === "actions");
  const detached = useNativeWindow(
    "actions",
    open,
    { view: "actions", snapshot, bindings, pending },
    (intent) => {
      if (intent.type === "error") onError?.(intent.message);
      if (intent.type === "close") setOpen(false);
      if (intent.type === "action" && !pending) {
        act(intent.action);
        setOpen(false);
      }
    },
  );
  const [selected, setSelected] = useState(0);
  const latest = useRef({ snapshot, act, selected, open, pending });
  latest.current = { snapshot, act, selected, open, pending };
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
          if (latest.current.pending) return;
          const { snapshot, selected, act } = latest.current;
          act(snapshot.candidates[selected].action);
          setOpen(false);
        },
      },
    ];
    for (const quick of gameQuickActions[kind] ?? [])
      entries.push({
        id: `${kind}.${quick.id}`,
        title: quick.title,
        binding: quick.binding,
        enabled: () =>
          !latest.current.open &&
          !latest.current.pending &&
          latest.current.snapshot.candidates.some((candidate) =>
            quick.matches(candidate.action),
          ),
        run: () => {
          if (latest.current.pending) return;
          const candidate = latest.current.snapshot.candidates.find(
            (candidate) => quick.matches(candidate.action),
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
      {!auxiliaryView && showTrigger && (
        <button
          onClick={() => setOpen(true)}
          disabled={!snapshot.state || snapshot.finished}
        >
          游戏操作 <kbd>{bindings[`${snapshot.kind}.actions`] || "F2"}</kbd>
        </button>
      )}
      {!detached && (
        <Panel
          initialFocus={choices}
          scope={snapshot.kind}
          open={open}
          onOpenChange={setOpen}
          title="游戏操作"
        >
          <div className="command-picker">
            <p className="muted command-keyboard-hint">
              ↑ ↓ 选择 · Enter 确认 · Esc 关闭
            </p>
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
                  disabled={pending}
                  onClick={() => {
                    const candidate = snapshot.candidates[selected];
                    if (candidate && !pending) {
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
      )}
    </>
  );
}
