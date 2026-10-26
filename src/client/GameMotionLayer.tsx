import { MotionLifetime } from "./motion/motion-lifetime";
import { useLayoutEffect, useRef } from "react";
import type { GameSnapshot } from "./OriginalGame";
import { usePresentation } from "./motion";
import { gameHighlights } from "./game-motion";
import { gameMotionEvents } from "./game-motion-events";
import { sampleTable, type TableSample } from "./motion/table-sample";
import { TableAnimator } from "./motion/table-animator";
export function GameMotionLayer({
  snapshot,
  active = true,
  rate = 1,
}: {
  snapshot: GameSnapshot;
  active?: boolean;
  rate?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null),
    previous = useRef<{ snapshot: GameSnapshot; nodes: TableSample[] }>();
  const { game } = usePresentation();
  const lifetime = useRef(new MotionLifetime(3));
  useLayoutEffect(() => {
    previous.current = undefined;
    return () => lifetime.current.clear();
  }, [snapshot.room, snapshot.kind, snapshot.actor, game, active, rate]);
  useLayoutEffect(() => {
    const surface = ref.current?.closest(".original-game");
    if (!surface || !snapshot.state || game !== "enhanced" || !active) {
      previous.current = undefined;
      lifetime.current.clear();
      return;
    }
    const nodes = sampleTable(surface),
      last = previous.current;
    previous.current = { snapshot, nodes };
    const continuous =
      last &&
      last.snapshot.room === snapshot.room &&
      last.snapshot.kind === snapshot.kind &&
      last.snapshot.actor === snapshot.actor &&
      snapshot.version === last.snapshot.version + 1 &&
      last.snapshot.state;
    const events = continuous
        ? gameMotionEvents(last.snapshot.state!, snapshot.state, snapshot.actor)
        : [],
      highlights = continuous
        ? gameHighlights(last.snapshot.state!, snapshot.state)
        : [];
    const animator =
      continuous &&
      (snapshot.kind !== "expedition" || events.length || highlights.length)
        ? new TableAnimator(surface, last.nodes, nodes, rate)
        : undefined;
    animator?.play(events, highlights);
    if (animator && snapshot.kind === "expedition")
      lifetime.current.keep(animator, 1700 / rate + 100);
    const invalidate = () => {
      lifetime.current.clear();
      if (snapshot.kind !== "expedition") animator?.cancel();
      previous.current = { snapshot, nodes: sampleTable(surface) };
    };
    window.addEventListener("resize", invalidate);
    surface.addEventListener("scroll", invalidate, true);
    if (snapshot.kind !== "expedition") {
      surface.addEventListener("pointerdown", invalidate, true);
      surface.addEventListener("pointerup", invalidate, true);
      surface.addEventListener("keydown", invalidate, true);
    }
    return () => {
      if (snapshot.kind !== "expedition") animator?.cancel();
      window.removeEventListener("resize", invalidate);
      surface.removeEventListener("scroll", invalidate, true);
      surface.removeEventListener("pointerdown", invalidate, true);
      surface.removeEventListener("pointerup", invalidate, true);
      surface.removeEventListener("keydown", invalidate, true);
    };
  }, [
    snapshot.version,
    snapshot.room,
    snapshot.kind,
    snapshot.actor,
    game,
    active,
    rate,
  ]);
  return <span hidden ref={ref} />;
}
