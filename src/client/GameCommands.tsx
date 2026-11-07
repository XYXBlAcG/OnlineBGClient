import { ChoiceButton, useConfirmedAction } from "./ui/ConfirmedChoice";
import { gameQuickActions, quickCandidate } from "./game-quick-actions";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "../domain/protocol";
import type { Action } from "../domain/types";
import { CommandRegistry, formatBinding, keyboardBinding } from "./commands";
import { Button } from "./ui/Controls";
import { Shortcut } from "./ui/Shortcut";

export function GameCommands({
  snapshot,
  act,
  registry,
  bindings,
  pending = false,
  onReveal,
}: {
  pending?: boolean;
  onReveal?: () => void;
  snapshot: Snapshot;
  act: (action: Action) => void;
  registry: CommandRegistry;
  bindings: Record<string, string>;
}) {
  const choices = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const confirm = useConfirmedAction(
    snapshot.version,
    pending,
    (index: number) => {
      const candidate = snapshot.candidates[index];
      if (candidate) {
        act(candidate.action);
        setOpen(false);
      }
    },
  );
  const menuScope = `${snapshot.kind}.menu`;
  const latest = useRef({
    snapshot,
    act,
    selected,
    open,
    pending,
    onReveal,
    confirm,
  });
  latest.current = {
    snapshot,
    act,
    selected,
    open,
    pending,
    onReveal,
    confirm,
  };
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
        run: () => {
          if (!latest.current.open) latest.current.onReveal?.();
          setOpen((value) => !value);
        },
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
            Math.max(
              0,
              Math.min(
                latest.current.snapshot.candidates.length - 1,
                value + 1,
              ),
            ),
          ),
      },
      {
        id: `${kind}.submit`,
        title: "确认动作",
        binding: "Enter",
        enabled: () =>
          latest.current.open &&
          !latest.current.pending &&
          !!latest.current.snapshot.candidates[latest.current.selected],
        run: () => {
          latest.current.confirm(latest.current.selected);
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
          !!quickCandidate(latest.current.snapshot.candidates, quick),
        run: () => {
          if (latest.current.pending) return;
          const candidate = quickCandidate(
            latest.current.snapshot.candidates,
            quick,
          );
          if (candidate) latest.current.act(candidate.action);
        },
      });
    const stop = entries.map((entry) =>
      registry.register({
        ...entry,
        scope: ["previous", "next", "submit"].some(
          (id) => entry.id === `${kind}.${id}`,
        )
          ? `${kind}.menu`
          : kind,
        binding: bindings[entry.id] ?? entry.binding,
      }),
    );
    return () => stop.forEach((dispose) => dispose());
  }, [snapshot.kind, registry, bindings]);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="primary"
          aria-pressed={open}
          disabled={!snapshot.state || snapshot.finished}
        >
          游戏操作{" "}
          <Shortcut binding={bindings[`${snapshot.kind}.actions`] ?? "F2"} />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="ui-popover game-command-menu"
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          data-command-scope={menuScope}
          aria-label="游戏操作"
          onKeyDown={(event) => {
            if (
              keyboardBinding(event) ===
              (bindings[`${snapshot.kind}.actions`] ?? "F2")
            ) {
              event.preventDefault();
              setOpen(false);
            }
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            choices.current?.focus();
          }}
        >
          <div className="command-picker">
            <p className="muted command-keyboard-hint">双击确认，或按 Enter</p>
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
                    <ChoiceButton
                      value={index}
                      selected={index === selected}
                      onChoose={setSelected}
                      onConfirm={confirm}
                      disabled={pending}
                      role="option"
                      id={`game-action-${index}`}
                      tabIndex={-1}
                      className={index === selected ? "selected-action" : ""}
                      key={index}
                    >
                      {candidate.label}
                    </ChoiceButton>
                  ))}
                </div>
                <Button
                  variant="primary"
                  disabled={pending || !snapshot.candidates[selected]}
                  onClick={() => confirm(selected)}
                >
                  确认{" "}
                  <Shortcut
                    binding={bindings[`${snapshot.kind}.submit`] ?? "Enter"}
                  />
                </Button>
              </>
            ) : (
              <p>等待其他玩家操作</p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
