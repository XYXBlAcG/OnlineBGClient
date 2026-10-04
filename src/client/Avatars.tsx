import * as Popover from "@radix-ui/react-popover";
import type { Snapshot } from "../domain/protocol";
import { interactionKinds, type InteractionKind } from "../domain/social";

export function Avatars({
  snapshot,
  onInteract,
}: {
  snapshot: Snapshot;
  onInteract: (target: number, kind: InteractionKind) => void;
}) {
  return (
    <div className="room-avatars">
      {snapshot.seats.map((seat, index) => (
        <Popover.Root key={seat.id}>
          <Popover.Trigger asChild>
            <button
              className={`player-avatar ${seat.online ? "" : "offline"}`}
              data-avatar-index={index}
              aria-label={`与${seat.name || "空位"}互动`}
              disabled={!seat.name}
            >
              <span className="avatar-face">
                {seat.difficulty ? "🤖" : "😊"}
              </span>
              <span>
                {seat.name || "空位"}
                {index === snapshot.actor ? " · 我" : ""}
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="ui-popover interaction-menu"
              sideOffset={6}
              collisionPadding={8}
            >
              <strong>{seat.name}</strong>
              <div>
                {Object.entries(interactionKinds).map(([kind, emoji]) => (
                  <Popover.Close asChild key={kind}>
                    <button
                      aria-label={`送出${{ egg: "鸡蛋", slipper: "拖鞋", flower: "鲜花", like: "点赞" }[kind as InteractionKind]}`}
                      onClick={() => onInteract(index, kind as InteractionKind)}
                    >
                      {emoji}
                    </button>
                  </Popover.Close>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ))}
    </div>
  );
}
