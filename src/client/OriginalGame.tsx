import { catanIntent } from "../domain/catan-intent";
import { GameSurfaceSizes } from "./SurfaceResize";
import { MapViewport } from "./MapViewport";
import { AvatarSurface } from "./AvatarSurface";
import { Interactions } from "./Interactions";
import type { InteractionEvent } from "../domain/social";
import { HeroSurface } from "./HeroSurface";
import { CardSurface } from "./CardSurface";
import { gameCatalogue } from "../domain/catalogue";
import { memo, useEffect, useMemo } from "react";
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
  onReplay,
  restart,
  onInteract,
  onPhrase,
  customPhrases,
  replay = false,
  interactions = [],
  motion = true,
  sound = false,
  onInteractionEnd,
}: {
  customPhrases?: import("../domain/phrases").PhraseGroup[];
  replay?: boolean;
  onPhrase?: (text: string) => void;
  interactions?: InteractionEvent[];
  motion?: boolean;
  sound?: boolean;
  onInteractionEnd?: (id: string) => void;
  snapshot: GameSnapshot;
  act: (action: Action) => void;
  end: () => void;
  onReplay?: () => void;
  restart?: () => void;
  onInteract?: (
    target: number,
    kind: import("../domain/social").InteractionKind,
  ) => void;
}) {
  const runtime = useMemo(() => new UpstreamRuntime(), []);
  runtime.bridge.readOnly = replay;
  if (snapshot.kind === "ktd")
    runtime.bridge.catanIntent = (previous, next, actor) =>
      catanIntent(previous, next, actor, runtime.load(6634).K8);
  runtime.bridge.mapViewport = MapViewport;
  runtime.bridge.heroCard = HeroSurface;
  runtime.bridge.trickCard = CardSurface;
  runtime.bridge.avatar = AvatarSurface;
  runtime.bridge.avatarContext = {
    snapshot,
    replay,
    onPhrase,
    customPhrases,
    onInteract: replay ? undefined : onInteract,
  };
  runtime.bridge.sink = (action) => {
    if (replay) return;
    if ((action as { type: string }).type === "round-restart") restart?.();
    else if (!snapshot.finished) act(action as Action);
  };
  useEffect(
    () => () => {
      runtime.bridge.mapViewport = undefined;
      runtime.bridge.heroCard = undefined;
      runtime.bridge.trickCard = undefined;
      runtime.bridge.avatar = undefined;
      runtime.bridge.avatarContext = undefined;
      runtime.bridge.sink = undefined;
    },
    [runtime],
  );
  const Game = runtime.load(gameCatalogue[snapshot.kind].module).default;
  const events = runtime.load(5982).Z;
  const room = {
    position: snapshot.actor + 1,
    owner: replay ? 0 : snapshot.canManage ? snapshot.actor + 1 : 1,
    playerList: snapshot.seats.map((seat) => ({
      name: seat.name,
      emoji: seat.difficulty ? "🤖" : "😊",
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
      className="original-game"
      data-game={snapshot.kind}
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
      <GameSurfaceSizes kind={snapshot.kind} />
      {!replay && onInteractionEnd && (
        <Interactions
          events={interactions}
          motion={motion}
          sound={sound}
          onEnd={onInteractionEnd}
        />
      )}
    </div>
  );
});
