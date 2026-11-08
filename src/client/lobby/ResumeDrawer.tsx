import { useState } from "react";
import { RunShelf } from "../expedition/RunShelf";
import type { RunLink } from "../storage";
import { Button, Panel } from "../ui/Controls";
import "./resume-drawer.css";

export function ResumeDrawer({
  busy,
  hosted,
  localSave,
  lastRoom,
  onRestoreHosted,
  onRestoreLocal,
  onRestoreNetwork,
  onRestoreRun,
  onAbandonRun,
}: {
  busy: boolean;
  hosted: boolean;
  localSave: boolean;
  lastRoom: string | null;
  onRestoreHosted: () => void;
  onRestoreLocal: () => void;
  onRestoreNetwork: (room: string) => void;
  onRestoreRun: (link: RunLink) => void;
  onAbandonRun: (link: RunLink) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const others: { id: string; label: string; restore: () => void }[] = [];
  if (hosted)
    others.push({
      id: "hosted",
      label: "恢复我创建的公网房间",
      restore: onRestoreHosted,
    });
  if (localSave)
    others.push({
      id: "local",
      label: "恢复本地对局",
      restore: onRestoreLocal,
    });
  if (lastRoom)
    others.push({
      id: "network",
      label: "恢复最近联机房间",
      restore: () => onRestoreNetwork(lastRoom),
    });
  const closeAnd = (action: () => void) => {
    setOpen(false);
    action();
  };
  return (
    <>
      <Button className="resume-trigger" onClick={() => setOpen(true)}>
        继续对局
      </Button>
      <Panel
        className="resume-drawer"
        title="继续对局"
        open={open}
        onOpenChange={setOpen}
      >
        <div className="resume-drawer-body">
          <RunShelf
            busy={busy}
            onRestore={(link) => closeAnd(() => onRestoreRun(link))}
            onAbandon={onAbandonRun}
          />
          <section className="resume-other">
            <h3>其他未完成</h3>
            {others.map((item) => (
              <Button
                key={item.id}
                disabled={busy}
                onClick={() => closeAnd(item.restore)}
              >
                {item.label}
              </Button>
            ))}
            {!others.length && <p className="muted">没有待恢复的对局</p>}
          </section>
        </div>
      </Panel>
    </>
  );
}
