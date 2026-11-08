import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const motionDisabled = () => {
  if (typeof window === "undefined" || typeof document === "undefined")
    return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.motion === "false"
  );
};

export function LobbySetupTransition({
  panelKey,
  reduced = false,
  variant,
  children,
}: {
  panelKey: string;
  reduced?: boolean;
  variant: "heading" | "options";
  children: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const shown = useRef({ key: panelKey, node: children });
  const [displayedKey, setDisplayedKey] = useState(panelKey);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  if (displayedKey === panelKey)
    shown.current = { key: panelKey, node: children };
  useEffect(() => {
    if (panelKey === displayedKey) return;
    const box = container.current;
    if (!box) {
      setDisplayedKey(panelKey);
      setPhase("idle");
      return;
    }
    if (reduced || motionDisabled()) {
      box.style.height = "auto";
      setDisplayedKey(panelKey);
      setPhase("idle");
      return;
    }
    box.style.height = `${box.offsetHeight}px`;
    setPhase("out");
    const swap = window.setTimeout(() => {
      setDisplayedKey(panelKey);
      setPhase("in");
    }, 150);
    return () => window.clearTimeout(swap);
  }, [panelKey, displayedKey, reduced]);
  useLayoutEffect(() => {
    if (phase !== "in") return;
    const box = container.current;
    const body = content.current;
    if (!box || !body) return;
    box.style.height = `${body.offsetHeight}px`;
    const finish = window.setTimeout(() => {
      box.style.height = "auto";
      setPhase("idle");
    }, 300);
    return () => window.clearTimeout(finish);
  }, [phase, displayedKey]);
  return (
    <div
      ref={container}
      className="lobby-setup-transition"
      data-phase={phase}
      data-animating={phase !== "idle" ? "true" : "false"}
    >
      <div
        className="lobby-setup-skeleton"
        data-variant={variant}
        aria-hidden="true"
      >
        {variant === "heading" ? (
          <>
            <span className="lobby-skeleton-cover" />
            <span className="lobby-skeleton-line lobby-skeleton-title" />
            <span className="lobby-skeleton-line lobby-skeleton-caption" />
          </>
        ) : (
          <>
            <span className="lobby-skeleton-label" />
            <span className="lobby-skeleton-field" />
            <div className="lobby-skeleton-row">
              <span />
              <span />
            </div>
            <span className="lobby-skeleton-field" />
          </>
        )}
      </div>
      <div ref={content} className="lobby-setup-transition-content">
        {displayedKey === panelKey ? children : shown.current.node}
      </div>
    </div>
  );
}
