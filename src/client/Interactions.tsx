import { useEffect, useRef } from "react";
import { interactionCatalogue, type InteractionEvent } from "../domain/social";
import { effectMotion } from "./effect-motion";
import { playCue } from "./notifications";

function Particle({
  event,
  motion,
  sound,
  onEnd,
}: {
  event: InteractionEvent;
  motion: boolean;
  sound: boolean;
  onEnd: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const surface = element?.closest(".original-game");
    const bounds = surface?.getBoundingClientRect();
    const from = surface
      ?.querySelector(`[data-game-avatar="${event.from}"]`)
      ?.getBoundingClientRect();
    const target = surface
      ?.querySelector(`[data-game-avatar="${event.target}"]`)
      ?.getBoundingClientRect();
    if (!element || !target || !bounds) {
      onEnd(event.id);
      return;
    }
    if (sound) playCue();
    const end = {
      x: target.x + target.width / 2 - bounds.x,
      y: target.y + target.height / 2 - bounds.y,
    };
    const start =
      motion && from
        ? {
            x: from.x + from.width / 2 - bounds.x,
            y: from.y + from.height / 2 - bounds.y,
          }
        : end;
    element.style.left = `${start.x}px`;
    element.style.top = `${start.y}px`;
    const effect = interactionCatalogue[event.kind];
    const frames = effectMotion(effect.style, end.x - start.x, end.y - start.y);
    element.style.setProperty("--effect-color", effect.color);
    const animation = element.animate(
      motion ? frames.body : [{ opacity: 1 }, { opacity: 0 }],
      { duration: motion ? 1900 : 900, easing: "ease-out" },
    );
    const fragments = motion
      ? frames.fragments.map((keyframes, index) => {
          const fragment = document.createElement("span");
          fragment.className = `interaction-fragment effect-${effect.style}`;
          fragment.textContent = effect.particles;
          fragment.style.left = `${end.x}px`;
          fragment.style.top = `${end.y}px`;
          element.parentElement?.appendChild(fragment);
          fragment.animate(keyframes, {
            duration: 750,
            delay: 950 + (index % 4) * 45,
            easing: "ease-out",
          }).onfinish = () => fragment.remove();
          return fragment;
        })
      : [];
    animation.onfinish = () => onEnd(event.id);
    return () => {
      animation.cancel();
      fragments.forEach((fragment) => fragment.remove());
    };
  }, [event, motion, sound, onEnd]);
  return (
    <div
      ref={ref}
      className="interaction-particle"
      data-interaction={event.id}
      data-effect={event.kind}
      data-effect-style={interactionCatalogue[event.kind].style}
      aria-hidden="true"
    >
      {interactionCatalogue[event.kind].emoji}
    </div>
  );
}
export function Interactions({
  events,
  motion,
  sound,
  onEnd,
}: {
  events: InteractionEvent[];
  motion: boolean;
  sound: boolean;
  onEnd: (id: string) => void;
}) {
  return (
    <div className="interaction-layer">
      {events.map((event) => (
        <Particle
          key={event.id}
          event={event}
          motion={motion}
          sound={sound}
          onEnd={onEnd}
        />
      ))}
    </div>
  );
}
