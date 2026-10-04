import { HeroSurface } from "./HeroSurface";
import { gameCatalogue } from "../domain/catalogue";
import { useEffect, useMemo } from "react";
import { UpstreamRuntime } from "../upstream/runtime";
import type { Action } from "../domain/types";
import type { Snapshot } from "../domain/protocol";

export function OriginalGame({
  snapshot,
  act,
  end,
  onReplay,
  restart,
  onInteract,
}: {
  snapshot: Snapshot;
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
  runtime.bridge.heroCard = HeroSurface;
  runtime.bridge.interact = onInteract;
  runtime.bridge.sink = (action) => {
    if ((action as { type: string }).type === "round-restart") restart?.();
    else if (!snapshot.finished) act(action as Action);
  };
  useEffect(
    () => () => {
      runtime.bridge.heroCard = undefined;
      runtime.bridge.interact = undefined;
      runtime.bridge.sink = undefined;
    },
    [runtime],
  );
  const Game = runtime.load(gameCatalogue[snapshot.kind].module).default;
  const events = runtime.load(5982).Z;
  const room = {
    position: snapshot.actor + 1,
    owner: 1,
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
        onReplay={onReplay}
        view={structuredClone(snapshot.state!.view)}
        room={room}
        game={{ version: snapshot.version, data: new Uint8Array() }}
        send={(event: number) => {
          if (event === events.OwnerExitGame) end();
        }}
      />
    </div>
  );
}
