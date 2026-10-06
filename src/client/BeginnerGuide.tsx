import { GuideHighlight, type GuideRect } from "./GuideHighlight";
import { guideTarget } from "./guide-targets";
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
  stepIndex,
  onStepChange,
  targetsOnly = false,
  readingOnly = false,
  showToggle = true,
  locateRequest = 0,
  onRequestLocate,
}: {
  kind: GameKind;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  snapshot?: GuideSnapshot;
  dock?: HTMLElement | null;
  visible?: boolean;
  onLocate?: (located: boolean) => void;
  stepIndex?: number;
  onStepChange?: (index: number) => void;
  targetsOnly?: boolean;
  readingOnly?: boolean;
  showToggle?: boolean;
  locateRequest?: number;
  onRequestLocate?: () => void;
}) {
  const [localIndex, setLocalIndex] = useState(0);
  const index = stepIndex ?? localIndex;
  const setIndex = (value: number) => {
    setLocalIndex(value);
    onStepChange?.(value);
  };
  const [targetCount, setTargetCount] = useState(0);
  const [rects, setRects] = useState<GuideRect[]>([]);
  const [located, setLocated] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const targets = useRef<Element[]>([]);
  const scrollRequested = useRef(false);
  const guide = beginnerGuides[kind];
  const step = guide?.steps[index];
  const query = step ? guideTarget(step.focus.target, snapshot) : null;
  useEffect(() => {
    setLocated(false);
    onLocate?.(false);
  }, [enabled, step, onLocate]);
  const seenRequest = useRef(locateRequest);
  useEffect(() => {
    if (seenRequest.current === locateRequest) return;
    seenRequest.current = locateRequest;
    if (!enabled) return;
    scrollRequested.current = true;
    setLocated(true);
    onLocate?.(true);
  }, [locateRequest, enabled, onLocate]);
  useEffect(() => {
    if (!enabled || !visible || !step || readingOnly) return;
    const area = document.querySelector(".game-area");
    if (!area) return;
    const query = guideTarget(step.focus.target, snapshot);
    let frame = 0;
    const refresh = () => {
      targets.current.forEach((node) =>
        node.removeAttribute("data-guide-focus"),
      );
      const matches = [
        ...area.querySelectorAll<HTMLElement | SVGElement>(
          "[data-guide-target]",
        ),
      ]
        .filter((node) => {
          if (
            node.dataset.guideTarget !== query.key ||
            node.dataset.guideSmall === "true"
          )
            return false;
          if (query.ids && !query.ids.includes(node.dataset.guideId || ""))
            return false;
          if (
            query.player !== undefined &&
            node.dataset.guidePlayer !== String(query.player)
          )
            return false;
          if (
            query.within &&
            !node.closest(`[data-room-region="${query.within}"]`)
          )
            return false;
          if (scrollRequested.current) {
            const details = node.closest("details");
            if (details) details.open = true;
          }
          return !!node.getClientRects().length;
        })
        .slice(0, query.limit);
      targets.current = matches;
      if (scrollRequested.current && matches.length) {
        matches[0].scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        });
        scrollRequested.current = false;
      }
      if (located)
        matches.forEach((node) =>
          node.setAttribute("data-guide-focus", "true"),
        );
      setTargetCount(matches.length);
      const boxes = located
        ? matches
            .map((node) => {
              const r = node.getBoundingClientRect();
              const pane = node
                .closest(".map-scroll,.original-game")
                ?.getBoundingClientRect();
              const x = Math.max(0, r.left, pane?.left || 0),
                y = Math.max(0, r.top, pane?.top || 0);
              return {
                x,
                y,
                width: Math.max(
                  0,
                  Math.min(innerWidth, r.right, pane?.right || innerWidth) - x,
                ),
                height: Math.max(
                  0,
                  Math.min(innerHeight, r.bottom, pane?.bottom || innerHeight) -
                    y,
                ),
              };
            })
            .filter((r) => r.width > 0 && r.height > 0)
        : [];
      if (
        located &&
        area
          .getAnimations({ subtree: true })
          .some((animation) => animation.playState === "running")
      )
        frame = requestAnimationFrame(refresh);
      setRects((previous) =>
        JSON.stringify(previous) === JSON.stringify(boxes) ? previous : boxes,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refresh);
    };
    refresh();
    const observer = new MutationObserver(schedule);
    observer.observe(area, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "cx", "cy", "d"],
    });
    const resize = new ResizeObserver(schedule);
    resize.observe(area);
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    return () => {
      observer.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
      targets.current.forEach((node) =>
        node.removeAttribute("data-guide-focus"),
      );
      targets.current = [];
    };
  }, [enabled, visible, step, snapshot?.version, located, readingOnly]);
  if (!guide || !step) return null;
  const current = snapshot?.state
    ? snapshot.finished
      ? "本局已结束，可以结合牌桌回顾这些步骤。"
      : snapshot.candidates.length
        ? "下面是当前实际可执行的动作；先阅读，再在牌桌上自行选择。"
        : "当前正在等待其他玩家或结算，先观察牌桌，轮到你时再操作。"
    : "当前尚未开局。开始对局后，可以定位到真实的牌桌区域。";
  const content = enabled && !targetsOnly && (
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
            disabled={!snapshot?.state || snapshot.actor < 0}
            onClick={() => {
              if (readingOnly) {
                onRequestLocate?.();
                return;
              }
              scrollRequested.current = true;
              document.dispatchEvent(
                new CustomEvent("room-reveal", { detail: step.focus.target }),
              );
              setLocated(true);
              onLocate?.(true);
            }}
          >
            {query?.label}
          </button>
          {!readingOnly && !targetCount && <p role="status">{query?.wait}</p>}
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
      {showToggle && (
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
      )}
      {dock ? createPortal(content, dock) : content}
      {enabled && visible && located && !readingOnly && (
        <GuideHighlight rects={rects} caption={step.focus.caption} />
      )}
      {enabled && located && !readingOnly && (
        <aside className="guide-locator" aria-label="牌桌引导定位">
          <span>{step.focus.caption}</span>
          <button
            onClick={() => {
              document.dispatchEvent(
                new CustomEvent("room-reveal", { detail: "guide" }),
              );
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
