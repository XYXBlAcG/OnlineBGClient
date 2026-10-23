import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bannerLifetime } from "../../domain/banner";
import { interactionCatalogue, type ChatMessage } from "../../domain/social";
import { useMotion } from "../use-motion";
import type { Preferences } from "../preferences";
type BannerMessage = Extract<ChatMessage, { type: "banner" }>;
type QueuedBanner = BannerMessage & { receivedAt: number };
export function BannerLayer({
  messages,
  room,
  preferences,
  serverTime,
  inline = false,
}: {
  messages: ChatMessage[];
  room: string;
  preferences: Preferences;
  serverTime?: number;
  inline?: boolean;
}) {
  const [queue, setQueue] = useState<QueuedBanner[]>([]),
    [, tick] = useState(0);
  const seen = useRef(0);
  const motion = useMotion(preferences.enhancedGameMotion);
  const clock = useMemo(
    () => ({ server: serverTime ?? Date.now(), received: Date.now() }),
    [serverTime],
  );
  const now = clock.server + Date.now() - clock.received;
  useEffect(() => {
    seen.current = 0;
    setQueue([]);
  }, [room]);
  useEffect(() => {
    const fresh = messages.filter((message) => message.sequence > seen.current);
    const clear =
      [...fresh].reverse().find((message) => message.type === "clear")
        ?.sequence ?? 0;
    const incoming = fresh.filter(
      (message): message is BannerMessage =>
        message.type === "banner" &&
        message.sequence > clear &&
        now - message.time < bannerLifetime(message.banner) &&
        message.time <= now + 1000,
    );
    seen.current = messages.at(-1)?.sequence ?? seen.current;
    if (!preferences.bannerDisplay || document.hidden) {
      setQueue([]);
      return;
    }
    if (incoming.length || clear)
      setQueue((current) =>
        [
          ...current.filter((message) => message.sequence > clear),
          ...incoming.map((message) => ({
            ...message,
            receivedAt: Date.now(),
          })),
        ].slice(0, 3),
      );
  }, [messages, preferences.bannerDisplay, room, serverTime]);
  const current = queue[0];
  const started = useMemo(() => Date.now(), [current?.sequence, room]);
  const duration = current ? bannerLifetime(current.banner) : 0;
  const deadline =
    current?.banner.kind === "countdown" || current?.banner.kind === "combo"
      ? current.time + duration - clock.server + clock.received
      : current
        ? started + duration
        : 0;
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(
      () =>
        setQueue((queue) =>
          queue.slice(1).filter((item) => Date.now() - item.receivedAt < 12000),
        ),
      Math.max(0, deadline - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [current, deadline]);
  useEffect(() => {
    if (
      current?.banner.kind !== "countdown" &&
      current?.banner.kind !== "combo"
    )
      return;
    const timer = setInterval(() => tick((value) => value + 1), 100);
    return () => clearInterval(timer);
  }, [current]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setQueue([]);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  if (!preferences.bannerDisplay || !current) return null;
  const banner = current.banner;
  const comboIndex =
    banner.kind === "combo"
      ? Math.min(
          banner.effects.length - 1,
          Math.max(0, Math.floor((now - current.time) / 1100)),
        )
      : 0;
  const effect =
    banner.kind === "effect"
      ? interactionCatalogue[banner.effect]
      : banner.kind === "combo"
        ? interactionCatalogue[banner.effects[comboIndex]]
        : null;
  const count =
    banner.kind === "countdown"
      ? Math.max(
          0,
          Math.ceil((current.time + banner.seconds * 1000 - now) / 1000),
        )
      : null;
  const layer = (
    <div
      key={`${room}:${current.sequence}`}
      className={`social-banner banner-${banner.kind} ${motion ? "banner-animated" : ""}`}
      data-motion-scope="game"
      data-style={effect?.style}
      data-preset={"style" in banner ? (banner.style ?? "gold") : "gold"}
      style={{ animationDuration: `${duration}ms` }}
      aria-live="polite"
      role="status"
    >
      {effect ? (
        <>
          <div key={comboIndex} className="banner-effect-main">
            {effect.emoji}
          </div>
          <div
            key={`particles:${comboIndex}`}
            className="banner-effect-particles"
            aria-hidden="true"
          >
            {Array.from({ length: 12 }, (_, index) => (
              <span
                key={index}
                style={{ "--particle-index": index } as React.CSSProperties}
              >
                {index % 3 === 0 ? effect.emoji : effect.particles}
              </span>
            ))}
          </div>
        </>
      ) : banner.kind === "countdown" ? (
        <>
          <strong key={count} className="banner-count">
            {count || "开始！"}
          </strong>
          <span className="banner-caption">{banner.text}</span>
        </>
      ) : (
        <>
          <strong
            data-length={Array.from(banner.text).length > 16 ? "long" : "short"}
          >
            {banner.text}
          </strong>
          {banner.kind === "announce" && (
            <span className="banner-caption">房间公告</span>
          )}
        </>
      )}
      <small>
        {current.name}
        {effect ? ` · ${effect.name}` : ""}
      </small>
    </div>
  );
  return inline ? layer : createPortal(layer, document.body);
}
