import { useGameScale } from "./game-sizing/GameSizing";
import { ExpeditionTable } from "./expedition/ExpeditionTable";
import { DominionTable } from "./dominion/DominionTable";
import { GraphwarTable } from "./graphwar/GraphwarTable";
import { SichuanTable } from "./mahjong/SichuanTable";
import { PoolGame } from "./pool/PoolGame";
import type { PoolRenderer } from "./pool/renderer";
import { FlightSpecialPanel } from "./flight/FlightSpecialPanel";
import { FlightMapViewport } from "./flight/FlightMapViewport";
import { FlightOverlayProvider } from "./flight/FlightWeatherContext";
import { CheckersSpecialPanel } from "./checkers/CheckersSpecialPanel";
import { UnoTeamPanel } from "./uno/UnoTeamPanel";
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
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { UpstreamRuntime } from "../upstream/runtime";
import { ErrorBoundary } from "./ui/ErrorBoundary";
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
> &
  Partial<
    Pick<Snapshot, "turnDeadline" | "serverTime" | "paused" | "candidates">
  >;
export const OriginalGame = memo(function OriginalGame({
  snapshot,
  pending = false,
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
  poolRenderer = "auto",
  onPoolRendererChange,
  poolSound = true,
  soundVolume = 0.5,
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
  poolRenderer?: PoolRenderer;
  onPoolRendererChange?: (renderer: PoolRenderer) => void;
  poolSound?: boolean;
  soundVolume?: number;
  snapshot: GameSnapshot;
  pending?: boolean;
  act: (action: Action) => void;
  end: () => void;
  onAutoplay?: (enabled: boolean, index?: number) => void;
  onReplay?: () => void;
  restart?: () => void;
  onInteract?: (
    target: number,
    kind: import("../domain/social").FreeInteractionKind,
    units?: import("../domain/social").InteractionUnits,
  ) => void;
}) {
  replay ||= snapshot.actor < 0;
  const { game: gameMotion } = usePresentation();
  const surface = useRef<HTMLDivElement>(null);
  const [flightPlayersCollapsed, setFlightPlayersCollapsed] = useState(false);
  const elementScale = useGameScale(surface, snapshot.kind);
  useEffect(() => {
    setFlightPlayersCollapsed(false);
  }, [snapshot.kind, snapshot.room]);
  useEffect(() => {
    if (typeof document === "undefined" || !document.addEventListener) return;
    const reveal = (event: Event) => {
      const target = (event as CustomEvent<string>).detail;
      if (target === "fxq.players" || target === "fxq.turn")
        setFlightPlayersCollapsed(false);
    };
    document.addEventListener("room-reveal", reveal);
    return () => document.removeEventListener("room-reveal", reveal);
  }, []);
  const runtime = useMemo(() => new UpstreamRuntime(), []);
  const view = useMemo(
    () =>
      snapshot.state &&
      gameCatalogue[snapshot.kind].presentation.kind === "upstream"
        ? structuredClone(snapshot.state.view)
        : null,
    [snapshot.kind, snapshot.state],
  );
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
  runtime.bridge.mapViewport =
    snapshot.kind === "fxq" ? FlightMapViewport : MapViewport;
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
  const presentation = gameCatalogue[snapshot.kind].presentation;
  const flightOverlay =
    snapshot.kind === "fxq" && snapshot.state?.kind === "fxq"
      ? {
          view: snapshot.state.view,
          actor: snapshot.actor,
          candidates: snapshot.candidates ?? [],
        }
      : null;
  const Game =
    presentation.kind === "upstream"
      ? runtime.load(presentation.module).default
      : null;
  const events = runtime.load(5982).Z;
  const room = {
    position: Math.max(0, snapshot.actor + 1),
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
  const game = Game ? (
    <Game
      key={`${snapshot.kind}:${snapshot.actor}`}
      onReplay={onReplay}
      view={view}
      room={room}
      game={{ version: snapshot.version, data: new Uint8Array() }}
      send={(event: number) => {
        if (!replay && event === events.OwnerExitGame) end();
      }}
    />
  ) : null;
  return (
    <div
      ref={surface}
      className="original-game"
      style={{ zoom: elementScale }}
      data-element-scale={elementScale}
      data-motion-scope="game"
      data-game-motion={animationActive ? gameMotion : "reduced"}
      data-game={snapshot.kind}
      data-flight-players={
        snapshot.kind === "fxq"
          ? flightPlayersCollapsed
            ? "collapsed"
            : "expanded"
          : undefined
      }
      data-renderer={presentation.kind === "upstream" ? "upstream" : "client"}
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
      <ErrorBoundary
        key={`${snapshot.room}:${snapshot.kind}:${snapshot.actor}`}
        scope="game"
      >
        {presentation.kind === "expedition" &&
        snapshot.state?.kind === "expedition" ? (
          <ExpeditionTable
            onAutoplay={onAutoplay}
            snapshot={snapshot}
            act={act}
            replay={replay}
            avatar={avatarContext}
            pending={pending}
          />
        ) : presentation.kind === "dominion" &&
          snapshot.state?.kind === "dominion" ? (
          <DominionTable
            snapshot={snapshot}
            act={act}
            replay={replay}
            avatar={avatarContext}
            pending={pending}
          />
        ) : presentation.kind === "graphwar" &&
          snapshot.state?.kind === "graphwar" ? (
          <GraphwarTable
            view={snapshot.state.view}
            snapshot={snapshot}
            act={act}
            replay={replay}
            avatar={avatarContext}
            pending={pending}
            animationActive={animationActive}
            animationRate={animationRate}
          />
        ) : presentation.kind === "sichuan" ? (
          <SichuanTable
            snapshot={snapshot}
            act={act}
            replay={replay}
            onAutoplay={onAutoplay}
            avatar={avatarContext}
          />
        ) : presentation.kind === "pool" && snapshot.state?.kind === "pool" ? (
          <PoolGame
            view={snapshot.state.view}
            actor={snapshot.actor}
            act={act}
            replay={replay}
            pending={pending}
            turnDeadline={snapshot.turnDeadline}
            serverTime={snapshot.serverTime}
            paused={snapshot.paused}
            renderer={poolRenderer}
            onRendererChange={onPoolRendererChange}
            soundEnabled={poolSound}
            soundVolume={soundVolume}
          />
        ) : Game ? (
          <>
            {snapshot.kind === "fxq" && snapshot.state?.kind === "fxq" && (
              <FlightSpecialPanel
                view={snapshot.state.view}
                snapshot={snapshot}
                act={act}
                replay={replay}
                playersCollapsed={flightPlayersCollapsed}
                onTogglePlayers={() =>
                  setFlightPlayersCollapsed((value) => !value)
                }
              />
            )}
            {snapshot.kind === "tq" && snapshot.state?.kind === "tq" && (
              <CheckersSpecialPanel view={snapshot.state.view} />
            )}
            {snapshot.kind === "uno" && snapshot.state?.kind === "uno" && (
              <UnoTeamPanel view={snapshot.state.view} snapshot={snapshot} />
            )}
            {game && flightOverlay ? (
              <FlightOverlayProvider value={flightOverlay}>
                {game}
              </FlightOverlayProvider>
            ) : (
              game
            )}
          </>
        ) : null}
        <GameMotionLayer
          snapshot={snapshot}
          active={animationActive}
          rate={animationRate}
        />
        {!replay && onInteractionEnd && (
          <Interactions
            key={`${snapshot.room}:${snapshot.kind}`}
            events={interactions}
            motion={gameMotion !== "reduced"}
            enhanced={gameMotion === "enhanced"}
            sound={sound}
            onEnd={onInteractionEnd}
          />
        )}
      </ErrorBoundary>
    </div>
  );
});
