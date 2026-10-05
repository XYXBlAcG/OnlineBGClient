import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { gameCatalogue, type GameKind } from "../domain/catalogue";
import { beginnerGuides } from "./beginner-guides";
import { guidePosition, type GuideSnapshot } from "./guide-position";

export function BeginnerGuide({
  kind,
  enabled,
  onChange,
  snapshot,
  dock,
  visible = true,
  onLocate,
}: {
  kind: GameKind;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  snapshot?: GuideSnapshot;
  dock?: HTMLElement | null;
  visible?: boolean;
  onLocate?: (located: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [targetCount, setTargetCount] = useState(0);
  const [located, setLocated] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const targets = useRef<Element[]>([]);
  const guide = beginnerGuides[kind];
  const step = guide?.steps[index];
  useEffect(() => {
    setLocated(false);
    onLocate?.(false);
  }, [enabled, step, onLocate]);
  useEffect(() => {
    if (!enabled || !visible || !step) return;
    const area = document.querySelector(".game-area");
    if (!area) return;
    const refresh = () => {
      targets.current.forEach((node) =>
        node.removeAttribute("data-guide-focus"),
      );
      const board = area.querySelector(".original-game");
      const matches = board
        ? [...board.querySelectorAll(step.focus.selector || "button")]
            .filter(
              (node) =>
                node.getClientRects().length &&
                (!step.focus.button ||
                  node.textContent?.includes(step.focus.button)),
            )
            .slice(0, 3)
        : [];
      matches.forEach((node) => node.setAttribute("data-guide-focus", "true"));
      targets.current = matches;
      setTargetCount(matches.length);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(area, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      targets.current.forEach((node) =>
        node.removeAttribute("data-guide-focus"),
      );
      targets.current = [];
    };
  }, [enabled, visible, step, snapshot?.version]);
  if (!guide || !step) return null;
  const current = snapshot?.state
    ? snapshot.finished
      ? "本局已结束，可以结合牌桌回顾这些步骤。"
      : snapshot.candidates.length
        ? "下面是当前实际可执行的动作；先阅读，再在牌桌上自行选择。"
        : "当前正在等待其他玩家或结算，先观察牌桌，轮到你时再操作。"
    : "当前尚未开局。开始对局后，可以定位到真实的牌桌区域。";
  const content = enabled && (
    <section
      ref={panel}
      id="beginner-guide-content"
      className="beginner-guide-content"
      aria-label={`${gameCatalogue[kind].name}新手引导`}
    >
      <div className="beginner-guide-heading">
        <strong>{gameCatalogue[kind].name}</strong>
        <span>
          {index + 1} / {guide.steps.length}
        </span>
        <button onClick={() => onChange(false)} aria-label="关闭新手引导">
          ×
        </button>
      </div>
      <div className="guide-reading">
        <p className="muted">{guide.goal}</p>
        <div aria-live="polite" aria-atomic="true">
          <h3>{step.title}</h3>
          <p>{step.text}</p>
          <ol className="beginner-guide-details">
            {step.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ol>
          <p className="beginner-guide-tip">{step.tip}</p>
        </div>
        <div className="beginner-guide-context">
          <strong>看实际牌桌</strong>
          <p>{step.focus.caption}</p>
          <button
            disabled={!targetCount || !snapshot?.state}
            onClick={() => {
              const behavior =
                document.documentElement.dataset.motion === "false"
                  ? "instant"
                  : "smooth";
              targets.current[0]?.scrollIntoView({
                block: "center",
                behavior,
              });
              setLocated(true);
              onLocate?.(true);
            }}
          >
            定位到牌桌
          </button>
          <p>{current}</p>
          {snapshot && (
            <ul className="beginner-guide-actions">
              {guidePosition(snapshot).map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
          {snapshot?.state &&
            !snapshot.finished &&
            snapshot.candidates.length > 0 && (
              <ul className="beginner-guide-actions">
                {snapshot.candidates.slice(0, 3).map((candidate, index) => (
                  <li key={index}>{candidate.label}</li>
                ))}
              </ul>
            )}
        </div>
      </div>
      <div className="beginner-guide-navigation">
        <button disabled={index === 0} onClick={() => setIndex(index - 1)}>
          上一步
        </button>
        {index < guide.steps.length - 1 ? (
          <button onClick={() => setIndex(index + 1)}>下一步</button>
        ) : (
          <button onClick={() => onChange(false)}>完成引导</button>
        )}
      </div>
    </section>
  );
  return (
    <div className="beginner-guide">
      <button
        aria-pressed={enabled}
        aria-expanded={enabled && visible}
        aria-controls="beginner-guide-content"
        onClick={() => {
          if (!enabled) setIndex(0);
          onChange(!enabled || !visible);
        }}
      >
        新手引导
      </button>
      {dock ? createPortal(content, dock) : content}
      {enabled && located && (
        <aside className="guide-locator" aria-label="牌桌引导定位">
          <span>{step.focus.caption}</span>
          <button
            onClick={() => {
              panel.current?.scrollIntoView({
                block: "start",
                behavior: "instant",
              });
              setLocated(false);
              onLocate?.(false);
            }}
          >
            返回引导
          </button>
        </aside>
      )}
    </div>
  );
}
