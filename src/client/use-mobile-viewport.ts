import { useLayoutEffect } from "react";
import { mobileViewport } from "./mobile-viewport";
export function useMobileViewport(enabled: boolean): void {
  useLayoutEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;
    let layoutHeight = innerHeight,
      lastWidth = innerWidth;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (lastWidth !== innerWidth || innerHeight > layoutHeight - 120)
          layoutHeight = innerHeight;
        lastWidth = innerWidth;
        const orientation = screen.orientation?.type?.startsWith("landscape")
          ? "landscape"
          : screen.orientation?.type?.startsWith("portrait")
            ? "portrait"
            : undefined;
        const value = mobileViewport({
          width: innerWidth,
          height: layoutHeight,
          visualHeight: viewport?.height ?? innerHeight,
          offsetTop: viewport?.offsetTop ?? 0,
          windowHeight: innerHeight,
          orientation,
        });
        root.dataset.mobileOrientation = value.landscape
          ? "landscape"
          : "portrait";
        root.dataset.mobileKeyboard = String(value.keyboard);
        root.style.setProperty("--mobile-top", `${viewport?.offsetTop ?? 0}px`);
        root.style.setProperty("--mobile-height", `${value.height}px`);
        root.style.setProperty(
          "--mobile-chat-height",
          `${value.height * 0.85}px`,
        );
        root.style.setProperty("--mobile-keyboard-bottom", `${value.bottom}px`);
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      delete root.dataset.mobileOrientation;
      delete root.dataset.mobileKeyboard;
      for (const name of [
        "--mobile-height",
        "--mobile-chat-height",
        "--mobile-keyboard-bottom",
        "--mobile-top",
      ])
        root.style.removeProperty(name);
    };
  }, [enabled]);
}
