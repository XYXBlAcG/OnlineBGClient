import { playCue } from "../notifications";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Snapshot } from "../../domain/protocol";
import { partyAppearance, type PartyEvent } from "../../domain/party";
import type { Preferences } from "../preferences";
import { useMotion } from "../use-motion";
import { useVoice } from "../voice/VoiceProvider";
import {
  eventStatus,
  partyElapsed,
  PartyClock,
  PartyPlayback,
} from "./timeline";
import type { PartyScene } from "./scene";
import "./party.css";
export type PartyPresentation = Pick<
  Snapshot,
  "actor" | "partyActor" | "seats" | "spectators" | "serverTime"
> & {
  party: Pick<Snapshot["party"], "events" | "minigames"> &
    Partial<Pick<Snapshot["party"], "enabled">>;
};
interface RuntimeProps {
  snapshot: PartyPresentation;
  preview?: boolean;
  preferences: Preferences;
  mobile: boolean;
  playback?: { time: number; playing: boolean; rate: number };
}
function VoiceStage({ preferences }: { preferences: Preferences }) {
  const { send } = useVoice(),
    initial = useRef(preferences.voice.effect),
    latest = useRef(preferences.voice.effect);
  latest.current = preferences.voice.effect;
  useEffect(() => {
    send({
      type: "effect",
      effect: { preset: "chorus", amount: 0.8, pitch: 0 },
    });
    return () => {
      if (latest.current.preset === "chorus" && latest.current.amount === 0.8)
        send({ type: "effect", effect: initial.current });
    };
  }, [send]);
  return null;
}
export function PartyRuntime(props: RuntimeProps) {
  return props.snapshot.party.enabled ||
    props.snapshot.party.events.length > 0 ? (
    <ActivePartyRuntime {...props} />
  ) : null;
}
function ActivePartyRuntime({
  snapshot,
  preferences,
  mobile,
  playback,
  preview,
}: RuntimeProps) {
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<PartyScene>(),
    foldedState = useRef(false);
  const sourceTime = playback?.time ?? 0,
    rate = playback ? (playback.playing ? playback.rate : 0) : 1;
  const [clock] = useState(
      () => new PartyClock(playback ? sourceTime : Date.now(), rate),
    ),
    previousSource = useRef(sourceTime);
  const [presentation] = useState(
    () => new PartyPlayback(!preview && !playback),
  );
  const [ready, setReady] = useState(false),
    [rendererStatus, setRendererStatus] = useState("");
  const [, tick] = useState(0),
    [failed, setFailed] = useState(false),
    [folded, setFolded] = useState(false);
  useEffect(() => {
    if (previousSource.current !== sourceTime) clock.seek(sourceTime);
    clock.setRate(rate);
    previousSource.current = sourceTime;
    tick((v) => v + 1);
  }, [sourceTime, rate, clock]);
  foldedState.current = folded;
  const motion = useMotion(true, false),
    reduced = !motion || preferences.party.quality === "text" || failed;
  const now = clock.now(),
    projection = presentation.project(
      snapshot.party.events,
      clock.now(),
      reduced || ready,
      !!playback,
      snapshot.serverTime,
    ),
    events = projection.events;
  const audible = useRef(new Set<string>());
  const active = events.filter((e) => eventStatus(e, now) === "playing"),
    queued = events.filter((e) => eventStatus(e, now) === "queued").length;
  const running =
      projection.waiting > 0 || events.some((e) => now < e.time + e.duration),
    shown = preferences.interactions && running;
  useEffect(() => {
    if (!preferences.interactionSound || !running || rate === 0) return;
    for (const event of active)
      if (!audible.current.has(event.id)) {
        audible.current.add(event.id);
        if (now - event.time < 400) playCue("interaction");
      }
  }, [active, preferences.interactionSound, running, rate, now]);
  useEffect(() => {
    if (!running || rate === 0) return;
    const timer = setInterval(() => tick((v) => v + 1), 100);
    return () => clearInterval(timer);
  }, [running, clock, rate]);
  useEffect(() => {
    if (!host.current || reduced || !preferences.interactions) return;
    let cancelled = false,
      current: PartyScene | undefined;
    void import("./scene")
      .then(async ({ PartyScene }) => {
        if (cancelled) return;
        current = new PartyScene(
          host.current!,
          preferences.party,
          mobile,
          setRendererStatus,
        );
        scene.current = current;
        await current.init();
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setRendererStatus(
            "绘图初始化失败，当前显示文字提示；请检查图形加速设置",
          );
        }
      });
    const visibility = () =>
      scene.current?.visibility(!document.hidden && !foldedState.current);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      current?.destroy();
      setReady(false);
      scene.current = undefined;
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [
    reduced,
    preferences.interactions,
    preferences.party.quality,
    preferences.party.fps,
    mobile,
  ]);
  useEffect(() => {
    scene.current?.update(
      events,
      snapshot.seats.map((s) => s.id),
      clock.now,
      clock.rate,
    );
    scene.current?.visibility(!document.hidden && !folded);
  }, [events, snapshot.seats, clock, sourceTime, rate, folded, ready]);
  if (typeof document === "undefined") return null;
  const own = [...snapshot.seats, ...(snapshot.spectators ?? [])][
    snapshot.partyActor ?? snapshot.actor
  ]?.id;
  return (
    <>
      {!playback &&
        active
          .filter((e) => e.item === "voiceStage" && e.from === own)
          .map((e) => <VoiceStage key={e.id} preferences={preferences} />)}
      {createPortal(
        <div
          className={`party-stage${preview ? " party-stage-preview" : ""}${reduced ? " party-stage-reduced" : ""}${folded ? " party-stage-folded" : ""}`}
          data-active={shown}
          data-paused={
            rate === 0 ||
            active.some((e) =>
              e.pauses?.some((p) => now >= p.at && now < p.at + p.duration),
            )
          }
          aria-label="房间派对演出"
        >
          <div ref={host} className="party-canvas" aria-hidden="true" />
          {!folded && (
            <div className="party-captions" aria-live="polite">
              {active.slice(-1).map((event) => {
                const relay =
                  event.item === "relay"
                    ? snapshot.party.minigames.find(
                        (g) =>
                          g.item === "relay" &&
                          g.owner === event.from &&
                          g.status === "open",
                      )
                    : undefined;
                const caption = relay?.lines
                  .slice(-3)
                  .map((l) => l.text)
                  .join(" · ");
                return (
                  <Caption
                    key={event.id}
                    event={caption ? { ...event, caption } : event}
                    now={now}
                    reduced={reduced}
                  />
                );
              })}
            </div>
          )}
          <div className="party-stage-control">
            {projection.waiting > 0 && (
              <small role="status">正在准备演出…</small>
            )}
            {rendererStatus && <small role="status">{rendererStatus}</small>}
            {active.length > 1 && (
              <small>
                {active
                  .slice(0, -1)
                  .map((e) => partyAppearance(e).name)
                  .join(" · ")}{" "}
                同时播放中
              </small>
            )}
            <button onClick={() => setFolded(!folded)}>
              {folded ? "显示派对" : "收起特效"}
            </button>
            {queued > 0 && <small>{queued} 场排队中</small>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
function Caption({
  event,
  now,
  reduced,
}: {
  event: PartyEvent;
  now: number;
  reduced: boolean;
}) {
  const item = partyAppearance(event),
    phase = partyElapsed(event, now) / item.duration;
  return (
    <div
      className={`party-caption party-caption-${item.pattern}${phase > 0.88 ? " party-finale" : ""}`}
      style={
        {
          "--party-color": item.color,
          opacity: Math.max(0, Math.min(1, partyElapsed(event, now) / 300)),
          transform: `translateY(${Math.max(0, 1 - partyElapsed(event, now) / 300) * 14}px)`,
        } as React.CSSProperties
      }
    >
      <strong className="party-title">
        {event.item === "sgsSlash" && !event.plugin
          ? event.caption.split("！")[0]
          : item.name}
      </strong>
      {event.caption !== item.name && (
        <p className="party-taunt">{event.caption}</p>
      )}
      {reduced && (
        <small>
          {Math.max(1, Math.ceil((event.time + event.duration - now) / 1000))}{" "}
          秒
        </small>
      )}
    </div>
  );
}
