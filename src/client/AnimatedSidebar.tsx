import { usePresentation } from "./motion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
export function AnimatedSidebar({
  open,
  animated,
  mobile,
  children,
  className = "room-sidebar",
}: {
  open: boolean;
  animated: boolean;
  mobile: boolean;
  children: ReactNode;
  className?: string;
}) {
  const presentation = usePresentation();
  const enabled = animated && presentation.ui;
  const root = useRef<HTMLElement>(null);
  const retained = useRef(children);
  const [present, setPresent] = useState(open);
  useLayoutEffect(() => {
    if (open) retained.current = children;
  }, [open, children]);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    element.inert = !open;
    if (!enabled) {
      setPresent(open);
      return;
    }
    if (open) setPresent(true);
    let disposed = false;
    const shift = mobile ? "translateY(28px)" : "translateX(20px)";
    const frames = [
      { opacity: 0, transform: shift },
      { opacity: 1, transform: "translate(0,0)" },
    ];
    const animation = element.animate(open ? frames : [...frames].reverse(), {
      duration: 240,
      easing: "cubic-bezier(.16,1,.3,1)",
    });
    void animation.finished.then(
      () => {
        if (!disposed && !open) setPresent(false);
      },
      () => {},
    );
    return () => {
      disposed = true;
      animation.cancel();
    };
  }, [open, enabled, mobile]);
  return (
    <aside
      ref={root}
      className={className}
      hidden={!open && !present}
      aria-hidden={!open}
      data-motion-scope="ui"
    >
      {open || !present ? children : retained.current}
    </aside>
  );
}
