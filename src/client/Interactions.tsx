import { createPortal } from "react-dom";
import { effectClip } from "./effect-viewport";
import { useEffect, useRef, useState } from "react";
import { interactionCatalogue, type InteractionEvent } from "../domain/social";
import { effectMotion } from "./effect-motion";
import { playCue } from "./notifications";

function Particle({
  event,
  surface,
  motion,
  enhanced,
  sound,
  onEnd,
}: {
  event: InteractionEvent;
  surface: HTMLElement;
  motion: boolean;
  enhanced: boolean;
  sound: boolean;
  onEnd: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const bounds = surface?.getBoundingClientRect();
    const sourceSelector = event.units
      ? `[data-game-unit="${event.units.from}"]`
      : `[data-game-avatar="${event.from}"]`;
    const targetSelector = event.units
      ? `[data-game-unit="${event.units.target}"]`
      : `[data-game-avatar="${event.target}"]`;
    const source = surface.querySelector(sourceSelector),
      destination = surface.querySelector(targetSelector);
    const from = source?.getBoundingClientRect(),
      target = destination?.getBoundingClientRect();
    if (!element || !target || !bounds) {
      onEnd(event.id);
      return;
    }
    const clip = effectClip(bounds, window.innerWidth, window.innerHeight);
    element.parentElement!.style.clipPath = `inset(${clip.top}px ${clip.right}px ${clip.bottom}px ${clip.left}px)`;
    if (sound) playCue("interaction");
    const end = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2,
    };
    const start =
      motion && from
        ? {
            x: from.x + from.width / 2,
            y: from.y + from.height / 2,
          }
        : end;
    element.style.left = `${start.x}px`;
    element.style.top = `${start.y}px`;
    const effect = interactionCatalogue[event.kind];
    const frames = effectMotion(
      effect.style,
      end.x - start.x,
      end.y - start.y,
      enhanced ? 16 : 10,
      event.units ? (enhanced ? 1.8 : 1.4) : 1,
    );
    element.style.setProperty("--effect-color", effect.color);
    let frame = 0,
      positionKey = "";
    const track = () => {
      if (!destination?.isConnected || (source && !source.isConnected)) {
        onEnd(event.id);
        return;
      }
      const current = surface.getBoundingClientRect(),
        a = destination.getBoundingClientRect(),
        b = motion && source ? source.getBoundingClientRect() : a;
      const clip = effectClip(current, window.innerWidth, window.innerHeight);
      element.parentElement!.style.clipPath = `inset(${clip.top}px ${clip.right}px ${clip.bottom}px ${clip.left}px)`;
      element.style.left = `${b.x + b.width / 2}px`;
      element.style.top = `${b.y + b.height / 2}px`;
      const key = [a.x, a.y, a.width, b.x, b.y, b.width]
        .map((n) => Math.round(n))
        .join(":");
      if (motion && key !== positionKey) {
        positionKey = key;
        const frames = effectMotion(
          effect.style,
          a.x + a.width / 2 - b.x - b.width / 2,
          a.y + a.height / 2 - b.y - b.height / 2,
          enhanced ? 16 : 10,
          event.units ? (enhanced ? 1.8 : 1.4) : 1,
        );
        element.getAnimations()[0]?.effect &&
          (element.getAnimations()[0].effect as KeyframeEffect).setKeyframes(
            frames.body,
          );
        fragments.forEach((f) => {
          f.style.left = `${a.x + a.width / 2}px`;
          f.style.top = `${a.y + a.height / 2}px`;
        });
      }
      frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);
    const stopTracking = () => cancelAnimationFrame(frame);
    if (!motion) {
      const timer = window.setTimeout(() => onEnd(event.id), 900);
      return () => {
        stopTracking();
        window.clearTimeout(timer);
      };
    }
    const animation = element.animate(frames.body, {
      duration: event.units ? 1700 : enhanced ? 1200 : 1900,
      easing: "ease-out",
    });
    const fragments = frames.fragments.map((keyframes, index) => {
      const fragment = document.createElement("span");
      fragment.dataset.fragment = event.id;
      fragment.className = `interaction-fragment effect-${effect.style}`;
      fragment.textContent = effect.particles;
      fragment.style.left = `${end.x}px`;
      fragment.style.top = `${end.y}px`;
      element.parentElement?.appendChild(fragment);
      fragment.animate(keyframes, {
        duration: enhanced ? 480 : 750,
        delay: (event.units ? 820 : enhanced ? 580 : 950) + (index % 4) * 45,
        easing: "ease-out",
      }).onfinish = () => fragment.remove();
      return fragment;
    });
    animation.onfinish = () => onEnd(event.id);
    return () => {
      stopTracking();
      animation.cancel();
      fragments.forEach((fragment) => {
        fragment.getAnimations().forEach((animation) => animation.cancel());
        fragment.remove();
      });
    };
  }, [event, surface, motion, enhanced, sound, onEnd]);
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
  enhanced,
  sound,
  onEnd,
}: {
  events: InteractionEvent[];
  motion: boolean;
  enhanced: boolean;
  sound: boolean;
  onEnd: (id: string) => void;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [surface, setSurface] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSurface(anchor.current?.closest<HTMLElement>(".original-game") ?? null);
  }, []);
  return (
    <>
      <span hidden ref={anchor} />
      {surface &&
        events.length > 0 &&
        createPortal(
          <div className="interaction-layer" data-motion-scope="game">
            {events.map((event) => (
              <Particle
                key={event.id}
                event={event}
                surface={surface}
                motion={motion}
                enhanced={enhanced}
                sound={sound}
                onEnd={onEnd}
              />
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
