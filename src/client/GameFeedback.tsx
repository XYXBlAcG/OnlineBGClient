import { useEffect, useRef } from "react";
export interface GameFeedbackProps {
  event?: { card?: number; noble?: number[]; gemDelta?: number[] };
  version: number;
  target: "ccbs.market" | "ccbs.noble" | "ccbs.bank";
}
export function GameFeedback({ event, version, target }: GameFeedbackProps) {
  const anchor = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!event || document.documentElement.dataset.motion === "false") return;
    if (
      (target === "ccbs.market" && !event.card) ||
      (target === "ccbs.noble" && !event.noble?.length) ||
      (target === "ccbs.bank" && !event.gemDelta?.some((value) => value !== 0))
    )
      return;
    const surface = anchor.current?.closest(".original-game");
    if (!surface) return;
    const nodes = [
      ...surface.querySelectorAll<HTMLElement>(
        `[data-guide-target="${target}"]`,
      ),
    ].filter(
      (node) =>
        node.dataset.guideSmall !== "true" &&
        node.getClientRects().length &&
        (target !== "ccbs.bank" ||
          !!event.gemDelta?.[Number(node.dataset.guideId)]),
    );
    const animations = nodes.map((node) =>
      node.animate(
        [
          { filter: "brightness(1)", transform: "scale(1)" },
          { filter: "brightness(1.18)", transform: "scale(1.04)", offset: 0.4 },
          { filter: "brightness(1)", transform: "scale(1)" },
        ],
        { duration: 480, easing: "ease-out" },
      ),
    );
    return () => animations.forEach((animation) => animation.cancel());
  }, [version, target]);
  return <span hidden ref={anchor} />;
}
