import { effectAnchorRect } from "./effect-anchor";
import { effectTexture } from "./art";
import { Emoji, emojiUrl } from "./Emoji";
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
  const endCallback = useRef(onEnd);
  endCallback.current = onEnd;
  useEffect(() => {
    const element = ref.current;
    const bounds = surface?.getBoundingClientRect();
    const sourceSelector = event.units
      ? `[data-game-unit="${event.units.from}"]`
      : `[data-game-avatar="${event.from}"]`;
    const targetSelector = event.units
      ? `[data-game-unit="${event.units.target}"]`
      : `[data-game-avatar="${event.target}"]`;
    const origin = effectAnchorRect(surface, sourceSelector),
      destination = effectAnchorRect(surface, targetSelector);
    if (!element || !destination || !bounds) {
      endCallback.current(event.id);
      return;
    }
    const clip = effectClip(bounds, window.innerWidth, window.innerHeight);
    element.parentElement!.style.clipPath = `inset(${clip.top}px ${clip.right}px ${clip.bottom}px ${clip.left}px)`;
    if (sound) playCue("interaction");
    const end = destination.point,
      start = motion && origin ? origin.point : end;
    element.style.left = `${start.x}px`;
    element.style.top = `${start.y}px`;
    element.style.visibility = "visible";
    const effect = interactionCatalogue[event.kind];
    const frames = effectMotion(
      effect.style,
      end.x - start.x,
      end.y - start.y,
      enhanced ? 16 : 10,
      event.units ? (enhanced ? 1.8 : 1.4) : 1,
      enhanced,
    );
    element.style.setProperty("--effect-color", effect.color);
    const fragments: HTMLSpanElement[] = [];
    let frame = 0,
      positionKey = "";
    const track = () => {
      const target = effectAnchorRect(surface, targetSelector),
        source = effectAnchorRect(surface, sourceSelector);
      if (!target) {
        element.style.visibility = "hidden";
        endCallback.current(event.id);
        return;
      }
      const current = surface.getBoundingClientRect(),
        a = target.point,
        b = motion && source ? source.point : a;
      const clip = effectClip(current, window.innerWidth, window.innerHeight);
      element.parentElement!.style.clipPath = `inset(${clip.top}px ${clip.right}px ${clip.bottom}px ${clip.left}px)`;
      element.style.left = `${b.x}px`;
      element.style.top = `${b.y}px`;
      const key = [a.x, a.y, b.x, b.y].map((n) => Math.round(n)).join(":");
      if (motion && key !== positionKey) {
        positionKey = key;
        const nextFrames = effectMotion(
          effect.style,
          a.x - b.x,
          a.y - b.y,
          enhanced ? 16 : 10,
          event.units ? (enhanced ? 1.8 : 1.4) : 1,
          enhanced,
          frames,
        );
        const animationEffect = element.getAnimations()[0]?.effect;
        if (animationEffect)
          (animationEffect as KeyframeEffect).setKeyframes(nextFrames.body);
        fragments.forEach((f) => {
          f.style.left = `${a.x}px`;
          f.style.top = `${a.y}px`;
        });
      }
      frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);
    const stopTracking = () => cancelAnimationFrame(frame);
    if (!motion) {
      element.style.opacity = "1";
      const timer = window.setTimeout(() => {
        element.style.visibility = "hidden";
        endCallback.current(event.id);
      }, 900);
      return () => {
        stopTracking();
        window.clearTimeout(timer);
      };
    }
    const animation = element.animate(frames.body, {
      duration: frames.duration,
      easing: enhanced ? "linear" : "ease-out",
      fill: "both",
    });
    frames.fragments.forEach((keyframes, index) => {
      const fragment = document.createElement("span");
      fragment.dataset.fragment = event.id;
      fragment.className = `interaction-fragment effect-${effect.style}`;
      const icon = emojiUrl(effect.particles);
      if (enhanced && index % 2 === 0) {
        fragment.className += " interaction-texture";
        fragment.style.maskImage = `url(${effectTexture(effect.style)})`;
        fragment.style.backgroundColor = effect.color;
      } else if (icon) {
        const image = document.createElement("img");
        image.className = "shared-emoji";
        image.src = icon;
        image.alt = effect.particles;
        image.onerror = () => {
          fragment.textContent = effect.particles;
        };
        fragment.append(image);
      } else fragment.textContent = effect.particles;
      fragment.style.left = `${end.x}px`;
      fragment.style.top = `${end.y}px`;
      element.parentElement?.appendChild(fragment);
      fragment.animate(keyframes, {
        duration: frames.fragmentDuration,
        delay: frames.impactAt + (index % 4) * 24,
        easing: "ease-out",
        fill: "both",
      }).onfinish = () => fragment.remove();
      fragments.push(fragment);
    });
    animation.onfinish = () => {
      element.style.visibility = "hidden";
    };
    const finished = window.setTimeout(
      () => endCallback.current(event.id),
      Math.max(frames.duration, frames.impactAt + frames.fragmentDuration + 72),
    );
    return () => {
      stopTracking();
      element.style.visibility = "hidden";
      window.clearTimeout(finished);
      animation.cancel();
      fragments.forEach((fragment) => {
        fragment.getAnimations().forEach((animation) => animation.cancel());
        fragment.remove();
      });
    };
  }, [event.id, surface, motion, enhanced, sound]);
  return (
    <div
      ref={ref}
      style={{ opacity: 0 }}
      className="interaction-particle"
      data-interaction={event.id}
      data-effect={event.kind}
      data-effect-style={interactionCatalogue[event.kind].style}
      aria-hidden="true"
    >
      <Emoji text={interactionCatalogue[event.kind].emoji} />
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
  useEffect(() => {
    events.slice(0, -6).forEach((event) => onEnd(event.id));
  }, [events, onEnd]);
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
            {events.slice(-6).map((event) => (
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
