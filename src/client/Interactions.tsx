import { useEffect, useRef } from "react";
import { interactionKinds, type InteractionEvent } from "../domain/social";
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
    const from = document
      .querySelector(`[data-avatar-index="${event.from}"]`)
      ?.getBoundingClientRect();
    const target = document
      .querySelector(`[data-avatar-index="${event.target}"]`)
      ?.getBoundingClientRect();
    if (!element || !target) {
      onEnd(event.id);
      return;
    }
    if (sound) playCue();
    const end = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2,
    };
    const start =
      motion && from
        ? { x: from.x + from.width / 2, y: from.y + from.height / 2 }
        : end;
    element.style.left = `${start.x}px`;
    element.style.top = `${start.y}px`;
    const animation = element.animate(
      motion
        ? [
            { transform: "translate(-50%,-50%) scale(0.5)", opacity: 0 },
            {
              transform: `translate(calc(-50% + ${(end.x - start.x) / 2}px), calc(-50% + ${(end.y - start.y) / 2 - 90}px)) rotate(120deg)`,
              opacity: 1,
              offset: 0.45,
            },
            {
              transform: `translate(calc(-50% + ${end.x - start.x}px), calc(-50% + ${end.y - start.y}px)) rotate(240deg) scale(1.3)`,
              opacity: 1,
              offset: 0.75,
            },
            {
              transform: `translate(calc(-50% + ${end.x - start.x}px), calc(-50% + ${end.y - start.y}px)) scale(1.8)`,
              opacity: 0,
            },
          ]
        : [{ opacity: 1 }, { opacity: 0 }],
      { duration: motion ? 1100 : 900, easing: "ease-out" },
    );
    animation.onfinish = () => onEnd(event.id);
    return () => animation.cancel();
  }, [event, motion, sound, onEnd]);
  return (
    <div
      ref={ref}
      className="interaction-particle"
      data-interaction={event.id}
      aria-hidden="true"
    >
      {interactionKinds[event.kind]}
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
