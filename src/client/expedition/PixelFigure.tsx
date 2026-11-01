import { useEffect, useRef } from "react";
import style from "../../../public/art/expedition/style.json";
import { usePresentation } from "../motion";
export function PixelFigure({ kind }: { kind: string }) {
  const element = useRef<HTMLSpanElement>(null),
    motion = usePresentation();
  let name = kind;
  if (kind.startsWith("hero:"))
    name = style.heroes[Number(kind.slice(5)) % style.heroes.length];
  if (kind.startsWith("enemy:")) {
    let hash = 0;
    for (const c of kind) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    name = style.monsters[hash % style.monsters.length];
  }
  const frames =
    (style.animations as Record<string, string[]>)[name] ??
    style.animations.knight_m;
  useEffect(() => {
    if (!element.current || motion.game === "reduced") return;
    const animation = element.current.animate(
      frames.map((file) => ({
        backgroundImage: `url(/art/expedition/${file})`,
      })),
      { duration: 850, iterations: Infinity, easing: "steps(1,end)" },
    );
    return () => animation.cancel();
  }, [name, motion.game]);
  return (
    <span
      ref={element}
      className="exp-pixel-figure"
      style={{ backgroundImage: `url(/art/expedition/${frames[0]})` }}
      aria-hidden="true"
    />
  );
}
