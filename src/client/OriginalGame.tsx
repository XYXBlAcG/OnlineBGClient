import { SichuanTable } from "./mahjong/SichuanTable";
import type { MotionPreferences } from "./MotionControls";
import { GameMotionLayer } from "./GameMotionLayer";
import { usePresentation } from "./motion";
import { seatAvatar } from "../domain/avatar";
import { GameFeedback } from "./GameFeedback";
import { catanIntent } from "../domain/catan-intent";
import { MapViewport } from "./MapViewport";
import { AvatarSurface } from "./AvatarSurface";
import { Interactions } from "./Interactions";
import type { InteractionEvent } from "../domain/social";
import { HeroSurface } from "./HeroSurface";
import { CardSurface } from "./CardSurface";
import { gameCatalogue } from "../domain/catalogue";
import { memo, useEffect, useMemo, useRef } from "react";
import { UpstreamRuntime } from "../upstream/runtime";
import type { Action } from "../domain/types";
import type { Snapshot } from "../domain/protocol";

export type GameSnapshot = Pick<
  Snapshot,
  | "room"
  | "kind"
  | "actor"
  | "canManage"
  | "version"
  | "seats"
  | "state"
  | "finished"
>;
export const OriginalGame = memo(function OriginalGame({
  snapshot,
  act,
  end,
  onAutoplay,
  onReplay,
  restart,
  onInteract,
  onPhrase,
  onAvatar,
  motionPreferences,
  onMotion,
  customPhrases,
  replay = false,
  interactions = [],
  animationActive = true,
  animationRate = 1,
  sound = false,
  onInteractionEnd,
}: {
  customPhrases?: import("../domain/phrases").PhraseGroup[];
  replay?: boolean;
  motionPreferences?: MotionPreferences;
  onMotion?: (preferences: MotionPreferences) => void;
  onAvatar?: (avatar: string) => void;
  onPhrase?: (text: string) => void;
  interactions?: InteractionEvent[];
  animationActive?: boolean;
  animationRate?: number;
  sound?: boolean;
  onInteractionEnd?: (id: string) => void;
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  end: () => void;
  onAutoplay?: (enabled: boolean) => void;
  onReplay?: () => void;
  restart?: () => void;
  onInteract?: (
    target: number,
    kind: import("../domain/social").InteractionKind,
  ) => void;
}) {
  const { game: gameMotion } = usePresentation();
  const surface = useRef<HTMLDivElement>(null);
  const runtime = useMemo(() => new UpstreamRuntime(), []);
  runtime.bridge.readOnly = replay;
  runtime.bridge.skipLegacyMotion =
    gameMotion !== "baseline" || !animationActive;
  runtime.bridge.svgAnimations = (tag) =>
    surface.current?.querySelectorAll<SVGAnimationElement>(tag) || [];
  runtime.bridge.animateSvg = (element) => {
    const mode = gameMotion;
    const animated = animationActive && mode === "baseline";
    const duration =
      mode === "baseline"
        ? parseFloat(element.getAttribute("data-game-duration") || "0.3")
        : 0.24;
    element.setAttribute(
      "dur",
      `${animated ? duration / Math.max(0.25, Math.min(4, animationRate)) : 0.001}s`,
    );
    element.beginElement();
    if (!animated) element.endElement();
  };
  if (snapshot.kind === "ktd")
    runtime.bridge.catanIntent = (previous, next, actor) =>
      catanIntent(previous, next, actor, runtime.load(6634).K8);
  const previousPlayback = useRef({
    gameMotion,
    animationActive,
    animationRate,
  });
  useEffect(() => {
    const previous = previousPlayback.current;
    if (
      previous.gameMotion !== gameMotion ||
      previous.animationActive !== animationActive ||
      previous.animationRate !== animationRate
    ) {
      surface.current
        ?.querySelectorAll<SVGAnimationElement>("animate,animateTransform")
        .forEach((element) => element.endElement());
    }
    previousPlayback.current = { gameMotion, animationActive, animationRate };
  }, [gameMotion, animationActive, animationRate, snapshot.kind]);
  runtime.bridge.feedback = GameFeedback;
  runtime.bridge.mapViewport = MapViewport;
  runtime.bridge.heroCard = HeroSurface;
  runtime.bridge.trickCard = CardSurface;
  runtime.bridge.avatar = AvatarSurface;
  const avatarContext = {
    snapshot,
    replay,
    onPhrase,
    onAvatar,
    motionPreferences,
    onMotion,
    customPhrases,
    onInteract: replay ? undefined : onInteract,
  };
  runtime.bridge.avatarContext = avatarContext;
  runtime.bridge.sink = (action) => {
    if (replay) return;
    if ((action as { type: string }).type === "round-restart") restart?.();
    else if (!snapshot.finished) act(action as Action);
  };
  useEffect(
    () => () => {
      runtime.bridge.svgAnimations = undefined;
      runtime.bridge.animateSvg = undefined;
      runtime.bridge.mapViewport = undefined;
      runtime.bridge.heroCard = undefined;
      runtime.bridge.trickCard = undefined;
      runtime.bridge.avatar = undefined;
      runtime.bridge.avatarContext = undefined;
      runtime.bridge.sink = undefined;
    },
    [runtime],
  );
  const presentation = gameCatalogue[snapshot.kind].presentation;
  const Game =
    presentation.kind === "upstream"
      ? runtime.load(presentation.module).default
      : null;
  const events = runtime.load(5982).Z;
  const room = {
    position: snapshot.actor + 1,
    owner: replay ? 0 : snapshot.canManage ? snapshot.actor + 1 : 1,
    playerList: snapshot.seats.map((seat) => ({
      name: seat.name,
      emoji: seatAvatar(seat),
      source: 0,
      imgUrl: "",
      offline: !seat.online,
      offlineTime: Date.now(),
      state: 0,
      stateTime: 0,
    })),
  };
  return (
    <div
      ref={surface}
      className="original-game"
      data-motion-scope="game"
      data-game-motion={animationActive ? gameMotion : "reduced"}
      data-game={snapshot.kind}
      data-game-version={snapshot.version}
      onKeyDown={(event) => {
        if (
          !["ArrowLeft", "ArrowRight"].includes(event.key) ||
          !(event.target instanceof HTMLElement) ||
          event.target.closest("input,textarea,select,[contenteditable=true]")
        )
          return;
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled),[role=button][tabindex="0"]',
          ),
        ].filter((element) => element.getClientRects().length);
        const index = controls.indexOf(event.target);
        if (index < 0) return;
        const next =
          controls[
            (index + (event.key === "ArrowRight" ? 1 : controls.length - 1)) %
              controls.length
          ];
        if (next) {
          event.preventDefault();
          next.focus();
        }
      }}
    >
      {presentation.kind === "sichuan" ? (
        <SichuanTable
          snapshot={snapshot}
          act={act}
          end={end}
          replay={replay}
          onAutoplay={onAutoplay}
          avatar={avatarContext}
        />
      ) : (
        <Game
          key={`${snapshot.kind}:${snapshot.actor}`}
          onReplay={onReplay}
          view={structuredClone(snapshot.state!.view)}
          room={room}
          game={{ version: snapshot.version, data: new Uint8Array() }}
          send={(event: number) => {
            if (!replay && event === events.OwnerExitGame) end();
          }}
        />
      )}
      <GameMotionLayer
        snapshot={snapshot}
        active={animationActive}
        rate={animationRate}
      />
      {!replay && onInteractionEnd && (
        <Interactions
          events={interactions}
          motion={gameMotion !== "reduced"}
          enhanced={gameMotion === "enhanced"}
          sound={sound}
          onEnd={onInteractionEnd}
        />
      )}
    </div>
  );
});
