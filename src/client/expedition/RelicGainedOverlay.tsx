import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ExpeditionNodeResult } from "../../domain/expedition/adventure-types";
import { relics, relicText } from "../../domain/expedition/world";

export function RelicGainedOverlay({
  result,
  actor,
  onClose,
}: {
  result: ExpeditionNodeResult;
  actor: number;
  onClose: () => void;
}) {
  const before = result.before.heroes[actor];
  const after = result.after.heroes[actor];
  const gained =
    before && after
      ? after.relics.filter((relic) => !before.relics.includes(relic))
      : [];
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  if (!gained.length || !after) return null;
  return createPortal(
    <div
      className="exp-relic-layer"
      role="dialog"
      aria-modal="true"
      aria-label="获得遗物"
      onClick={onClose}
    >
      <div className="exp-relic-card">
        <header>
          <span>{relics[gained[0]].icon}</span>
          <div>
            <h2>获得遗物</h2>
            <small>{after.name}</small>
          </div>
        </header>
        <div className="exp-relic-list">
          {gained.map((id) => (
            <article key={id}>
              <span>{relics[id].icon}</span>
              <div>
                <strong>{relics[id].name}</strong>
                <p>{relicText(id)}</p>
              </div>
            </article>
          ))}
        </div>
        <small>点击任意位置关闭</small>
      </div>
    </div>,
    document.body,
  );
}
